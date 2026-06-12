import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { getDisplayNameMap, getWorldRequestsForUser, publishWorldUpdate, toWorldSocialAction } from '@/lib/world-state';
import { awardWorldAchievement } from '@/lib/world-achievements';
import { cleanWorldMapKey } from '@/lib/world-location';
import type { WorldActionType } from '@/types';

type WorldRequestBody = {
  actionId?: string;
  response?: 'accept' | 'decline' | 'complete' | 'cancel' | 'ready' | 'unready';
  currentLandId?: string;
  currentZone?: string;
};

const REQUEST_TYPES = new Set<WorldActionType>(['voice_call', 'invite_party', 'invite_guild', 'trade', 'collaborate']);

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeMetadata(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => key.length <= 48 && ['string', 'number', 'boolean'].includes(typeof entry))
      .slice(0, 20)
  );
}

function toInputJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeResponse(value: unknown): WorldRequestBody['response'] | null {
  return value === 'accept' ||
    value === 'decline' ||
    value === 'complete' ||
    value === 'cancel' ||
    value === 'ready' ||
    value === 'unready'
    ? value
    : null;
}

async function acceptPartyInvite(
  configId: string,
  request: { fromUserId: string; toUserId: string | null; metadata: Prisma.JsonValue },
  currentLandId?: string,
  currentZone?: string
) {
  if (!request.toUserId) throw new Error('Party invite has no recipient');

  const metadata = normalizeMetadata(request.metadata);
  const partyId = getMetadataString(metadata, 'partyId');
  const party = partyId
    ? await prisma.worldParty.findFirst({
      where: { id: partyId, configId, status: 'active' },
      select: { id: true },
    })
    : await prisma.worldParty.findFirst({
      where: {
        configId,
        status: 'active',
        members: { some: { userId: request.fromUserId, status: 'active' } },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

  if (!party) throw new Error('Party invite is no longer active');

  await prisma.worldPartyMember.upsert({
    where: { partyId_userId: { partyId: party.id, userId: request.toUserId } },
    create: {
      partyId: party.id,
      userId: request.toUserId,
      role: 'member',
      status: 'active',
    },
    update: {
      role: 'member',
      status: 'active',
    },
  });

  await awardWorldAchievement(configId, request.toUserId, 'party_companion', {
    partyId: party.id,
    invitedBy: request.fromUserId,
    ...(currentLandId ? { currentLandId } : {}),
    ...(currentZone ? { currentZone } : {}),
  });

  await publishWorldUpdate(configId, 'party', {
    userId: request.toUserId,
    currentLandId,
    partyId: party.id,
    action: 'accept_invite',
  });
}

async function acceptGuildInvite(
  configId: string,
  request: { fromUserId: string; toUserId: string | null; metadata: Prisma.JsonValue },
  currentLandId?: string,
  currentZone?: string
) {
  if (!request.toUserId) throw new Error('Guild invite has no recipient');

  const metadata = normalizeMetadata(request.metadata);
  const guildId = getMetadataString(metadata, 'guildId');
  const guild = guildId
    ? await prisma.worldGuild.findFirst({
      where: { id: guildId, configId, status: 'active' },
      select: { id: true },
    })
    : await prisma.worldGuild.findFirst({
      where: {
        configId,
        status: 'active',
        members: { some: { userId: request.fromUserId, status: 'active' } },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

  if (!guild) throw new Error('Guild invite is no longer active');

  await prisma.worldGuildMember.updateMany({
    where: {
      userId: request.toUserId,
      status: 'active',
      guild: {
        configId,
        status: 'active',
        id: { not: guild.id },
      },
    },
    data: { status: 'left' },
  });

  await prisma.worldGuildMember.upsert({
    where: { guildId_userId: { guildId: guild.id, userId: request.toUserId } },
    create: {
      guildId: guild.id,
      userId: request.toUserId,
      role: 'member',
      status: 'active',
    },
    update: {
      role: 'member',
      status: 'active',
    },
  });

  await awardWorldAchievement(configId, request.toUserId, 'guild_keeper', {
    guildId: guild.id,
    invitedBy: request.fromUserId,
    ...(currentLandId ? { currentLandId } : {}),
    ...(currentZone ? { currentZone } : {}),
  });

  await publishWorldUpdate(configId, 'guild', {
    userId: request.toUserId,
    currentLandId,
    guildId: guild.id,
    action: 'accept_invite',
  });
}

async function getWorldRequests(configId: string, userId: string, limit = 24, currentLandId?: string) {
  return getWorldRequestsForUser(configId, userId, limit, { currentLandId });
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const parsedLimit = Number(searchParams.get('limit') || '24');
    const limit = Number.isFinite(parsedLimit) ? Math.min(40, Math.max(1, parsedLimit)) : 24;
    const currentLandId = cleanWorldMapKey(searchParams.get('currentLandId'));

    return NextResponse.json({ requests: await getWorldRequests(access.configId, access.userId, limit, currentLandId) });
  } catch (err: unknown) {
    console.error('GET /api/world-requests error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldRequestBody;
    const actionId = cleanOptionalText(body.actionId, 120);
    const response = normalizeResponse(body.response);
    if (!actionId) return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
    if (!response) return NextResponse.json({ error: 'Unsupported request response' }, { status: 400 });

    const requestRecord = await prisma.worldSocialAction.findFirst({
      where: {
        id: actionId,
        configId: access.configId,
        type: { in: Array.from(REQUEST_TYPES) },
      },
    });
    if (!requestRecord) return NextResponse.json({ error: 'World request not found' }, { status: 404 });

    const isRecipient = requestRecord.toUserId === access.userId;
    const isSender = requestRecord.fromUserId === access.userId;
    if ((response === 'accept' || response === 'decline') && !isRecipient) {
      return NextResponse.json({ error: 'Only the recipient can answer this request' }, { status: 403 });
    }
    if (response === 'cancel' && !isSender) {
      return NextResponse.json({ error: 'Only the sender can cancel this request' }, { status: 403 });
    }
    if (response === 'complete' && !isSender && !isRecipient) {
      return NextResponse.json({ error: 'Only participants can complete this request' }, { status: 403 });
    }
    if ((response === 'ready' || response === 'unready') && (!isSender && !isRecipient)) {
      return NextResponse.json({ error: 'Only participants can update readiness' }, { status: 403 });
    }
    if ((response === 'ready' || response === 'unready') && (requestRecord.type !== 'trade' && requestRecord.type !== 'collaborate')) {
      return NextResponse.json({ error: 'Readiness is only available for trade and collaboration sessions' }, { status: 400 });
    }
    if ((response === 'ready' || response === 'unready') && requestRecord.status !== 'accepted') {
      return NextResponse.json({ error: 'Session must be active before updating readiness' }, { status: 400 });
    }

    const existingMetadata = normalizeMetadata(requestRecord.metadata);
    if (
      response === 'complete' &&
      (requestRecord.type === 'trade' || requestRecord.type === 'collaborate') &&
      (existingMetadata.senderReady !== true || existingMetadata.recipientReady !== true)
    ) {
      return NextResponse.json({ error: 'Both participants must be ready before completing this session' }, { status: 409 });
    }

    const currentLandId = cleanWorldMapKey(body.currentLandId);
    const currentZone = cleanOptionalText(body.currentZone, 80);
    if (response === 'accept' && requestRecord.type === 'invite_party') {
      await acceptPartyInvite(access.configId, requestRecord, currentLandId, currentZone);
    }
    if (response === 'accept' && requestRecord.type === 'invite_guild') {
      await acceptGuildInvite(access.configId, requestRecord, currentLandId, currentZone);
    }

    const readinessKey = isSender ? 'senderReady' : 'recipientReady';
    const sessionLandId = currentLandId ||
      getMetadataString(existingMetadata, 'sessionLandId') ||
      getMetadataString(existingMetadata, 'currentLandId') ||
      getMetadataString(existingMetadata, 'targetLandId');
    const metadata = {
      ...existingMetadata,
      ...(currentLandId ? { responseLandId: currentLandId } : {}),
      ...(currentZone ? { responseZone: currentZone } : {}),
      respondedBy: access.userId,
      respondedAt: new Date().toISOString(),
      ...(response === 'accept' && requestRecord.type === 'voice_call' ? { voiceRoomId: `world-voice-${requestRecord.id}` } : {}),
      ...(response === 'accept' && requestRecord.type === 'invite_party' ? { inviteAcceptedAt: new Date().toISOString() } : {}),
      ...(response === 'accept' && requestRecord.type === 'invite_guild' ? { inviteAcceptedAt: new Date().toISOString() } : {}),
      ...(response === 'accept' && (requestRecord.type === 'trade' || requestRecord.type === 'collaborate') ? {
        sessionKind: requestRecord.type,
        ...(sessionLandId ? { sessionLandId } : {}),
        sessionStartedAt: new Date().toISOString(),
        sessionZone: currentZone || existingMetadata.currentZone || '',
        senderReady: false,
        recipientReady: false,
      } : {}),
      ...((response === 'ready' || response === 'unready') ? {
        [readinessKey]: response === 'ready',
        ...(currentLandId ? { sessionReadyLandId: currentLandId } : {}),
        sessionReadyUpdatedBy: access.userId,
        sessionReadyUpdatedAt: new Date().toISOString(),
      } : {}),
      ...(response === 'complete' && (requestRecord.type === 'trade' || requestRecord.type === 'collaborate') ? {
        ...(currentLandId ? { sessionCompletedLandId: currentLandId } : {}),
        sessionCompletedAt: new Date().toISOString(),
      } : {}),
    };
    const status = response === 'accept'
      ? (requestRecord.type === 'invite_party' || requestRecord.type === 'invite_guild' ? 'completed' : 'accepted')
      : response === 'decline'
        ? 'declined'
        : response === 'complete'
          ? 'completed'
          : response === 'cancel'
            ? 'canceled'
            : requestRecord.status;

    const updated = await prisma.worldSocialAction.update({
      where: { id: requestRecord.id },
      data: {
        status,
        metadata: toInputJson(metadata),
      },
    });
    await publishWorldUpdate(access.configId, 'request', {
      userId: access.userId,
      currentLandId,
      actionId: updated.id,
      requestType: updated.type,
      status,
    });
    const names = await getDisplayNameMap(access.configId, [updated.fromUserId, updated.toUserId || '']);

    return NextResponse.json({
      request: toWorldSocialAction(updated, names),
      requests: await getWorldRequests(access.configId, access.userId, 24, currentLandId),
    });
  } catch (err: unknown) {
    console.error('POST /api/world-requests error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
