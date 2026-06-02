import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { rejectCrossOrigin } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const csrfRejection = rejectCrossOrigin(req);
    if (csrfRejection) return csrfRejection;

    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_NAME_LOGIN !== 'true') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { firstname } = await req.json();

    if (!firstname || typeof firstname !== 'string' || firstname.trim().length > 80) {
      return NextResponse.json({ error: 'Firstname is required' }, { status: 400 });
    }

    // Search for a partner with this name (case-insensitive)
    const partner = await prisma.partner.findFirst({
      where: {
        name: {
          equals: firstname.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (!partner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare user info for Redis session (matching the AppKit BFF logic)
    const userInfo = {
      id: partner.id,
      sub: partner.id,
      name: partner.name,
      avatar: partner.avatar || '',
      attributes: {}, // Name-based login might not have attributes
    };

    const sub = partner.id;
    const SESSION_TTL = 7 * 24 * 3600; // 7 days

    // Cache user session in Redis
    await redis.setex(`user_session:${sub}`, SESSION_TTL, JSON.stringify(userInfo));

    // Set cookies
    const cookieStore = await cookies();

    cookieStore.set('narinyland_sub', sub, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL,
      path: '/',
    });

    cookieStore.set('narinyland_is_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL,
      path: '/',
    });

    console.log(`[NameLogin] Success for ${partner.name} (sub: ${sub})`);

    return NextResponse.json({ success: true, user: userInfo });
  } catch (error) {
    console.error('[NameLogin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
