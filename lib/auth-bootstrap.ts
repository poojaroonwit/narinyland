export type AuthUser = {
  sub: string;
  name: string;
  email: string;
  picture: string;
  attributes: Record<string, unknown>;
};

export type AuthUserSource = 'remote' | 'cached' | 'missing';

const VERIFIED_USER_CACHE_KEY = 'narinyland_verified_user';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseCachedAuthUser(value: string | null): AuthUser | null {
  if (!value) return null;

  try {
    const candidate = JSON.parse(value) as unknown;
    if (!isRecord(candidate) || typeof candidate.sub !== 'string' || !candidate.sub.trim()) return null;

    return {
      sub: candidate.sub,
      name: typeof candidate.name === 'string' ? candidate.name : '',
      email: typeof candidate.email === 'string' ? candidate.email : '',
      picture: typeof candidate.picture === 'string' ? candidate.picture : '',
      attributes: isRecord(candidate.attributes) ? candidate.attributes : {},
    };
  } catch {
    return null;
  }
}

export function resolveAuthUser(options: {
  hasSession: boolean;
  remoteUser: AuthUser | null;
  cachedUser: AuthUser | null;
  remoteUnavailable: boolean;
}): { user: AuthUser | null; source: AuthUserSource } {
  if (!options.hasSession) return { user: null, source: 'missing' };
  if (options.remoteUser) return { user: options.remoteUser, source: 'remote' };
  if (options.remoteUnavailable && options.cachedUser) return { user: options.cachedUser, source: 'cached' };
  return { user: null, source: 'missing' };
}

export function readCachedAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseCachedAuthUser(window.sessionStorage?.getItem(VERIFIED_USER_CACHE_KEY) || null);
  } catch {
    return null;
  }
}

export function cacheVerifiedAuthUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(VERIFIED_USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function clearCachedAuthUser(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.removeItem(VERIFIED_USER_CACHE_KEY);
  } catch {
    // Nothing to clear when session storage is unavailable.
  }
}
