import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rejectCrossOrigin } from '@/lib/security';
import { debugLog, debugWarn } from '@/lib/logger';
import { validateAppKitAccessToken } from '@/lib/auth-server';
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/session-store';

const TOKEN_FETCH_TIMEOUT_MS = 8_000;
const ALLOWED_TOKEN_FIELDS = new Set([
  'grant_type',
  'code',
  'redirect_uri',
  'client_id',
  'code_verifier',
  'refresh_token',
  'scope',
]);

function appKitDomain() {
  return (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app')
    .trim()
    .replace(/\/+$/, '');
}

async function tokenRequest(body: Record<string, unknown>, clientSecret: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_TOKEN_FIELDS.has(key) && value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  params.set('client_secret', clientSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${appKitDomain()}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  const csrfRejection = rejectCrossOrigin(req);
  if (csrfRejection) return csrfRejection;

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

    const clientSecret = (process.env.APPKIT_CLIENT_SECRET || '').trim();
    if (!clientSecret) {
      console.error('APPKIT_CLIENT_SECRET is missing on the server');
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    let response = await tokenRequest(body, clientSecret);
    if ([502, 503, 504].includes(response.status)) {
      debugWarn(`BFF: AppKit returned ${response.status}; retrying token exchange once.`);
      await new Promise((resolve) => setTimeout(resolve, 800));
      response = await tokenRequest(body, clientSecret);
    }

    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
    if (!accessToken) {
      return NextResponse.json({ error: 'invalid_token_response' }, { status: 502 });
    }

    // Critical boundary: AppKit itself validates the token and supplies identity.
    // Narinyland never authorizes from decoded-but-unverified JWT claims.
    const user = await validateAppKitAccessToken(accessToken);
    if (!user) {
      return NextResponse.json({ error: 'identity_validation_failed' }, { status: 502 });
    }

    const cookieStore = await cookies();
    const expiresIn = typeof data.expires_in === 'number' && Number.isFinite(data.expires_in)
      ? Math.max(60, Math.floor(data.expires_in))
      : 3600;

    cookieStore.set('appkit_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
    });

    if (typeof data.refresh_token === 'string' && data.refresh_token) {
      cookieStore.set('appkit_refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 3600,
        path: '/',
      });
    }

    const sessionId = await createSession(user);
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    cookieStore.set('narinyland_is_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    // Remove obsolete subject cookie from pre-hardening sessions.
    cookieStore.delete('narinyland_sub');

    debugLog('BFF: Validated AppKit session established.', { hasUser: true });

    const safeData = { ...data };
    delete safeData.access_token;
    delete safeData.refresh_token;
    delete safeData.id_token;
    delete safeData.token;
    return NextResponse.json(safeData);
  } catch (error) {
    console.error('Token proxy error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'server_error', error_description: 'Authentication service unavailable' }, { status: 503 });
  }
}
