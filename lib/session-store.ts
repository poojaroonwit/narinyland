import { randomBytes } from 'node:crypto';
import redis from '@/lib/redis';

export const SESSION_COOKIE_NAME = 'narinyland_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type NarinylandSessionUser = {
  id: string;
  sub: string;
  name?: string;
  email?: string;
  avatar?: string;
  attributes?: Record<string, unknown>;
  authSource?: 'appkit' | 'name-login';
};

function sessionKey(sessionId: string) {
  return `narinyland_session:${sessionId}`;
}

export async function createSession(user: NarinylandSessionUser): Promise<string> {
  const sessionId = randomBytes(32).toString('base64url');
  await redis.setex(sessionKey(sessionId), SESSION_TTL_SECONDS, JSON.stringify(user));
  return sessionId;
}

export async function getSession(sessionId: string): Promise<NarinylandSessionUser | null> {
  if (!sessionId || sessionId.length > 128) return null;
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as NarinylandSessionUser;
    if (!user?.sub || user.sub !== user.id) return null;
    await redis.expire(sessionKey(sessionId), SESSION_TTL_SECONDS).catch(() => {});
    return user;
  } catch {
    return null;
  }
}

export async function deleteSession(sessionId: string | undefined | null): Promise<void> {
  if (!sessionId) return;
  await redis.del(sessionKey(sessionId)).catch(() => {});
}
