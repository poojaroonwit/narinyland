import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { filterWorldPresencesByInterest, getDisplayNameMap, getWorldActions, getWorldPresences, publishWorldUpdate, toWorldSocialAction } from '@/lib/world-state';
import { awardWorldAchievement } from '@/lib/world-achievements';
import { cleanWorldMapKey } from '@/lib/world-location';
import type { WorldActionType } from '@/types';

type WorldActionBody = {
  type?: string;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

const ACTION_META: Record<WorldActionType, { label: string; status: string; requiresTarget: boolean }> = {
  view_profile: { label: 'viewed profile', status: 'opened', requiresTarget: true },
  start_chat: { label: 'started chat', status: 'requested', requiresTarget: true },
  voice_call: { label: 'requested voice call', status: 'requested', requiresTarget: true },
  follow_user: { label: 'followed user', status: 'active', requiresTarget: true },
  add_friend: { label: 'sent friend request', status: 'requested', requiresTarget: true },
  invite_party: { label: 'invited to party', status: 'requested', requiresTarget: true },
  invite_guild: { label: 'invited to guild', status: 'requested', requiresTarget: true },
  trade: { label: 'requested trade', status: 'requested', requiresTarget: true },
  collaborate: { label: 'requested collaboration', status: 'requested', requiresTarget: true },
  activity_feed: { label: 'opened activity feed', status: 'opened', requiresTarget: true },
  join_activity: { label: 'joined activity', status: 'requested', requiresTarget: true },
  npc_interact: { label: 'spoke with NPC', status: 'opened', requiresTarget: false },
};

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeActionType(value: unknown): WorldActionType | null {
  if (typeof value !== 'string') return null;
  return value in ACTION_META ? value as WorldActionType : null;
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
    const parsedLimit = Number(searchParams.get('limit') || '12');
    const limit = Number.isFinite(parsedLimit) ? Math.min(40, Math.max(1, parsedLimit)) : 12;
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
      actions: await getWorldActions(access.configId, limit, {
        currentLandId,
        currentZone,
        center,
        radius,
        viewerUserId: access.userId,
        visibleUserIds,
      }),
    });
  } catch (err: unknown) {
    console.error('GET /api/world-actions error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldActionBody;
    const type = normalizeActionType(body.type);
    if (!type) return NextResponse.json({ error: 'Unsupported world action type' }, { status: 400 });

    const meta = ACTION_META[type];
    const targetUserId = cleanOptionalText(body.targetUserId, 120);
    if (meta.requiresTarget && !targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }
    if (targetUserId === access.userId) {
      return NextResponse.json({ error: 'Cannot target yourself' }, { status: 400 });
    }

    if (targetUserId) {
      const isValidTarget = await targetBelongsToConfig(access.configId, targetUserId);
      if (!isValidTarget) return NextResponse.json({ error: 'Target is not in this world' }, { status: 404 });
    }

    const currentLandId = cleanWorldMapKey(body.currentLandId);
    const currentZone = cleanOptionalText(body.currentZone, 80);
    const message = cleanOptionalText(body.message, 220);
    const metadata = {
      ...normalizeMetadata(body.metadata),
      ...(currentLandId ? { currentLandId } : {}),
      ...(currentZone ? { currentZone } : {}),
      targetName: cleanText(body.targetName, 'Explorer', 80),
      actionLabel: meta.label,
    };

    const action = await prisma.worldSocialAction.create({
      data: {
        configId: access.configId,
        fromUserId: access.userId,
        toUserId: targetUserId,
        type,
        status: meta.status,
        message,
        metadata: toInputJson(metadata),
      },
    });
    if (type === 'npc_interact') {
      await awardWorldAchievement(access.configId, access.userId, 'npc_friend', metadata);
    } else if (targetUserId) {
      await awardWorldAchievement(access.configId, access.userId, 'social_spark', metadata);
    }
    await publishWorldUpdate(access.configId, 'action', {
      userId: access.userId,
      currentLandId,
      actionId: action.id,
      actionType: type,
      targetUserId,
    });

    const names = await getDisplayNameMap(access.configId, [action.fromUserId, action.toUserId || '']);
    return NextResponse.json({ action: toWorldSocialAction(action, names) }, { status: 201 });
  } catch (err: unknown) {
    console.error('POST /api/world-actions error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
