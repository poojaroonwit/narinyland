import { AppKit } from 'alphayard-appkit';

/**
 * AlphaYard AppKit Authentication Library
 */

let appKitInstance: AppKit | null = null;
let appKitConfigCache: {
  clientId: string;
  domain: string;
  redirectUri?: string;
} | null = null;

let isInitializing = false;
let initPromise: Promise<void> | null = null;

const DEFAULT_APPKIT_DOMAIN = 'https://appkits.up.railway.app';
const DEFAULT_APPKIT_SCOPES = ['openid', 'profile', 'email', 'offline_access'];
const PUBLIC_AUTH_RETURN_PATH = '/';

declare global {
  interface Window {
    __NARINYLAND_APPKIT_CONFIG__?: {
      clientId?: string | null;
      domain?: string | null;
    };
  }
}

function normalizeDomain(domain?: string | null): string {
  const trimmed = (domain || DEFAULT_APPKIT_DOMAIN).trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function normalizeClientId(clientId?: string | null): string {
  return (clientId || '').trim();
}

function getRedirectUri(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/auth/callback`;
}

function getStaticConfig() {
  return {
    clientId: normalizeClientId(process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID),
    domain: normalizeDomain(process.env.NEXT_PUBLIC_APPKIT_DOMAIN),
    redirectUri: getRedirectUri(),
  };
}

async function resolveAppKitConfig() {
  const config = getStaticConfig();

  if (typeof window !== 'undefined') {
    const injectedConfig = window.__NARINYLAND_APPKIT_CONFIG__;
    if (injectedConfig) {
      config.clientId = normalizeClientId(injectedConfig.clientId || config.clientId);
      config.domain = normalizeDomain(injectedConfig.domain || config.domain);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/config/appkit?ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const runtimeConfig = await res.json();
        const resolvedClientId = normalizeClientId(
          runtimeConfig.clientId ||
          runtimeConfig.appId ||
          runtimeConfig.applicationId ||
          config.clientId
        );
        const resolvedDomain = normalizeDomain(runtimeConfig.domain || config.domain);

        console.log('[Auth] Resolved AppKit Config:', {
          clientId: resolvedClientId ? 'SET' : 'MISSING',
          domain: resolvedDomain ? 'SET' : 'MISSING'
        });

        config.clientId = resolvedClientId;
        config.domain = resolvedDomain;
      } else {
        const details = await res.text().catch(() => '');
        console.error('[Auth] Failed to fetch runtime AppKit config:', res.status, details);
      }
    } catch (err) {
      console.error('[Auth] Error fetching runtime AppKit config:', err);
    }
  }

  if (!config.clientId || !config.domain) {
    console.error('[Auth] Final Config Validation Failed:', config);
    throw new Error('Sign in is temporarily unavailable because AppKit is not configured properly. Please ensure NEXT_PUBLIC_APPKIT_CLIENT_ID and NEXT_PUBLIC_APPKIT_DOMAIN are set and the server is restarted.');
  }

  return config;
}

function createAppKitClient(config: { clientId: string; domain: string; redirectUri?: string }) {
  return new AppKit({
    clientId: config.clientId,
    domain: config.domain,
    redirectUri: config.redirectUri,
    scopes: DEFAULT_APPKIT_SCOPES,
    storage: 'sessionStorage',
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = input.toString();

      // Proxy token exchange and revocation through our backend as usual,
      // but now our backend will also set the HttpOnly cookies.
      if (urlStr.includes('/oauth/token')) {
        const rawParams = new URLSearchParams(init?.body as string);
        const bodyData = Object.fromEntries(rawParams);

        return globalThis.fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
          credentials: 'include',
        });
      }

      if (urlStr.includes('/oauth/revoke')) {
        const rawParams = new URLSearchParams(init?.body as string);
        const bodyData = Object.fromEntries(rawParams);

        return globalThis.fetch('/api/auth/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
          credentials: 'include',
        });
      }

      // Proxy "me" profile request
      if (urlStr.includes('/users/me')) {
        return globalThis.fetch('/api/auth/me', { credentials: 'include' });
      }

      return globalThis.fetch(input, init);
    },
  });
}

/**
 * Asynchronously initialize the AppKit client
 * This fetches the Client ID from the server at runtime, bypassing Next.js build-time injection issues on Railway.
 */
export async function initAppKit(): Promise<void> {
  if (appKitInstance) return;
  if (isInitializing && initPromise) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
    const config = await resolveAppKitConfig();
    appKitConfigCache = config;
    appKitInstance = createAppKitClient(config);
  })();

  try {
    await initPromise;
  } finally {
    isInitializing = false;
    if (!appKitInstance) {
      initPromise = null;
    }
  }
}

/**
 * Synchronous getter for AppKit client.
 * Must call `await initAppKit()` at least once before using this.
 */
export function getAppKit(): AppKit {
  if (!appKitInstance) {
    if (isInitializing) {
      console.warn('getAppKit called while initAppKit is in progress. This may result in using an uninitialized client.');
    } else {
      console.warn('getAppKit called before initAppKit started. Performing emergency synchronous fallback.');
    }

    const fallbackConfig = appKitConfigCache || getStaticConfig();
    if (!fallbackConfig.clientId) {
      throw new Error('AppKit has not been initialized yet.');
    }

    return createAppKitClient(fallbackConfig);
  }

  return appKitInstance;
}

/**
 * Start the login/signup flow
 */
export async function login(): Promise<void> {
  await initAppKit();
  const client = getAppKit();
  const url = await client.buildAuthUrl({
    redirect_uri: getRedirectUri(),
    extraParams: { prompt: 'consent' },
  });

  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
}

/**
 * Handle the OAuth callback
 */
export async function handleCallback(): Promise<boolean> {
  try {
    await initAppKit();
    const client = getAppKit();
    await client.handleCallback();
    return true;
  } catch (err: any) {
    // If handleCallback fails because of stripped tokens, check our metadata cookie
    if (isAuthenticated()) {
      console.log('AppKit SDK reported callback error (likely due to stripped tokens), but session cookie is present. Considering success.');
      return true;
    }
    console.error('AppKit handleCallback error:', err);
    // Surface transient server errors with a clear, retryable message
    const msg: string = err?.message || String(err);
    if (msg.includes('503') || msg.includes('502') || msg.includes('504')) {
      throw new Error('Authentication server is temporarily unavailable. Please try again in a moment.');
    }
    throw err;
  }
}

/**
 * Get the stored access token
 */
export function getAccessToken(): string | null {
  // In BFF mode, we don't return the raw access token to the frontend.
  // This helps enforce that all API calls must go through our backend.
  return null;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  // In BFF mode, we check for our non-HttpOnly metadata cookie
  return document.cookie.includes('narinyland_is_auth=true');
}

/**
 * Get stored user info (Async)
 */
export async function getUser(): Promise<{ sub: string; name: string; email: string; picture: string; attributes: Record<string, any> } | null> {
  if (typeof window === 'undefined') return null;

  try {
    if (!isAuthenticated()) return null;

    // Call our proxied "me" endpoint which uses the HttpOnly cookie
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;

    const user = await res.json();
    return {
      sub: user.id || user.sub,
      name: user.name || '',
      email: user.email || '',
      picture: user.avatar || user.picture || user.profile_image || user.image || '',
      attributes: user.attributes || {},
    };
  } catch (err) {
    console.error('AppKit getUser error:', err);
    return null;
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    // Clear cookies on the server
    await fetch('/api/auth/logout', { method: 'POST' });

    // Also clear AppKit local storage state just in case
    await initAppKit();
    const client = getAppKit();
    await client.logout({
      post_logout_redirect_uri: typeof window !== 'undefined'
        ? `${window.location.origin}${PUBLIC_AUTH_RETURN_PATH}`
        : undefined,
    });
  } catch (err) {
    console.error('Logout error:', err);
    if (typeof window !== 'undefined') {
      window.location.href = PUBLIC_AUTH_RETURN_PATH;
    }
  }
}

/**
 * Get all circles/worlds the current user belongs to.
 * Proxied through our own backend to avoid CORS restrictions when calling
 * the AppKit API directly from the browser.
 */
export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export async function getUserCircles(): Promise<Array<{ id: string; name: string; description?: string; role: string; memberCount?: number; createdAt?: string }>> {
  try {
    if (typeof window === 'undefined') return [];
    if (!isAuthenticated()) throw new AuthRequiredError('Not authenticated');

    // Use our server-side proxy. In BFF mode, auth lives in cookies rather than
    // the SDK's browser storage state, so rely on the cookie-backed session.
    const res = await fetch('/api/circles', {
      credentials: 'include',
      cache: 'no-store',
    });

    // Distinguish auth errors from empty circles - auth errors should redirect to login
    if (res.status === 401 || res.status === 403) {
      throw new AuthRequiredError(`Auth error: ${res.status}`);
    }

    if (!res.ok) return [];
    const data = await res.json();
    // API may return array directly or wrapped in { circles: [] }
    return Array.isArray(data) ? data : (data.circles || data.data || []);
  } catch (err) {
    if (err instanceof AuthRequiredError) throw err;
    console.error('getUserCircles error:', err);
    return [];
  }
}

/**
 * Update the current user's profile
 */
export async function updateProfile(data: { name?: string; avatar?: string; attributes?: Record<string, any> }): Promise<boolean> {
  try {
    await initAppKit();
    const client = getAppKit();

    const nameParts = data.name?.trim().split(/\s+/) || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    await client.updateProfile({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      avatar: data.avatar || undefined,
    });

    if (data.attributes) {
      await client.updateAttributes(data.attributes);
    }

    return true;
  } catch (err) {
    console.error('AppKit updateProfile error:', err);
    return false;
  }
}
