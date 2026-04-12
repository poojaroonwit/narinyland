import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * BFF Auth Helper for Server Components and Route Handlers.
 * Handles HttpOnly cookies, silent token refreshing, and CSRF validation.
 */
export async function getAuthSession(req?: Request) {
  // 1. CSRF Protection (if request is provided)
  if (req) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && !origin.includes(host || '')) {
      console.error('BFF: CSRF rejection:', { origin, host });
      return { error: 'forbidden', status: 403 };
    }
  }

  const cookieStore = await cookies();
  let token = cookieStore.get('appkit_access_token')?.value;
  const refreshToken = cookieStore.get('appkit_refresh_token')?.value;

  console.log('BFF Session Check:', { 
    hasAccessToken: !!token, 
    hasRefreshToken: !!refreshToken,
    isAuthMetaSet: cookieStore.has('narinyland_is_auth')
  });

  // 2. Self-Healing: Auto-refresh if access token is missing but refresh token exists
  if (!token && refreshToken) {
    console.log('BFF: Access token cookie expired, attempting silent refresh...');
    const refreshed = await refreshSession();
    if (refreshed) {
      token = (await cookies()).get('appkit_access_token')?.value;
    }
  }

  if (!token) {
    // 3. Fallback: Check for name-based "soft session" (narinyland_sub)
    const sub = cookieStore.get('narinyland_sub')?.value;
    if (sub) {
      console.log('BFF: No AppKit token, but name-based sub found:', sub);
      // Return the sub as a pseudo-token. This works for routes that only check 
      // for session existence or use the sub for local Prisma queries.
      return { token: `name_session_${sub}`, userId: sub, status: 200 };
    }

    // Do NOT clear narinyland_is_auth here.
    // /api/auth/me owns that cookie and handles the soft-session fallback independently.
    // Other routes simply return 401 when the access token is absent.
    return { error: 'unauthorized', status: 401 };
  }

  return { token, status: 200 };
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
      console.warn('BFF: Refresh attempted but no refresh_token cookie found.');
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

    console.log('BFF: Calling token refresh endpoint...', { domain, clientId });
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

        console.log('BFF: Session refreshed successfully.');
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
