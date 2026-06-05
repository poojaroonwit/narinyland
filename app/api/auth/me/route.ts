import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import redis from '@/lib/redis';
import { rejectCrossOrigin } from '@/lib/security';

type AuthUser = {
  id: string;
  sub: string;
  name: string;
  email: string;
  avatar: string;
  attributes: Record<string, unknown>;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const padded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getStringClaim(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

function getUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  const sub = payload ? getStringClaim(payload, 'sub') : '';
  if (!payload || !sub) return null;

  const fullName = getStringClaim(payload, 'name');
  const firstName = getStringClaim(payload, 'given_name');
  const lastName = getStringClaim(payload, 'family_name');
  const attributes = payload.attributes;

  return {
    id: sub,
    sub,
    name: fullName || `${firstName} ${lastName}`.trim(),
    email: getStringClaim(payload, 'email'),
    avatar:
      getStringClaim(payload, 'picture') ||
      getStringClaim(payload, 'avatar') ||
      getStringClaim(payload, 'profile_image') ||
      getStringClaim(payload, 'image'),
    attributes:
      attributes && typeof attributes === 'object' && !Array.isArray(attributes)
        ? attributes as Record<string, unknown>
        : {},
  };
}

function getFallbackUser(sub: string): AuthUser {
  return {
    id: sub,
    sub,
    name: '',
    email: '',
    avatar: '',
    attributes: {},
  };
}

export async function GET(req: Request) {
  try {
    const csrfRejection = rejectCrossOrigin(req);
    if (csrfRejection) return csrfRejection;

    const cookieStore = await cookies();

    // --- FAST PATH: access token present (within first hour of login) ---
    const accessToken = cookieStore.get('appkit_access_token')?.value;
    if (accessToken) {
      const tokenUser = getUserFromToken(accessToken);
      if (tokenUser) {
        const cached = await redis.get(`user_session:${tokenUser.sub}`);
        if (cached) {
          return NextResponse.json(JSON.parse(cached));
        }
        return NextResponse.json(tokenUser);
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
      return NextResponse.json(getFallbackUser(storedSub));
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
