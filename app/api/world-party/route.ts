import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { getActiveWorldPartyForUser, getDisplayNameMap, publishWorldUpdate, toWorldParty } from '@/lib/world-state';
import { awardWorldAchievement } from '@/lib/world-achievements';
import { cleanWorldMapKey } from '@/lib/world-location';

type WorldPartyBody = {
  action?: 'ensure' | 'invite' | 'join' | 'leave';
  partyId?: string;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
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

function getErrorStatus(err: unknown) {
  if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') {
    return Math.min(599, Math.max(400, err.status));
  }

  return 500;
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

async function ensureParty(configId: string, userId: string, currentLandId?: string, currentZone?: string) {
  const existing = await prisma.worldPartyMember.findFirst({
    where: {
      userId,
      status: 'active',
      party: { configId, status: 'active' },
    },
    include: {
      party: {
        include: {
          members: {
            where: { status: 'active' },
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  if (existing) {
    if (!currentLandId && !currentZone) return existing.party;

    const metadata = normalizeMetadata(existing.party.metadata);
    return prisma.worldParty.update({
      where: { id: existing.party.id },
      data: {
        metadata: toInputJson({
          ...metadata,
          ...(currentLandId ? { currentLandId } : {}),
          ...(currentZone ? { currentZone } : {}),
          lastGatheredAt: new Date().toISOString(),
        }),
      },
      include: {
        members: {
          where: { status: 'active' },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
  }

  const names = await getDisplayNameMap(configId, [userId]);
  const leaderName = names.get(userId) || 'Explorer';
  return prisma.worldParty.create({
    data: {
      configId,
      leaderUserId: userId,
      name: `${leaderName}'s Party`.slice(0, 80),
      metadata: toInputJson({
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
        createdFrom: 'world',
      }),
      members: {
        create: {
          userId,
          role: 'leader',
          status: 'active',
        },
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

async function joinPartyById(configId: string, userId: string, partyId: string, currentLandId?: string, currentZone?: string) {
  const party = await prisma.worldParty.findFirst({
    where: {
      id: partyId,
      configId,
      status: 'active',
    },
    include: {
      members: {
        where: { status: 'active' },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!party) throw Object.assign(new Error('Party is no longer active'), { status: 404 });

  await prisma.worldPartyMember.updateMany({
    where: {
      userId,
      status: 'active',
      party: {
        configId,
        status: 'active',
        id: { not: party.id },
      },
    },
    data: { status: 'left' },
  });

  await prisma.worldPartyMember.upsert({
    where: { partyId_userId: { partyId: party.id, userId } },
    create: {
      partyId: party.id,
      userId,
      role: 'member',
      status: 'active',
    },
    update: {
      status: 'active',
      role: party.leaderUserId === userId ? 'leader' : 'member',
      joinedAt: new Date(),
    },
  });

  const metadata = normalizeMetadata(party.metadata);
  return prisma.worldParty.update({
    where: { id: party.id },
    data: {
      metadata: toInputJson({
        ...metadata,
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
        lastGatheredAt: new Date().toISOString(),
        lastJoinedByUserId: userId,
      }),
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
    const currentLandId = cleanWorldMapKey(searchParams.get('currentLandId'));
    return NextResponse.json({
      party: await getActiveWorldPartyForUser(access.configId, access.userId, { currentLandId }),
    });
  } catch (err: unknown) {
    console.error('GET /api/world-party error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldPartyBody;
    const action = body.action || 'ensure';
    const currentLandId = cleanWorldMapKey(body.currentLandId);
    const currentZone = cleanOptionalText(body.currentZone, 80);

    if (action === 'leave') {
      const party = await getActiveWorldPartyForUser(access.configId, access.userId, { currentLandId });
      if (!party) return NextResponse.json({ party: null });

      await prisma.worldPartyMember.updateMany({
        where: {
          partyId: party.id,
          userId: access.userId,
          status: 'active',
        },
        data: { status: 'left' },
      });

      const remaining = await prisma.worldPartyMember.count({
        where: { partyId: party.id, status: 'active' },
      });
      if (remaining === 0) {
        await prisma.worldParty.update({
          where: { id: party.id },
          data: { status: 'disbanded' },
        });
      }
      await publishWorldUpdate(access.configId, 'party', {
        userId: access.userId,
        currentLandId,
        partyId: party.id,
        action: 'leave',
      });

      return NextResponse.json({
        party: await getActiveWorldPartyForUser(access.configId, access.userId, { currentLandId }),
      });
    }

    if (action === 'join') {
      const partyId = cleanOptionalText(body.partyId, 120);
      if (!partyId) return NextResponse.json({ error: 'partyId is required' }, { status: 400 });

      const party = await joinPartyById(access.configId, access.userId, partyId, currentLandId, currentZone);
      await awardWorldAchievement(access.configId, access.userId, 'party_companion', {
        partyId: party.id,
        joinedFrom: 'avatar_activity',
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
      });
      await publishWorldUpdate(access.configId, 'party', {
        userId: access.userId,
        currentLandId,
        partyId: party.id,
        action: 'join',
      });

      return NextResponse.json({ party: await toWorldParty(party) });
    }

    const party = await ensureParty(access.configId, access.userId, currentLandId, currentZone);
    await awardWorldAchievement(access.configId, access.userId, 'party_companion', {
      partyId: party.id,
      ...(currentLandId ? { currentLandId } : {}),
      ...(currentZone ? { currentZone } : {}),
    });

    if (action === 'invite') {
      const targetUserId = cleanOptionalText(body.targetUserId, 120);
      if (!targetUserId) return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      if (targetUserId === access.userId) return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });

      const isValidTarget = await targetBelongsToConfig(access.configId, targetUserId);
      if (!isValidTarget) return NextResponse.json({ error: 'Target is not in this world' }, { status: 404 });

      await prisma.worldPartyMember.upsert({
        where: { partyId_userId: { partyId: party.id, userId: targetUserId } },
        create: {
          partyId: party.id,
          userId: targetUserId,
          role: 'member',
          status: 'active',
        },
        update: {
          status: 'active',
          role: 'member',
        },
      });
      await awardWorldAchievement(access.configId, targetUserId, 'party_companion', {
        partyId: party.id,
        invitedBy: access.userId,
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
      });
    }

    const refreshed = await prisma.worldParty.findUniqueOrThrow({
      where: { id: party.id },
      include: {
        members: {
          where: { status: 'active' },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    await publishWorldUpdate(access.configId, 'party', {
      userId: access.userId,
      currentLandId,
      partyId: party.id,
      action,
    });

    return NextResponse.json({ party: await toWorldParty(refreshed) });
  } catch (err: unknown) {
    console.error('POST /api/world-party error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: getErrorStatus(err) });
  }
}
