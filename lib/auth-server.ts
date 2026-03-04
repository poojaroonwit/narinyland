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

  // 2. Self-Healing: Auto-refresh if access token is expired but refresh token exists
  if (!token && refreshToken) {
    try {
      const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
      const clientSecret = (process.env.APPKIT_CLIENT_SECRET || '').trim();
      const clientId = (process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '').trim();

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      });

      console.log('BFF: Attempting silent refresh...', { clientId: clientId ? 'set' : 'MISSING', hasSecret: !!clientSecret });

      const refreshRes = await fetch(`${domain}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData.access_token;
        
        if (newToken) {
          // Update the session cookies
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
          
          // IMPORTANT: Also update our metadata cookie to stay "sticky"
          cookieStore.set('narinyland_is_auth', 'true', {
            httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
            maxAge: 30 * 24 * 3600, path: '/',
          });

          token = newToken;
          console.log('BFF: Token refreshed successfully.');
        } else {
          console.warn('BFF: Refresh ok but no access_token in response');
        }
      } else {
        const errBody = await refreshRes.json().catch(() => ({}));
        console.error('BFF: Refresh token exchange failed:', { status: refreshRes.status, errBody });
      }
    } catch (err) {
      console.error('BFF: Auto-refresh runtime error:', err);
    }
  }

  if (!token) {
    return { error: 'unauthorized', status: 401 };
  }

  return { token, status: 200 };
}
