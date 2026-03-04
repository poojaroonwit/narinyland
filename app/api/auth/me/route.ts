import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
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

export async function GET(req: Request) {
  try {
    const { token, error, status } = await getAuthSession(req);

    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    const sub = extractSub(token);

    // --- REDIS CACHE: serve user info without calling AppKit ---
    if (sub) {
      const cached = await redis.get(`user_session:${sub}`);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    }

    // Cache miss — call AppKit (happens on first request after Redis TTL expires)
    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim().replace(/\/$/, '');
    const response = await fetch(`${domain}/api/v1/users/me`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });

    if (response.ok) {
      const userInfo = await response.json();
      // Re-populate cache for next requests
      if (sub) {
        await redis.setex(`user_session:${sub}`, 3600, JSON.stringify(userInfo)).catch(() => {});
      }
      return NextResponse.json(userInfo);
    }

    // AppKit rejected the token — try a refresh then re-cache
    if (response.status === 401) {
      console.log('BFF /me: Cache miss and AppKit returned 401, attempting refresh...');
      const { refreshSession } = await import('@/lib/auth-server');
      const refreshed = await refreshSession();
      if (refreshed) {
        const { cookies } = await import('next/headers');
        const newToken = (await cookies()).get('appkit_access_token')?.value;
        if (newToken) {
          const retryRes = await fetch(`${domain}/api/v1/users/me`, {
            headers: { 'Authorization': `Bearer ${newToken}`, 'Accept': 'application/json' },
          });
          if (retryRes.ok) {
            const userInfo = await retryRes.json();
            const newSub = extractSub(newToken) || sub;
            if (newSub) {
              await redis.setex(`user_session:${newSub}`, 3600, JSON.stringify(userInfo)).catch(() => {});
            }
            return NextResponse.json(userInfo);
          }
        }
      }
    }

    const errData = await response.json().catch(() => ({}));
    console.error('BFF /me: AppKit rejected the session token:', { status: response.status, errData });
    return NextResponse.json(errData, { status: response.status });

  } catch (error) {
    console.error('BFF /me: Unexpected proxy failure:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
