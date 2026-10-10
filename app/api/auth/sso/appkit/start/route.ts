import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAppKitDomain } from '@/lib/appkit-server';
import { ensureOAuthRedirectUriConfigured, getAppKitInteractiveOAuthClientId } from '@/lib/appkit-oauth-redirect';
import { getTrustedNarinylandOrigin } from '@/lib/narinyland-public-origin';

const FLOW_TTL_SECONDS = 10 * 60;
const STATE_COOKIE = 'narinyland_oidc_state';
const VERIFIER_COOKIE = 'narinyland_oidc_verifier';
const CLIENT_COOKIE = 'narinyland_oidc_client';

function base64url(buffer: Buffer) {
  return buffer.toString('base64url');
}

export async function GET(req: Request) {
  try {
    const callback = new URL('/api/auth/sso/appkit/callback', getTrustedNarinylandOrigin(req)).toString();
    const callbackReady = await ensureOAuthRedirectUriConfigured(callback);
    if (!callbackReady) {
      return NextResponse.json({ error: 'AppKit SSO callback is not configured' }, { status: 503 });
    }
    const clientId = await getAppKitInteractiveOAuthClientId(callback);
    if (!clientId) {
      return NextResponse.json({ error: 'AppKit interactive SSO client is not configured' }, { status: 503 });
    }

    const state = base64url(crypto.randomBytes(32));
    const verifier = base64url(crypto.randomBytes(48));
    const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

    const authorize = new URL('/oauth/authorize', getAppKitDomain());
    authorize.searchParams.set('client_id', clientId);
    authorize.searchParams.set('redirect_uri', callback);
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('scope', 'openid email profile');
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('code_challenge', challenge);
    authorize.searchParams.set('code_challenge_method', 'S256');

    const response = NextResponse.redirect(authorize, 302);
    const common = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: FLOW_TTL_SECONDS,
      path: '/api/auth/sso/appkit',
    };
    response.cookies.set(STATE_COOKIE, state, common);
    response.cookies.set(VERIFIER_COOKIE, verifier, common);
    response.cookies.set(CLIENT_COOKIE, clientId, common);
    return response;
  } catch (error) {
    console.error('AppKit OIDC SSO start error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'AppKit SSO is temporarily unavailable' }, { status: 503 });
  }
}
