import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import {
  ensureSsoLaunchUrlConfigured,
  getAppKitApplicationId,
} from '@/lib/appkit-server';
import {
  BoundarySessionTokens,
  BoundarySessionUser,
  extractBoundaryTokens,
  extractBoundaryUser,
  getBoundaryBackendUrl,
  getBoundarySsoLaunchUrl,
  normalizeBoundaryUser,
} from '@/lib/boundary-sso';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SESSION_TTL = 7 * 24 * 3600;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function friendlyErrorResponse(options: {
  title?: string;
  message: string;
  status?: number;
}) {
  const title = options.title || 'SSO launch unavailable';
  const status = options.status || 400;
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} - Narinyland</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #171717;
        --muted: rgba(23, 23, 23, 0.62);
        --line: rgba(23, 23, 23, 0.12);
        --paper: #fffafc;
        --accent: #db2777;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          linear-gradient(135deg, rgba(253, 242, 248, 0.94), rgba(255, 247, 237, 0.9)),
          #fdf2f8;
        color: var(--ink);
      }

      main {
        width: min(100%, 440px);
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 32px;
        box-shadow: 0 24px 70px rgba(219, 39, 119, 0.12);
      }

      .mark {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: rgba(219, 39, 119, 0.1);
        color: var(--accent);
        font-weight: 800;
        margin-bottom: 18px;
      }

      h1 {
        margin: 0 0 10px;
        font-size: 24px;
        line-height: 1.15;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.55;
      }

      .actions {
        display: flex;
        gap: 10px;
        margin-top: 24px;
      }

      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 6px;
        background: var(--ink);
        color: white;
        text-decoration: none;
        font-weight: 700;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">!</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(options.message)}</p>
      <div class="actions">
        <a href="/">Return to Narinyland</a>
      </div>
    </main>
  </body>
</html>`;

  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function exchangeBoundaryCode(code: string, applicationId: string) {
  const backendUrl = getBoundaryBackendUrl();
  const exchange = () => fetch(`${backendUrl}/auth/sso/exchange`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, applicationId }),
    cache: 'no-store',
  });

  let response = await exchange();
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    response = await exchange();
  }

  const data = await response.json().catch(() => null);
  return { response, data };
}

async function cacheLocalSession(user: BoundarySessionUser) {
  await redis.setex(`user_session:${user.sub}`, SESSION_TTL, JSON.stringify(user));
}

function applySessionCookies(
  response: NextResponse,
  user: BoundarySessionUser,
  tokens: BoundarySessionTokens
) {
  const secure = process.env.NODE_ENV === 'production';

  if (tokens.accessToken) {
    response.cookies.set('appkit_access_token', tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: tokens.expiresIn || 3600,
      path: '/',
    });
  } else {
    response.cookies.set('appkit_access_token', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  }

  if (tokens.refreshToken) {
    response.cookies.set('appkit_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600,
      path: '/',
    });
  } else {
    response.cookies.set('appkit_refresh_token', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  }

  response.cookies.set('narinyland_sub', user.sub, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: SESSION_TTL,
    path: '/',
  });

  response.cookies.set('narinyland_is_auth', 'true', {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    maxAge: SESSION_TTL,
    path: '/',
  });
}

export async function GET(req: NextRequest) {
  const launchUrl = getBoundarySsoLaunchUrl(req);
  await ensureSsoLaunchUrlConfigured(launchUrl).catch((err) => {
    console.warn('Boundary launch URL sync failed:', err);
  });

  const code = req.nextUrl.searchParams.get('code')?.trim();
  if (!code) {
    return friendlyErrorResponse({
      title: 'Launch link needs a fresh code',
      message: 'Please open Narinyland again from Boundary Overview > Applications so we can create a new sign-in session.',
      status: 400,
    });
  }

  const applicationId = getAppKitApplicationId();
  if (!applicationId) {
    return friendlyErrorResponse({
      title: 'Sign-in is not configured',
      message: 'Narinyland is missing its AppKit application id. Please check the deployment configuration and try again.',
      status: 500,
    });
  }

  try {
    const { response, data } = await exchangeBoundaryCode(code, applicationId);
    if (!response.ok) {
      console.warn('Boundary SSO exchange rejected:', { status: response.status, data });
      return friendlyErrorResponse({
        title: 'Launch link expired',
        message: 'This Boundary launch link is invalid, expired, or was already used. Please start again from Boundary Overview > Applications.',
        status: response.status === 404 ? 400 : response.status,
      });
    }

    const user = normalizeBoundaryUser(extractBoundaryUser(data));
    if (!user) {
      console.error('Boundary SSO exchange did not include a usable user object:', data);
      return friendlyErrorResponse({
        title: 'Could not finish sign-in',
        message: 'Boundary accepted the launch code, but did not return the user profile Narinyland needs to create a session.',
        status: 502,
      });
    }

    await cacheLocalSession(user);

    const redirectResponse = NextResponse.redirect(new URL('/garden', req.url), { status: 302 });
    applySessionCookies(redirectResponse, user, extractBoundaryTokens(data));
    return redirectResponse;
  } catch (err) {
    console.error('Boundary SSO launch failed:', err);
    return friendlyErrorResponse({
      title: 'Boundary sign-in is unavailable',
      message: 'We could not verify this launch link right now. Please try opening Narinyland from Boundary again in a moment.',
      status: 502,
    });
  }
}
