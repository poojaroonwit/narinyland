import { getAppKitApplicationId, getAppKitDomain, getServiceToken } from '@/lib/appkit-server';

type JsonMap = Record<string, unknown>;

const SYNC_TIMEOUT_MS = 6_000;
let lastRegisteredRedirect: { uri: string; syncedAt: number } | null = null;

function normalizeDomain(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function isLocalRedirect(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

async function appKitAdminFetch(path: string, token: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    return await fetch(`${normalizeDomain(getAppKitDomain())}${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureOAuthRedirectUriConfigured(redirectUri: string): Promise<boolean> {
  const normalizedUri = redirectUri.trim();
  if (!normalizedUri) return false;

  try {
    const parsed = new URL(normalizedUri);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  } catch {
    return false;
  }

  if (isLocalRedirect(normalizedUri) && process.env.ALLOW_LOCAL_SSO_REDIRECT_SYNC !== 'true') {
    return false;
  }

  const now = Date.now();
  if (lastRegisteredRedirect?.uri === normalizedUri && now - lastRegisteredRedirect.syncedAt < 10 * 60 * 1000) {
    return true;
  }

  const token = await getServiceToken();
  const applicationId = getAppKitApplicationId();
  if (!token || !applicationId) return false;

  try {
    const path = `/api/v1/admin/applications/${encodeURIComponent(applicationId)}`;
    const currentResponse = await appKitAdminFetch(path, token);
    if (!currentResponse.ok) return false;
    const currentPayload = await currentResponse.json().catch(() => ({})) as JsonMap;
    const application = currentPayload.application && typeof currentPayload.application === 'object'
      ? currentPayload.application as JsonMap
      : {};
    const existing = Array.isArray(application.oauthRedirectUris)
      ? application.oauthRedirectUris.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const oauthRedirectUris = Array.from(new Set([...existing.map(value => value.trim()), normalizedUri]));

    if (existing.some(value => value.trim() === normalizedUri)) {
      lastRegisteredRedirect = { uri: normalizedUri, syncedAt: now };
      return true;
    }

    const updateResponse = await appKitAdminFetch(path, token, {
      method: 'PUT',
      body: JSON.stringify({ oauthRedirectUris }),
    });
    if (!updateResponse.ok) return false;

    lastRegisteredRedirect = { uri: normalizedUri, syncedAt: now };
    return true;
  } catch (error) {
    console.warn('AppKit OAuth redirect URI sync failed:', error instanceof Error ? error.message : 'unknown error');
    return false;
  }
}

/**
 * Retrieve the application's interactive authorization-code client rather
 * than reusing its client_credentials service identity for browser SSO.
 */
export async function getAppKitInteractiveOAuthClientId(redirectUri: string): Promise<string | null> {
  const token = await getServiceToken();
  const applicationId = getAppKitApplicationId();
  if (!token || !applicationId) return null;

  try {
    const response = await appKitAdminFetch(
      '/api/v1/admin/applications/' + encodeURIComponent(applicationId),
      token,
    );
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({})) as JsonMap;
    const application = payload.application && typeof payload.application === 'object'
      ? payload.application as JsonMap
      : {};
    const clientId = typeof application.oauthClientId === 'string'
      ? application.oauthClientId.trim()
      : '';
    const allowedRedirects = Array.isArray(application.oauthRedirectUris)
      ? application.oauthRedirectUris
      : [];
    if (!clientId || !allowedRedirects.some(value => typeof value === 'string' && value.trim() === redirectUri)) {
      return null;
    }
    return clientId;
  } catch (error) {
    console.warn(
      'AppKit interactive OAuth client lookup failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return null;
  }
}
