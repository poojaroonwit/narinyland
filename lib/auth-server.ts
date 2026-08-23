import { cookies } from 'next/headers';
import { refreshHeadlessSession } from '@/lib/appkit-headless-server';
import { rejectCrossOrigin } from '@/lib/security';
import { debugLog, debugWarn } from '@/lib/logger';
import {
  createSession,
  getSession,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type NarinylandSessionUser,
} from '@/lib/session-store';

const APPKIT_FETCH_TIMEOUT_MS = 8_000;

function getAppKitDomain(): string {
  return (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app')
    .trim()
    .replace(/\/+$/, '');
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPKIT_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timeout);
  }
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Validate an AppKit bearer token with AppKit itself. Never derive identity from
 * an unsigned JWT payload in Narinyland.
 */
export async function validateAppKitAccessToken(token: string): Promise<NarinylandSessionUser | null> {
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(`${getAppKitDomain()}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;

    const raw = await response.json().catch(() => ({})) as Record<string, unknown>;
    const nested = raw.user && typeof raw.user === 'object' && !Array.isArray(raw.user)
      ? raw.user as Record<string, unknown>
      : raw;
    const sub = stringValue(nested.id) || stringValue(nested.sub);
    if (!sub) return null;

    const firstName = stringValue(nested.firstName) || stringValue(nested.given_name);
    const lastName = stringValue(nested.lastName) || stringValue(nested.family_name);
    const attributes = nested.attributes && typeof nested.attributes === 'object' && !Array.isArray(nested.attributes)
      ? nested.attributes as Record<string, unknown>
      : {};

    return {
      id: sub,
      sub,
      name: stringValue(nested.name) || `${firstName} ${lastName}`.trim(),
      email: stringValue(nested.email),
      avatar:
        stringValue(nested.avatar) ||
        stringValue(nested.avatarUrl) ||
        stringValue(nested.picture) ||
        stringValue(nested.profile_image) ||
        stringValue(nested.image),
      attributes,
      authSource: 'appkit',
    };
  } catch (error) {
    debugWarn('BFF: AppKit token validation failed.', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

async function persistOpaqueSession(user: NarinylandSessionUser): Promise<string> {
  const sessionId = await createSession(user);
  const cookieStore = await cookies();
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
  return sessionId;
}

/**
 * BFF Auth Helper for Server Components and Route Handlers.
 * Identity comes only from an opaque Redis-backed Narinyland session or from
 * a bearer token validated by AppKit. Cookie subjects/JWT payloads are never
 * accepted as authorization proof.
 */
export async function getAuthSession(req?: Request) {
  if (req) {
    const csrfRejection = rejectCrossOrigin(req);
    if (csrfRejection) return { error: 'forbidden', status: 403 };
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const storedSession = sessionId ? await getSession(sessionId) : null;
  let token = cookieStore.get('appkit_access_token')?.value;
  const refreshToken = cookieStore.get('appkit_refresh_token')?.value;

  if (storedSession) {
    return {
      token,
      userId: storedSession.sub,
      user: storedSession,
      status: 200,
      isSoft: !token,
    };
  }

  if (!token && refreshToken) {
    const refreshed = await refreshSession();
    if (refreshed) token = (await cookies()).get('appkit_access_token')?.value;
  }

  if (token) {
    const user = await validateAppKitAccessToken(token);
    if (user) {
      await persistOpaqueSession(user);
      return { token, userId: user.sub, user, status: 200, isSoft: false };
    }
    cookieStore.delete('appkit_access_token');
  }

  debugLog('BFF: No validated Narinyland session.');
  return { error: 'unauthorized', status: 401 };
}

/** Refresh AppKit cookies through the same headless-auth SDK used for login. */
export async function refreshSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('appkit_refresh_token')?.value;
    if (!refreshToken) return false;

    const result = await refreshHeadlessSession(refreshToken);
    if (result.status !== 'authenticated' || !result.accessToken) {
      debugWarn('BFF: AppKit headless refresh did not return an authenticated continuation.');
      return false;
    }

    cookieStore.set('appkit_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });
    cookieStore.set('appkit_refresh_token', result.refreshToken || refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600,
      path: '/',
    });

    debugLog('BFF: AppKit headless session refreshed.');
    return true;
  } catch (error) {
    debugWarn('BFF: refreshSession failed.', error instanceof Error ? error.message : 'unknown error');
    return false;
  }
}
