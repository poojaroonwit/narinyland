import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { filterWorldPresencesByInterest, getActiveWorldGuildForUser, getActiveWorldPartyForUser, getDisplayNameMap, getWorldChatMessages, getWorldPresences, publishWorldUpdate, toWorldChatMessage } from '@/lib/world-state';
import { awardWorldAchievement } from '@/lib/world-achievements';
import { cleanWorldMapKey } from '@/lib/world-location';
import type { WorldChatChannel } from '@/types';

type WorldChatBody = {
  body?: string;
  channel?: string;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
  metadata?: Record<string, unknown>;
};

const CHANNELS = new Set<WorldChatChannel>(['world', 'direct', 'party', 'guild']);

function cleanBody(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, 360);
}

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeChannel(value: unknown): WorldChatChannel {
  return typeof value === 'string' && CHANNELS.has(value as WorldChatChannel)
    ? value as WorldChatChannel
    : 'world';
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => key.length <= 48 && ['string', 'number', 'boolean'].includes(typeof entry))
      .slice(0, 16)
  );
}

function toInputJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function parseOptionalNumber(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

async function targetBelongsToConfig(configId: string, targetUserId: string) {
  const [profile, partner] = await Promise.all([
    prisma.characterProfile.findUnique({
      where: { configId_userId: { configId, userId: targetUserId } },
      select: { userId: true },
    }),
    prisma.partner.findFirst({
      where: {
        configId,
        OR: [
          { id: targetUserId },
          { userId: targetUserId },
          { partnerId: targetUserId },
        ],
      },
      select: { id: true },
    }),
  ]);

  return Boolean(profile || partner);
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const parsedLimit = Number(searchParams.get('limit') || '18');
    const limit = Number.isFinite(parsedLimit) ? Math.min(40, Math.max(1, parsedLimit)) : 18;
    const currentLandId = cleanWorldMapKey(searchParams.get('currentLandId'));
    const currentZone = searchParams.get('currentZone')?.trim().slice(0, 80) || undefined;
    const x = parseOptionalNumber(searchParams.get('x'), -28, 28);
    const z = parseOptionalNumber(searchParams.get('z'), -28, 28);
    const radius = parseOptionalNumber(searchParams.get('radius'), 4, 64);
    const center = x !== undefined && z !== undefined ? { x, y: 0, z } : undefined;
    const needsSpatialInterest = Boolean(currentLandId || currentZone || center || radius);
    const visibleUserIds = needsSpatialInterest
      ? filterWorldPresencesByInterest(await getWorldPresences(access.configId, 48), {
        currentLandId,
        currentZone,
        center,
        radius,
        viewerUserId: access.userId,
      }).map(presence => presence.userId)
      : undefined;

    return NextResponse.json({
      messages: await getWorldChatMessages(access.configId, limit, access.userId, {
        currentLandId,
        currentZone,
        center,
        radius,
        viewerUserId: access.userId,
        visibleUserIds,
      }),
    });
  } catch (err: unknown) {
    console.error('GET /api/world-chat error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldChatBody;
    const messageBody = cleanBody(body.body);
    if (!messageBody) return NextResponse.json({ error: 'message body is required' }, { status: 400 });

    const channel = normalizeChannel(body.channel);
    const targetUserId = cleanOptionalText(body.targetUserId, 120);
    const messageTargetUserId = channel === 'direct' ? targetUserId : undefined;
    if (channel === 'direct' && !messageTargetUserId) {
      return NextResponse.json({ error: 'targetUserId is required for direct chat' }, { status: 400 });
    }
    if (messageTargetUserId === access.userId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    if (messageTargetUserId) {
      const isValidTarget = await targetBelongsToConfig(access.configId, messageTargetUserId);
      if (!isValidTarget) return NextResponse.json({ error: 'Target is not in this world' }, { status: 404 });
    }

    const currentLandId = cleanWorldMapKey(body.currentLandId);
    const currentZone = cleanOptionalText(body.currentZone, 80);
    const metadata: Record<string, unknown> = {
      ...normalizeMetadata(body.metadata),
      ...(currentLandId ? { currentLandId } : {}),
      ...(currentZone ? { currentZone } : {}),
      targetName: cleanOptionalText(body.targetName, 80) || '',
    };

    if (channel === 'party') {
      const party = await getActiveWorldPartyForUser(access.configId, access.userId, { currentLandId });
      if (!party) return NextResponse.json({ error: 'Join a party before using party chat' }, { status: 403 });
      metadata.partyId = party.id;
      metadata.partyName = party.name;
      delete metadata.guildId;
      delete metadata.guildName;
    }

    if (channel === 'guild') {
      const guild = await getActiveWorldGuildForUser(access.configId, access.userId, { currentLandId });
      if (!guild) return NextResponse.json({ error: 'Join a guild before using guild chat' }, { status: 403 });
      metadata.guildId = guild.id;
      metadata.guildName = guild.name;
      delete metadata.partyId;
      delete metadata.partyName;
    }

    if (channel === 'world') {
      delete metadata.partyId;
      delete metadata.partyName;
      delete metadata.guildId;
      delete metadata.guildName;
    }
    if (channel === 'direct') {
      delete metadata.partyId;
      delete metadata.partyName;
      delete metadata.guildId;
      delete metadata.guildName;
    }

    const message = await prisma.worldChatMessage.create({
      data: {
        configId: access.configId,
        fromUserId: access.userId,
        toUserId: messageTargetUserId,
        channel,
        body: messageBody,
        metadata: toInputJson(metadata),
      },
    });
    await awardWorldAchievement(access.configId, access.userId, 'first_chat', {
      channel,
      ...(currentLandId ? { currentLandId } : {}),
      ...(currentZone ? { currentZone } : {}),
    });
    await publishWorldUpdate(access.configId, 'chat', {
      userId: access.userId,
      currentLandId,
      channel,
      messageId: message.id,
      targetUserId: messageTargetUserId,
    });

    const names = await getDisplayNameMap(access.configId, [message.fromUserId, message.toUserId || '']);
    return NextResponse.json({ message: toWorldChatMessage(message, names) }, { status: 201 });
  } catch (err: unknown) {
    console.error('POST /api/world-chat error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
