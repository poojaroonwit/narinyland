import { cookies } from 'next/headers';
import { rejectCrossOrigin } from '@/lib/security';
import { debugLog, debugWarn } from '@/lib/logger';

/**
 * BFF Auth Helper for Server Components and Route Handlers.
 * Handles HttpOnly cookies, silent token refreshing, and CSRF validation.
 */
export async function getAuthSession(req?: Request) {
  // 1. CSRF Protection (if request is provided)
  if (req) {
    const csrfRejection = rejectCrossOrigin(req);
    if (csrfRejection) return { error: 'forbidden', status: 403 };
  }

  const cookieStore = await cookies();
  let token = cookieStore.get('appkit_access_token')?.value;
  const refreshToken = cookieStore.get('appkit_refresh_token')?.value;
  // Keep reference to original token in case we need to extract sub after clearing
  const lastAccessToken = token;

  // 2. Self-Healing: Auto-refresh if access token is missing but refresh token exists
  if (!token && refreshToken) {
    debugLog('BFF: Access token cookie expired, attempting silent refresh.');
    const refreshed = await refreshSession();
    if (refreshed) {
      token = (await cookies()).get('appkit_access_token')?.value;
    }
  }

  debugLog('BFF Session Check:', {
    hasAccessToken: !!token,
    hasRefreshToken: !!refreshToken,
    isAuthMetaSet: cookieStore.has('narinyland_is_auth'),
  });

  // Token exists but refresh token is missing - check if token is expired
  // If expired, clear it and allow fallback to soft session (Redis + narinyland_sub)
  if (token && !refreshToken) {
    debugWarn('BFF: Access token exists but refresh token is missing. Checking expiry.');
    let isExpired = false;
    let tokenExp: number | undefined;
    let tokenSub: string | undefined;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
        tokenExp = payload.exp;
        tokenSub = payload.sub;
        const now = Math.floor(Date.now() / 1000);
        debugLog('BFF: Token decode:', { exp: tokenExp, now, hasSub: !!tokenSub, isExpired: tokenExp ? tokenExp < now : 'no_exp' });
        if (payload.exp && payload.exp < now) {
          isExpired = true;
        }
      } else {
        debugWarn('BFF: Token does not have 3 parts, invalid JWT.');
        isExpired = true;
      }
    } catch (e) {
      // If we can't decode, assume it might be expired
      debugWarn('BFF: Failed to decode token.', e);
      isExpired = true;
    }

    if (isExpired) {
      debugWarn('BFF: Access token is expired and no refresh token available. Clearing token to allow soft session fallback.');
      cookieStore.delete('appkit_access_token');
      token = undefined; // Allow soft session fallback below
    }
  }

  if (!token) {
    // 3. Fallback: Check for name-based "soft session" (narinyland_sub)
    let sub = cookieStore.get('narinyland_sub')?.value;
    const hasAuthMeta = cookieStore.has('narinyland_is_auth');

    // Recovery: If narinyland_sub is missing but we just cleared an expired token,
    // try to extract the sub from that expired token (it's still in the cookie store reference)
    if (!sub && lastAccessToken) {
      try {
        const parts = lastAccessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
          if (payload.sub) {
            sub = payload.sub;
            debugLog('BFF: Recovered sub from expired access token.', { hasSub: !!sub });
          }
        }
      } catch {
        // Ignore extraction errors
      }
    }

    debugLog('BFF: No AppKit token. Checking soft session:', { hasSub: !!sub, hasAuthMeta });

    if (sub) {
      debugLog('BFF: Soft session found, returning name_session.', { hasSub: !!sub });
      // Return the sub as a pseudo-token. This works for routes that only check
      // for session existence or use the sub for local Prisma queries.
      return { token: `name_session_${sub}`, userId: sub, status: 200, isSoft: true };
    }

    debugWarn('BFF: No AppKit token and no narinyland_sub cookie. Returning 401.');
    // Do NOT clear narinyland_is_auth here.
    // /api/auth/me owns that cookie and handles the soft-session fallback independently.
    // Other routes simply return 401 when the access token is absent.
    return { error: 'unauthorized', status: 401 };
  }

  // Extract userId (sub) from token if possible
  let userId: string | undefined;
  if (token.startsWith('name_session_')) {
    userId = token.replace('name_session_', '');
  } else {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
        userId = payload.sub;
      }
    } catch {}
  }

  return { token, userId, status: 200, isSoft: token.startsWith('name_session_') };
}

/**
 * Manually trigger a token refresh using the existing refresh_token cookie.
 * Updates cookies and returns true on success.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('appkit_refresh_token')?.value;

    if (!refreshToken) {
      debugWarn('BFF: Refresh attempted but no refresh_token cookie found.');
      return false;
    }

    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    const clientSecret = (process.env.APPKIT_CLIENT_SECRET || '').trim();
    const clientId = (process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || process.env.APPKIT_CLIENT_ID || '').trim();

    if (!clientSecret || !clientId) {
      console.error('BFF: Refresh failed - missing Client ID or Secret in environment.');
      return false;
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });

    debugLog('BFF: Calling token refresh endpoint.', { domain, hasClientId: !!clientId });
    const refreshRes = await fetch(`${domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      const newToken = refreshData.access_token;
      
      if (newToken) {
        cookieStore.set('appkit_access_token', newToken, {
          httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
          maxAge: refreshData.expires_in || 3600, path: '/',
        });
        if (refreshData.refresh_token) {
          cookieStore.set('appkit_refresh_token', refreshData.refresh_token, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
            maxAge: 30 * 24 * 3600, path: '/',
          });
        }
        
        // Ensure metadata cookie is also renewed
        cookieStore.set('narinyland_is_auth', 'true', {
          httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
          maxAge: 30 * 24 * 3600, path: '/',
        });

        debugLog('BFF: Session refreshed successfully.');
        return true;
      }
    } else {
      const errBody = await refreshRes.json().catch(() => ({}));
      console.error('BFF: Refresh exchange failed:', { status: refreshRes.status, errBody });
    }
  } catch (err) {
    console.error('BFF: refreshSession catch error:', err);
  }
  return false;
}
