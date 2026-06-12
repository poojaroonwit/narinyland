import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { getActiveWorldGuildForUser, getDisplayNameMap, publishWorldUpdate, toWorldGuild } from '@/lib/world-state';
import { awardWorldAchievement } from '@/lib/world-achievements';
import { cleanWorldMapKey } from '@/lib/world-location';

type WorldGuildBody = {
  action?: 'ensure' | 'invite' | 'join' | 'leave';
  guildId?: string;
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

async function ensureGuild(configId: string, userId: string, currentLandId?: string, currentZone?: string) {
  const existing = await prisma.worldGuildMember.findFirst({
    where: {
      userId,
      status: 'active',
      guild: { configId, status: 'active' },
    },
    include: {
      guild: {
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
    if (!currentLandId && !currentZone) return existing.guild;

    const metadata = normalizeMetadata(existing.guild.metadata);
    return prisma.worldGuild.update({
      where: { id: existing.guild.id },
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
  return prisma.worldGuild.create({
    data: {
      configId,
      leaderUserId: userId,
      name: `${leaderName}'s Guild`.slice(0, 80),
      bannerColor: '#047857',
      motto: currentZone ? `Gathering near ${currentZone}`.slice(0, 140) : 'A cozy guild for shared world visits.',
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

async function joinGuildById(configId: string, userId: string, guildId: string, currentLandId?: string, currentZone?: string) {
  const guild = await prisma.worldGuild.findFirst({
    where: {
      id: guildId,
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

  if (!guild) throw Object.assign(new Error('Guild is no longer active'), { status: 404 });

  await prisma.worldGuildMember.updateMany({
    where: {
      userId,
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
    where: { guildId_userId: { guildId: guild.id, userId } },
    create: {
      guildId: guild.id,
      userId,
      role: 'member',
      status: 'active',
    },
    update: {
      status: 'active',
      role: guild.leaderUserId === userId ? 'leader' : 'member',
      joinedAt: new Date(),
    },
  });

  const metadata = normalizeMetadata(guild.metadata);
  return prisma.worldGuild.update({
    where: { id: guild.id },
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
      guild: await getActiveWorldGuildForUser(access.configId, access.userId, { currentLandId }),
    });
  } catch (err: unknown) {
    console.error('GET /api/world-guild error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldGuildBody;
    const action = body.action || 'ensure';
    const currentLandId = cleanWorldMapKey(body.currentLandId);
    const currentZone = cleanOptionalText(body.currentZone, 80);

    if (action === 'leave') {
      const guild = await getActiveWorldGuildForUser(access.configId, access.userId, { currentLandId });
      if (!guild) return NextResponse.json({ guild: null });

      await prisma.worldGuildMember.updateMany({
        where: {
          guildId: guild.id,
          userId: access.userId,
          status: 'active',
        },
        data: { status: 'left' },
      });

      const remainingMembers = await prisma.worldGuildMember.findMany({
        where: { guildId: guild.id, status: 'active' },
        orderBy: { joinedAt: 'asc' },
        select: { userId: true },
      });

      if (remainingMembers.length === 0) {
        await prisma.worldGuild.update({
          where: { id: guild.id },
          data: { status: 'disbanded' },
        });
      } else if (guild.leaderUserId === access.userId) {
        const nextLeader = remainingMembers[0].userId;
        await prisma.$transaction([
          prisma.worldGuild.update({
            where: { id: guild.id },
            data: { leaderUserId: nextLeader },
          }),
          prisma.worldGuildMember.updateMany({
            where: { guildId: guild.id, userId: nextLeader },
            data: { role: 'leader' },
          }),
        ]);
      }
      await publishWorldUpdate(access.configId, 'guild', {
        userId: access.userId,
        currentLandId,
        guildId: guild.id,
        action: 'leave',
      });

      return NextResponse.json({
        guild: await getActiveWorldGuildForUser(access.configId, access.userId, { currentLandId }),
      });
    }

    if (action === 'join') {
      const guildId = cleanOptionalText(body.guildId, 120);
      if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

      const guild = await joinGuildById(access.configId, access.userId, guildId, currentLandId, currentZone);
      await awardWorldAchievement(access.configId, access.userId, 'guild_keeper', {
        guildId: guild.id,
        joinedFrom: 'avatar_activity',
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
      });
      await publishWorldUpdate(access.configId, 'guild', {
        userId: access.userId,
        currentLandId,
        guildId: guild.id,
        action: 'join',
      });

      return NextResponse.json({ guild: await toWorldGuild(guild) });
    }

    const guild = await ensureGuild(access.configId, access.userId, currentLandId, currentZone);
    await awardWorldAchievement(access.configId, access.userId, 'guild_keeper', {
      guildId: guild.id,
      ...(currentLandId ? { currentLandId } : {}),
      ...(currentZone ? { currentZone } : {}),
    });

    if (action === 'invite') {
      const targetUserId = cleanOptionalText(body.targetUserId, 120);
      if (!targetUserId) return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
      if (targetUserId === access.userId) return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });

      const isValidTarget = await targetBelongsToConfig(access.configId, targetUserId);
      if (!isValidTarget) return NextResponse.json({ error: 'Target is not in this world' }, { status: 404 });

      await prisma.worldGuildMember.updateMany({
        where: {
          userId: targetUserId,
          status: 'active',
          guild: {
            configId: access.configId,
            status: 'active',
            id: { not: guild.id },
          },
        },
        data: { status: 'left' },
      });

      await prisma.worldGuildMember.upsert({
        where: { guildId_userId: { guildId: guild.id, userId: targetUserId } },
        create: {
          guildId: guild.id,
          userId: targetUserId,
          role: 'member',
          status: 'active',
        },
        update: {
          status: 'active',
          role: 'member',
        },
      });
      await awardWorldAchievement(access.configId, targetUserId, 'guild_keeper', {
        guildId: guild.id,
        invitedBy: access.userId,
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
      });
    }

    const refreshed = await prisma.worldGuild.findUniqueOrThrow({
      where: { id: guild.id },
      include: {
        members: {
          where: { status: 'active' },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    await publishWorldUpdate(access.configId, 'guild', {
      userId: access.userId,
      currentLandId,
      guildId: guild.id,
      action,
    });

    return NextResponse.json({ guild: await toWorldGuild(refreshed) });
  } catch (err: unknown) {
    console.error('POST /api/world-guild error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: getErrorStatus(err) });
  }
}
