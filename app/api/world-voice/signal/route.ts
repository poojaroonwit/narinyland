import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { redis } from '@/lib/redis';
import { getDisplayNameMap, publishWorldUpdate } from '@/lib/world-state';
import { getWorldVoiceSignalsForUser, WORLD_VOICE_SIGNAL_TTL_MS, WORLD_VOICE_SIGNAL_TTL_SECONDS, worldVoiceSignalIndexKey, worldVoiceSignalMessageKey } from '@/lib/world-voice-signals';
import type { WorldVoiceSignalKind, WorldVoiceSignalMessage } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SignalBody = {
  roomId?: string;
  toUserId?: string;
  kind?: string;
  payload?: unknown;
};

const SIGNAL_KINDS = new Set<WorldVoiceSignalKind>(['offer', 'answer', 'ice', 'renegotiate', 'leave']);

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function parseLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(1, parsed)) : fallback;
}

function parseSince(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeKind(value: unknown): WorldVoiceSignalKind {
  return typeof value === 'string' && SIGNAL_KINDS.has(value as WorldVoiceSignalKind)
    ? value as WorldVoiceSignalKind
    : 'renegotiate';
}

function normalizePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const serialized = JSON.stringify(value);
  if (serialized.length > 32000) {
    throw Object.assign(new Error('Voice signal payload is too large'), { status: 413 });
  }
  return JSON.parse(serialized) as Record<string, unknown>;
}

async function getActiveRoom(configId: string, roomId: string, userId: string) {
  return prisma.worldVoiceRoom.findFirst({
    where: {
      id: roomId,
      configId,
      status: 'active',
      members: {
        some: { userId, status: 'active' },
      },
    },
    include: {
      members: {
        where: { status: 'active' },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const roomId = cleanOptionalText(searchParams.get('roomId'), 120);
    if (!roomId) return NextResponse.json({ error: 'roomId is required' }, { status: 400 });

    const room = await getActiveRoom(access.configId, roomId, access.userId);
    if (!room) return NextResponse.json({ error: 'Voice room not found' }, { status: 404 });

    const since = parseSince(searchParams.get('since'));
    const limit = parseLimit(searchParams.get('limit'), 40, 80);
    return NextResponse.json(await getWorldVoiceSignalsForUser(access.configId, roomId, access.userId, since, limit));
  } catch (err: unknown) {
    console.error('GET /api/world-voice/signal error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as SignalBody;
    const roomId = cleanOptionalText(body.roomId, 120);
    if (!roomId) return NextResponse.json({ error: 'roomId is required' }, { status: 400 });

    const room = await getActiveRoom(access.configId, roomId, access.userId);
    if (!room) return NextResponse.json({ error: 'Voice room not found' }, { status: 404 });

    const kind = normalizeKind(body.kind);
    const payload = normalizePayload(body.payload);
    const targetUserId = cleanOptionalText(body.toUserId, 120);
    const recipients = room.members
      .filter(member => member.userId !== access.userId)
      .filter(member => !targetUserId || member.userId === targetUserId);

    if (targetUserId && recipients.length === 0) {
      return NextResponse.json({ error: 'Target is not active in this voice room' }, { status: 404 });
    }

    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    const names = await getDisplayNameMap(access.configId, [access.userId]);
    const fromName = names.get(access.userId) || 'Explorer';
    const signals = recipients.map((recipient) => ({
      id: randomUUID(),
      configId: access.configId,
      roomId,
      fromUserId: access.userId,
      fromName,
      toUserId: recipient.userId,
      kind,
      payload,
      createdAt,
    } satisfies WorldVoiceSignalMessage));

    await Promise.all(signals.flatMap((signal) => {
      const messageKey = worldVoiceSignalMessageKey(access.configId, roomId, signal.id);
      const indexKey = worldVoiceSignalIndexKey(access.configId, roomId, signal.toUserId);
      return [
        redis.setex(messageKey, WORLD_VOICE_SIGNAL_TTL_SECONDS, JSON.stringify(signal)),
        redis.zadd(indexKey, now, messageKey),
        redis.zremrangebyscore(indexKey, 0, now - WORLD_VOICE_SIGNAL_TTL_MS),
      ];
    }));

    await publishWorldUpdate(access.configId, 'voice', {
      userId: access.userId,
      roomId,
      action: 'signal',
      kind,
      count: signals.length,
    });

    return NextResponse.json({ success: true, count: signals.length, cursor: now });
  } catch (err: unknown) {
    console.error('POST /api/world-voice/signal error:', err);
    const status = typeof err === 'object' && err && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;
    return NextResponse.json({ error: getErrorMessage(err) }, { status });
  }
}
