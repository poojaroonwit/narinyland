import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { publishWorldUpdate } from '@/lib/world-state';
import { DEFAULT_WORLD_EQUIPMENT, normalizeWorldEquipment } from '@/lib/world-inventory-catalog';
import { awardWorldAchievement, getWorldAchievements, getWorldAchievementDefinition } from '@/lib/world-achievements';
import type { CharacterAppearance } from '@/types';

type WorldAchievementsBody = {
  action?: 'equip_title';
  achievementKey?: string;
};

const DEFAULT_APPEARANCE: CharacterAppearance = {
  bodyColor: '#b45309',
  trimColor: '#fde68a',
  hairColor: '#3f2b1f',
  skinColor: '#f5d0b6',
};

function toInputJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

async function ensureProfile(configId: string, userId: string) {
  await prisma.appConfig.upsert({
    where: { id: configId },
    create: { id: configId },
    update: {},
  });

  const partner = await prisma.partner.findFirst({
    where: {
      configId,
      OR: [
        { id: userId },
        { userId },
        { partnerId: userId },
      ],
    },
    select: { name: true },
  });

  return prisma.characterProfile.upsert({
    where: { configId_userId: { configId, userId } },
    create: {
      configId,
      userId,
      displayName: partner?.name || 'Explorer',
      appearance: toInputJson(DEFAULT_APPEARANCE),
      equipment: toInputJson(DEFAULT_WORLD_EQUIPMENT),
      cosmetics: toInputJson({}),
    },
    update: {},
  });
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const profile = await ensureProfile(access.configId, access.userId);
    await awardWorldAchievement(access.configId, access.userId, 'world_arrival', { source: 'world_entry' });

    return NextResponse.json({
      title: profile.title,
      equipment: normalizeWorldEquipment(profile.equipment),
      achievements: await getWorldAchievements(access.configId, access.userId, profile.title),
    });
  } catch (err: unknown) {
    console.error('GET /api/world-achievements error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldAchievementsBody;
    if (body.action !== 'equip_title') {
      return NextResponse.json({ error: 'Unsupported achievement action' }, { status: 400 });
    }

    const achievementKey = typeof body.achievementKey === 'string' ? body.achievementKey.trim().slice(0, 80) : '';
    const definition = achievementKey ? getWorldAchievementDefinition(achievementKey) : null;
    if (!definition?.titleReward) {
      return NextResponse.json({ error: 'Achievement title not found' }, { status: 404 });
    }

    const owned = await prisma.worldAchievement.findUnique({
      where: {
        configId_userId_achievementKey: {
          configId: access.configId,
          userId: access.userId,
          achievementKey,
        },
      },
    });
    if (!owned) return NextResponse.json({ error: 'Achievement is not earned yet' }, { status: 403 });

    const profile = await prisma.characterProfile.update({
      where: { configId_userId: { configId: access.configId, userId: access.userId } },
      data: { title: definition.titleReward },
    });
    await publishWorldUpdate(access.configId, 'achievement', {
      userId: access.userId,
      action: 'equip_title',
      achievementKey,
    });

    return NextResponse.json({
      title: profile.title,
      achievements: await getWorldAchievements(access.configId, access.userId, profile.title),
    });
  } catch (err: unknown) {
    console.error('POST /api/world-achievements error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
