import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import redis from '@/lib/redis';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    // Basic CSRF Protection: Ensure request is from our own domain
    if (origin && !origin.includes(host || '')) {
      return NextResponse.json({ error: 'forbidden', error_description: 'CSRF validation failed' }, { status: 403 });
    }

    let domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
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

    const tokenRequest = () => fetch(`${domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    let response = await tokenRequest();

    // Retry once on transient gateway errors (AppKit on Railway cold-starts / restarts)
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      console.warn(`BFF: AppKit returned ${response.status}, retrying after 800ms...`);
      await new Promise(r => setTimeout(r, 800));
      response = await tokenRequest();
    }

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

    // --- REDIS SESSION CACHE (from ID Token) ---
    // The id_token is a signed OIDC JWT containing user claims (sub, name, email, picture).
    // Decode it directly — no extra network call needed, no dependency on /users/me.
    if (data.id_token) {
      try {
        const padded = data.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const idClaims = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
        console.log('BFF: ID Token claims:', idClaims);

        const sub = idClaims.sub;
        if (sub) {
          const userInfo = {
            id: sub,
            sub,
            name: idClaims.name || `${idClaims.given_name || ''} ${idClaims.family_name || ''}`.trim(),
            email: idClaims.email || '',
            avatar: idClaims.picture || idClaims.avatar || '',
            attributes: idClaims.attributes || {},
          };
          // 7-day TTL: user info outlives the 1-hour access token so the soft
          // session in /api/auth/me can serve user data without a valid token.
          const SESSION_TTL = 7 * 24 * 3600;
          await redis.setex(`user_session:${sub}`, SESSION_TTL, JSON.stringify(userInfo));
          console.log('BFF: User session cached from ID token for sub:', sub, '(TTL: 7d)');

          // Non-HttpOnly so the server can read it independently of the access token.
          // This lets /api/auth/me serve from Redis even after the access token expires.
          cookieStore.set('narinyland_sub', sub, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_TTL,
            path: '/',
          });
        }
      } catch (e) {
        console.warn('BFF: Failed to cache user info from ID token:', e);
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
