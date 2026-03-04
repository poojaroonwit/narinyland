import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import redis from '@/lib/redis';

function extractSub(token: string): string | null {
  try {
    const padded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    // Basic CSRF Protection: Ensure request is from our own domain
    if (origin && !origin.includes(host || '')) {
      return NextResponse.json({ error: 'forbidden', error_description: 'CSRF validation failed' }, { status: 403 });
    }

    let domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    if (domain.endsWith('/')) domain = domain.slice(0, -1);
    const clientSecret = (process.env.APPKIT_CLIENT_SECRET || '').trim();

    if (!clientSecret) {
      console.error('APPKIT_CLIENT_SECRET is missing or empty on the server');
      return NextResponse.json(
        { error: 'server_error', error_description: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Prepare the form data to send to AppKit
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }

    // Inject the client secret
    params.append('client_secret', clientSecret);

    console.log('Proxying token request to AppKit...', {
      grant_type: body.grant_type,
      client_id: body.client_id,
      domain,
    });

    const response = await fetch(`${domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('AppKit token exchange error:', { status: response.status, data, clientId: body.client_id });
      return NextResponse.json(data, { status: response.status });
    }

    // --- BFF: Set HttpOnly cookies ---
    const cookieStore = await cookies();

    if (data.access_token) {
      cookieStore.set('appkit_access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.expires_in || 3600,
        path: '/',
      });
    }

    if (data.refresh_token) {
      cookieStore.set('appkit_refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 3600,
        path: '/',
      });
    }

    cookieStore.set('narinyland_is_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600,
      path: '/',
    });

    console.log('BFF: Cookies set:', {
      hasAccess: !!data.access_token,
      hasRefresh: !!data.refresh_token,
      hasIdToken: !!data.id_token,
      expiresIn: data.expires_in,
      scopes: data.scope || 'none',
      responseKeys: Object.keys(data),
    });

    // --- REDIS SESSION CACHE ---
    // Fetch user info right now while the token is guaranteed fresh,
    // then cache it so /api/auth/me never needs to call AppKit again.
    if (data.access_token) {
      const sub = extractSub(data.access_token);
      if (sub) {
        try {
          const meRes = await fetch(`${domain}/api/v1/users/me`, {
            headers: { 'Authorization': `Bearer ${data.access_token}`, 'Accept': 'application/json' },
          });
          if (meRes.ok) {
            const userInfo = await meRes.json();
            const ttl = data.expires_in || 3600;
            await redis.setex(`user_session:${sub}`, ttl, JSON.stringify(userInfo));
            console.log('BFF: User info cached in Redis for sub:', sub, '(TTL:', ttl, 's)');
          } else {
            console.warn('BFF: Could not fetch user info for Redis cache — AppKit returned', meRes.status);
          }
        } catch (e) {
          console.warn('BFF: Redis cache write failed (non-fatal):', e);
        }
      }
    }

    // --- TOKEN STRIPPING ---
    const safeData = { ...data };
    delete safeData.access_token;
    delete safeData.refresh_token;

    return NextResponse.json(safeData);

  } catch (error) {
    console.error('Token proxy error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to proxy token request' },
      { status: 500 }
    );
  }
}
