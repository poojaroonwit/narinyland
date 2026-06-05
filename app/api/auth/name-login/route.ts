import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { rejectCrossOrigin } from '@/lib/security';
import { debugLog } from '@/lib/logger';

const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

function getRequestIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || req.headers.get('x-real-ip') || 'unknown';
}

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function isRateLimited(req: Request): Promise<boolean> {
  const key = `name_login_attempts:${getRequestIp(req)}`;
  const current = Number((await redis.get(key)) || '0');

  if (current >= RATE_LIMIT_MAX_ATTEMPTS) return true;

  await redis.setex(key, RATE_LIMIT_WINDOW_SECONDS, String(current + 1));
  return false;
}

function isProductionNameLoginAllowed(req: Request, body: { loginSecret?: unknown }): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (process.env.ENABLE_NAME_LOGIN !== 'true') return false;

  const expectedSecret = process.env.NAME_LOGIN_SECRET || '';
  const providedSecret =
    typeof body.loginSecret === 'string'
      ? body.loginSecret
      : req.headers.get('x-name-login-secret') || '';

  return Boolean(expectedSecret) && safeEquals(providedSecret, expectedSecret);
}

export async function POST(req: Request) {
  try {
    const csrfRejection = rejectCrossOrigin(req);
    if (csrfRejection) return csrfRejection;

    const body = await req.json();
    if (!isProductionNameLoginAllowed(req, body)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (await isRateLimited(req)) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    }

    const { firstname } = body;

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

    debugLog('[NameLogin] Soft session created.', { partnerId: partner.id });

    return NextResponse.json({ success: true, user: userInfo });
  } catch (error) {
    console.error('[NameLogin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
