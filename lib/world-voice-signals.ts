import { redis } from '@/lib/redis';
import type { WorldVoiceSignalMessage } from '@/types';

export const WORLD_VOICE_SIGNAL_TTL_SECONDS = 45;
export const WORLD_VOICE_SIGNAL_TTL_MS = WORLD_VOICE_SIGNAL_TTL_SECONDS * 1000;

export const worldVoiceSignalIndexKey = (configId: string, roomId: string, userId: string) =>
  `world-voice:${configId}:${roomId}:signal:${userId}:index`;

export const worldVoiceSignalMessageKey = (configId: string, roomId: string, messageId: string) =>
  `world-voice:${configId}:${roomId}:signal:${messageId}`;

function parseWorldVoiceSignalRecord(record: string | null, configId: string, roomId: string, userId: string) {
  if (!record) return null;
  try {
    const signal = JSON.parse(record) as WorldVoiceSignalMessage;
    if (signal.configId !== configId || signal.roomId !== roomId || signal.toUserId !== userId) return null;
    return signal;
  } catch {
    return null;
  }
}

export async function getWorldVoiceSignalsForUser(
  configId: string,
  roomId: string,
  userId: string,
  since = 0,
  limit = 40
) {
  const now = Date.now();
  const safeSince = Number.isFinite(since) ? Math.max(0, since) : 0;
  const safeLimit = Math.min(80, Math.max(1, limit));
  const indexKey = worldVoiceSignalIndexKey(configId, roomId, userId);
  await redis.zremrangebyscore(indexKey, 0, now - WORLD_VOICE_SIGNAL_TTL_MS);

  const keys = (await redis.zrangebyscore(indexKey, safeSince + 1, now)).slice(-safeLimit);
  const records = keys.length > 0 ? await redis.mget(...keys) : [];
  const signals = records
    .map(record => parseWorldVoiceSignalRecord(record, configId, roomId, userId))
    .filter((signal): signal is WorldVoiceSignalMessage => Boolean(signal));

  return { signals, cursor: now };
}
