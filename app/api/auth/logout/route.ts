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
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (origin && !origin.includes(host || '')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const cookieStore = await cookies();

  // Evict the Redis session cache before clearing cookies
  const accessToken = cookieStore.get('appkit_access_token')?.value;
  if (accessToken) {
    const sub = extractSub(accessToken);
    if (sub) {
      await redis.del(`user_session:${sub}`).catch(() => {});
    }
  }

  cookieStore.delete('appkit_access_token');
  cookieStore.delete('appkit_refresh_token');
  cookieStore.delete('narinyland_is_auth');
  cookieStore.delete('narinyland_sub');

  return NextResponse.json({ success: true });
}
