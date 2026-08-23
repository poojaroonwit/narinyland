import { NextResponse } from 'next/server';
import { getHeadlessAuthConfig, getHeadlessSocialLoginUrl } from '@/lib/appkit-headless-server';
import { ensureOAuthRedirectUriConfigured } from '@/lib/appkit-oauth-redirect';

type JsonMap = Record<string, unknown>;
type ProviderConfig = {
  providerName?: unknown;
  displayName?: unknown;
  isEnabled?: unknown;
};

const OAUTH_PROVIDERS = new Set([
  'google',
  'google-oauth',
  'github',
  'github-oauth',
  'facebook',
  'facebook-oauth',
  'x',
  'x-oauth',
  'twitter',
  'twitter-oauth',
  'microsoft',
  'microsoft-oauth',
  'line',
  'line-oauth',
]);

function normalizeProviderName(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/_/g, '-') : '';
}

function normalizeOrigin(value: string | undefined) {
  if (!value?.trim()) return '';
  const raw = value.trim();
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return parsed.origin;
  } catch {
    return '';
  }
}

function trustedPublicOrigin(req: Request) {
  const configured =
    normalizeOrigin(process.env.NARINYLAND_PUBLIC_ORIGIN) ||
    normalizeOrigin(process.env.RAILWAY_PUBLIC_DOMAIN) ||
    normalizeOrigin(process.env.RAILWAY_STATIC_URL);
  if (configured) return configured;

  const requestOrigin = new URL(req.url).origin;
  const hostname = new URL(requestOrigin).hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return requestOrigin;
  throw new Error('Narinyland public origin is not configured');
}

function configuredOAuthProvider(config: JsonMap, requestedProvider: string): ProviderConfig | null {
  const providers = Array.isArray(config.providers) ? config.providers : [];
  for (const value of providers) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const provider = value as ProviderConfig;
    const normalized = normalizeProviderName(provider.providerName);
    if (
      provider.isEnabled !== false &&
      normalized === requestedProvider &&
      OAUTH_PROVIDERS.has(normalized)
    ) {
      return provider;
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedProvider = normalizeProviderName(url.searchParams.get('provider'));
    if (!requestedProvider || !OAUTH_PROVIDERS.has(requestedProvider)) {
      return NextResponse.json({ error: 'Unsupported social sign-in provider' }, { status: 400 });
    }

    const config = await getHeadlessAuthConfig();
    const provider = configuredOAuthProvider(config, requestedProvider);
    if (!provider || typeof provider.providerName !== 'string') {
      return NextResponse.json({ error: 'Unsupported social sign-in provider' }, { status: 400 });
    }

    const callback = new URL('/auth/social-complete', trustedPublicOrigin(req)).toString();
    const callbackReady = await ensureOAuthRedirectUriConfigured(callback);
    if (!callbackReady) {
      return NextResponse.json({ error: 'Social sign-in callback is not configured' }, { status: 503 });
    }

    const socialUrl = await getHeadlessSocialLoginUrl(provider.providerName, callback);
    return NextResponse.redirect(socialUrl, 302);
  } catch (error) {
    console.error('AppKit social sign-in start error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Social sign-in is temporarily unavailable' }, { status: 503 });
  }
}
