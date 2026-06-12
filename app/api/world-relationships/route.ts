import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { getDisplayNameMap, getWorldRelationshipsForUser, publishWorldUpdate, toWorldRelationship } from '@/lib/world-state';
import { cleanWorldMapKey } from '@/lib/world-location';
import type { WorldRelationshipType } from '@/types';

type WorldRelationshipBody = {
  action?: 'follow' | 'unfollow' | 'add_friend' | 'remove_friend';
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
  metadata?: Record<string, unknown>;
};

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
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

async function mapOne(configId: string, relationshipId: string) {
  const relationship = await prisma.worldRelationship.findUniqueOrThrow({ where: { id: relationshipId } });
  const names = await getDisplayNameMap(configId, [relationship.fromUserId, relationship.toUserId]);
  return toWorldRelationship(relationship, names);
}

async function upsertRelationship(
  configId: string,
  fromUserId: string,
  toUserId: string,
  type: WorldRelationshipType,
  status: string,
  metadata: Record<string, unknown>
) {
  return prisma.worldRelationship.upsert({
    where: {
      configId_fromUserId_toUserId_type: {
        configId,
        fromUserId,
        toUserId,
        type,
      },
    },
    create: {
      configId,
      fromUserId,
      toUserId,
      type,
      status,
      metadata: toInputJson(metadata),
    },
    update: {
      status,
      metadata: toInputJson(metadata),
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    return NextResponse.json({ relationships: await getWorldRelationshipsForUser(access.configId, access.userId) });
  } catch (err: unknown) {
    console.error('GET /api/world-relationships error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldRelationshipBody;
    const action = body.action || 'follow';
    const targetUserId = cleanOptionalText(body.targetUserId, 120);
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    if (targetUserId === access.userId) return NextResponse.json({ error: 'Cannot target yourself' }, { status: 400 });

    const isValidTarget = await targetBelongsToConfig(access.configId, targetUserId);
    if (!isValidTarget) return NextResponse.json({ error: 'Target is not in this world' }, { status: 404 });

    const currentLandId = cleanWorldMapKey(body.currentLandId);
    const currentZone = cleanOptionalText(body.currentZone, 80);
    const metadata = {
      ...normalizeMetadata(body.metadata),
      ...(currentLandId ? { currentLandId } : {}),
      ...(currentZone ? { currentZone } : {}),
      targetName: cleanOptionalText(body.targetName, 80) || '',
    };

    if (action === 'unfollow') {
      await prisma.worldRelationship.updateMany({
        where: {
          configId: access.configId,
          fromUserId: access.userId,
          toUserId: targetUserId,
          type: 'follow',
          status: 'active',
        },
        data: { status: 'removed' },
      });
      await publishWorldUpdate(access.configId, 'relationship', {
        userId: access.userId,
        currentLandId,
        targetUserId,
        action: 'unfollow',
      });
      return NextResponse.json({ relationships: await getWorldRelationshipsForUser(access.configId, access.userId) });
    }

    if (action === 'remove_friend') {
      await prisma.worldRelationship.updateMany({
        where: {
          configId: access.configId,
          type: 'friend',
          OR: [
            { fromUserId: access.userId, toUserId: targetUserId },
            { fromUserId: targetUserId, toUserId: access.userId },
          ],
        },
        data: { status: 'removed' },
      });
      await publishWorldUpdate(access.configId, 'relationship', {
        userId: access.userId,
        currentLandId,
        targetUserId,
        action: 'remove_friend',
      });
      return NextResponse.json({ relationships: await getWorldRelationshipsForUser(access.configId, access.userId) });
    }

    if (action === 'add_friend') {
      const reciprocal = await prisma.worldRelationship.findUnique({
        where: {
          configId_fromUserId_toUserId_type: {
            configId: access.configId,
            fromUserId: targetUserId,
            toUserId: access.userId,
            type: 'friend',
          },
        },
      });
      const status = reciprocal && reciprocal.status !== 'removed' ? 'accepted' : 'pending';
      const relationship = await upsertRelationship(access.configId, access.userId, targetUserId, 'friend', status, metadata);
      if (reciprocal && reciprocal.status !== 'removed') {
        await prisma.worldRelationship.update({
          where: { id: reciprocal.id },
          data: { status: 'accepted' },
        });
      }

      await publishWorldUpdate(access.configId, 'relationship', {
        userId: access.userId,
        currentLandId,
        targetUserId,
        action: 'add_friend',
        status,
      });
      return NextResponse.json({
        relationship: await mapOne(access.configId, relationship.id),
        relationships: await getWorldRelationshipsForUser(access.configId, access.userId),
      });
    }

    const relationship = await upsertRelationship(access.configId, access.userId, targetUserId, 'follow', 'active', metadata);
    await publishWorldUpdate(access.configId, 'relationship', {
      userId: access.userId,
      currentLandId,
      targetUserId,
      action: 'follow',
    });
    return NextResponse.json({
      relationship: await mapOne(access.configId, relationship.id),
      relationships: await getWorldRelationshipsForUser(access.configId, access.userId),
    });
  } catch (err: unknown) {
    console.error('POST /api/world-relationships error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
