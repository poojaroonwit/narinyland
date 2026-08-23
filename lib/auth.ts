const PUBLIC_AUTH_RETURN_PATH = '/';
const AUTH_FETCH_TIMEOUT_MS = 8000;

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export class AuthUnavailableError extends Error {
  constructor(message = 'Authentication service unavailable') {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

async function fetchAuthResource(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    throw new AuthUnavailableError(error instanceof Error ? error.message : undefined);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Legacy compatibility facade. The browser no longer constructs an AppKit SDK
 * client or stores AppKit tokens; authentication is owned by the same-origin
 * BFF and `@alphayard/appkit/headless-auth` on the server.
 */
export async function initAppKit(): Promise<void> {
  return;
}

/** Open Narinyland's own login UI. */
export async function login(): Promise<void> {
  if (typeof window !== 'undefined') window.location.assign('/login');
}

/**
 * Hosted OAuth callbacks are no longer part of normal credentials login.
 * Keep this compatibility probe for old bookmarked/callback URLs: if the BFF
 * already established a valid session, accept it; otherwise return the user to
 * Narinyland's local sign-in journey rather than reintroducing browser tokens.
 */
export async function handleCallback(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const response = await fetchAuthResource('/api/auth/session', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) throw new AuthUnavailableError(`Session check failed: ${response.status}`);
  const result = await response.json().catch(() => ({})) as { authenticated?: boolean };
  if (result.authenticated) return true;
  throw new AuthRequiredError('This sign-in link is no longer active. Please sign in from Narinyland.');
}

/** Raw AppKit bearer tokens are never exposed to browser code. */
export function getAccessToken(): string | null {
  return null;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return (document.cookie || '').includes('narinyland_is_auth=true');
}

type AuthUserResponse = {
  id?: string;
  sub?: string;
  name?: string;
  email?: string;
  avatar?: string;
  picture?: string;
  profile_image?: string;
  image?: string;
  attributes?: Record<string, unknown>;
};

export async function getUser(): Promise<{ sub: string; name: string; email: string; picture: string; attributes: Record<string, unknown> } | null> {
  if (typeof window === 'undefined' || !isAuthenticated()) return null;
  try {
    const res = await fetchAuthResource('/api/auth/me', { credentials: 'include', cache: 'no-store' });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new AuthUnavailableError(`Profile request failed: ${res.status}`);
    const user = (await res.json()) as AuthUserResponse;
    const sub = user.id || user.sub;
    if (!sub) return null;
    return {
      sub,
      name: user.name || '',
      email: user.email || '',
      picture: user.avatar || user.picture || user.profile_image || user.image || '',
      attributes: user.attributes || {},
    };
  } catch (error) {
    if (error instanceof AuthUnavailableError) throw error;
    throw new AuthUnavailableError(error instanceof Error ? error.message : undefined);
  }
}

export async function logout(): Promise<void> {
  try {
    await fetchAuthResource('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    if (typeof window !== 'undefined') window.location.assign(PUBLIC_AUTH_RETURN_PATH);
  }
}

type Circle = { id: string; name: string; description?: string; role: string; memberCount?: number; createdAt?: string };
type CircleListPayload = { circles?: unknown; data?: unknown };

function extractCircleList(payload: unknown): Circle[] {
  const candidates = [
    payload,
    payload && typeof payload === 'object' ? (payload as CircleListPayload).circles : undefined,
    payload && typeof payload === 'object' ? (payload as CircleListPayload).data : undefined,
    payload && typeof payload === 'object' && (payload as CircleListPayload).data && typeof (payload as CircleListPayload).data === 'object'
      ? ((payload as { data: CircleListPayload }).data).circles
      : undefined,
  ];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.filter((circle): circle is Circle => (
      Boolean(circle) && typeof circle === 'object' && typeof (circle as { id?: unknown }).id === 'string'
    ));
  }
  return [];
}

export async function getUserCircles(): Promise<Circle[]> {
  try {
    if (typeof window === 'undefined') return [];
    if (!isAuthenticated()) throw new AuthRequiredError('Not authenticated');
    const res = await fetchAuthResource('/api/circles', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) throw new AuthRequiredError(`Auth error: ${res.status}`);
    if (!res.ok) return [];
    return extractCircleList(await res.json());
  } catch (error) {
    if (error instanceof AuthRequiredError) throw error;
    console.error('getUserCircles error:', error);
    return [];
  }
}

export async function updateProfile(data: { name?: string; avatar?: string; attributes?: Record<string, unknown> }): Promise<boolean> {
  try {
    const response = await fetchAuthResource('/api/auth/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(result.error || `Profile update failed: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error('AppKit profile update error:', error);
    return false;
  }
}

/**
 * Compatibility shape for older callers that only persisted user attributes.
 * This is not an AppKit SDK instance; it routes through Narinyland's BFF.
 */
export function getAppKit() {
  return {
    updateAttributes(attributes: Record<string, unknown>) {
      return updateProfile({ attributes });
    },
  };
}
