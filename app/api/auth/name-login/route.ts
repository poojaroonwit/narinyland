import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { rejectCrossOrigin } from '@/lib/security';
import { debugLog } from '@/lib/logger';
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/session-store';

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
  const providedSecret = typeof body.loginSecret === 'string'
    ? body.loginSecret
    : req.headers.get('x-name-login-secret') || '';
  return Boolean(expectedSecret) && safeEquals(providedSecret, expectedSecret);
}

export async function POST(req: Request) {
  try {
    const csrfRejection = rejectCrossOrigin(req);
    if (csrfRejection) return csrfRejection;

    const body = await req.json().catch(() => ({})) as { firstname?: unknown; loginSecret?: unknown };
    if (!isProductionNameLoginAllowed(req, body)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (await isRateLimited(req)) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    }

    const firstname = typeof body.firstname === 'string' ? body.firstname.trim() : '';
    if (!firstname || firstname.length > 80) {
      return NextResponse.json({ error: 'Firstname is required' }, { status: 400 });
    }

    const partner = await prisma.partner.findFirst({
      where: { name: { equals: firstname, mode: 'insensitive' } },
    });
    if (!partner) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const user = {
      id: partner.id,
      sub: partner.id,
      name: partner.name,
      avatar: partner.avatar || '',
      attributes: {},
      authSource: 'name-login' as const,
    };
    const sessionId = await createSession(user);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    cookieStore.set('narinyland_is_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    cookieStore.delete('narinyland_sub');

    debugLog('[NameLogin] Opaque local session created.', { partnerId: partner.id });
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('[NameLogin] Unexpected error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
