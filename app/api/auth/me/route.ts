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

export async function GET(req: Request) {
  try {
    // CSRF check
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && !origin.includes(host || '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const cookieStore = await cookies();

    // --- FAST PATH: access token present (within first hour of login) ---
    const accessToken = cookieStore.get('appkit_access_token')?.value;
    if (accessToken) {
      const sub = extractSub(accessToken);
      if (sub) {
        const cached = await redis.get(`user_session:${sub}`);
        if (cached) {
          return NextResponse.json(JSON.parse(cached));
        }
      }
      // Cache miss with valid token — shouldn't happen after our token route caches at login,
      // but handle it gracefully by falling through to the soft-session path.
    }

    // --- SOFT SESSION PATH: access token expired but sub cookie + Redis still valid ---
    // This keeps the user "logged in" for up to 7 days without a refresh token.
    const storedSub = cookieStore.get('narinyland_sub')?.value;
    if (storedSub) {
      const cached = await redis.get(`user_session:${storedSub}`);
      if (cached) {
        // Slide the Redis TTL so active users don't get logged out mid-use
        await redis.expire(`user_session:${storedSub}`, 7 * 24 * 3600).catch(() => {});
        return NextResponse.json(JSON.parse(cached));
      }
    }

    // No valid session at all — clear metadata cookies to let AuthProvider redirect to login
    cookieStore.delete('narinyland_is_auth');
    cookieStore.delete('narinyland_sub');
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  } catch (error) {
    console.error('BFF /me: Unexpected failure:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
