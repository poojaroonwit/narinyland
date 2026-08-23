import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAppKitDomain } from '@/lib/appkit-server';
import { validateAppKitAccessToken } from '@/lib/auth-server';
import { getTrustedNarinylandOrigin } from '@/lib/narinyland-public-origin';
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/session-store';

const STATE_COOKIE = 'narinyland_oidc_state';
const VERIFIER_COOKIE = 'narinyland_oidc_verifier';
const EXCHANGE_TIMEOUT_MS = 8_000;

type TokenPayload = {
  access_token?: unknown;
  refresh_token?: unknown;
  error?: unknown;
  error_description?: unknown;
};

function clientId() {
  return (process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || process.env.APPKIT_CLIENT_ID || '').trim();
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function loginError(origin: string, code: string) {
  const target = new URL('/login', origin);
  target.searchParams.set('auth_error', code);
  return NextResponse.redirect(target, 302);
}

function clearFlowCookies(response: NextResponse) {
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(VERIFIER_COOKIE);
}

export async function GET(req: Request) {
  const origin = getTrustedNarinylandOrigin(req);
  const url = new URL(req.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value || '';
  const verifier = cookieStore.get(VERIFIER_COOKIE)?.value || '';
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const oauthError = url.searchParams.get('error') || '';

  if (oauthError) {
    const response = loginError(origin, 'appkit_sso_denied');
    clearFlowCookies(response);
    return response;
  }

  if (!code || !state || !expectedState || !verifier || !safeEqual(state, expectedState)) {
    const response = loginError(origin, 'appkit_sso_invalid_state');
    clearFlowCookies(response);
    return response;
  }

  const oauthClientId = clientId();
  if (!oauthClientId) {
    const response = loginError(origin, 'appkit_sso_not_configured');
    clearFlowCookies(response);
    return response;
  }

  const callback = new URL('/api/auth/sso/appkit/callback', origin).toString();
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: callback,
    client_id: oauthClientId,
    code_verifier: verifier,
  });
  const clientSecret = (process.env.APPKIT_CLIENT_SECRET || '').trim();
  if (clientSecret) form.set('client_secret', clientSecret);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXCHANGE_TIMEOUT_MS);
  try {
    const tokenResponse = await fetch(`${getAppKitDomain().replace(/\/+$/, '')}/oauth/token`, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const tokenData = await tokenResponse.json().catch(() => ({})) as TokenPayload;
    const accessToken = typeof tokenData.access_token === 'string' ? tokenData.access_token : '';
    const refreshToken = typeof tokenData.refresh_token === 'string' ? tokenData.refresh_token : '';
    if (!tokenResponse.ok || !accessToken) {
      console.error('AppKit OIDC token exchange failed:', typeof tokenData.error === 'string' ? tokenData.error : tokenResponse.status);
      const response = loginError(origin, 'appkit_sso_exchange_failed');
      clearFlowCookies(response);
      return response;
    }

    const user = await validateAppKitAccessToken(accessToken);
    if (!user) {
      const response = loginError(origin, 'appkit_sso_identity_invalid');
      clearFlowCookies(response);
      return response;
    }

    const sessionId = await createSession(user);
    const response = NextResponse.redirect(new URL('/garden', origin), 302);
    response.cookies.set('appkit_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });
    if (refreshToken) {
      response.cookies.set('appkit_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
    }
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    response.cookies.set('narinyland_is_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    response.cookies.delete('narinyland_sub');
    clearFlowCookies(response);
    return response;
  } catch (error) {
    console.error('AppKit OIDC SSO callback error:', error instanceof Error ? error.message : 'unknown error');
    const response = loginError(origin, 'appkit_sso_unavailable');
    clearFlowCookies(response);
    return response;
  } finally {
    clearTimeout(timer);
  }
}
