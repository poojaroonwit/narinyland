import type { Prisma, PrismaClient, WorldAchievement as PrismaWorldAchievement } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { WorldAchievement, WorldAchievementBadge, WorldAchievementRarity } from '@/types';

type AchievementClient = PrismaClient | Prisma.TransactionClient;

type AchievementDefinition = {
  achievementKey: string;
  name: string;
  description: string;
  icon: string;
  rarity: WorldAchievementRarity;
  titleReward: string;
};

export const WORLD_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    achievementKey: 'world_arrival',
    name: 'World Arrival',
    description: 'Spawned into the shared 3D world.',
    icon: 'fa-route',
    rarity: 'common',
    titleReward: 'World Explorer',
  },
  {
    achievementKey: 'first_chat',
    name: 'First Hello',
    description: 'Sent a message through world chat.',
    icon: 'fa-comment-dots',
    rarity: 'common',
    titleReward: 'Warm Voice',
  },
  {
    achievementKey: 'social_spark',
    name: 'Social Spark',
    description: 'Interacted with another live avatar.',
    icon: 'fa-handshake-angle',
    rarity: 'common',
    titleReward: 'Kind Neighbor',
  },
  {
    achievementKey: 'npc_friend',
    name: 'Town Friend',
    description: 'Spoke with an in-world district NPC.',
    icon: 'fa-store',
    rarity: 'common',
    titleReward: 'Town Friend',
  },
  {
    achievementKey: 'event_guest',
    name: 'Event Guest',
    description: 'Joined a shared world event.',
    icon: 'fa-star',
    rarity: 'rare',
    titleReward: 'Event Guest',
  },
  {
    achievementKey: 'party_companion',
    name: 'Party Companion',
    description: 'Created or joined a world party.',
    icon: 'fa-users',
    rarity: 'rare',
    titleReward: 'Party Companion',
  },
  {
    achievementKey: 'guild_keeper',
    name: 'Guild Keeper',
    description: 'Created or joined a guild hall group.',
    icon: 'fa-shield-heart',
    rarity: 'rare',
    titleReward: 'Guild Keeper',
  },
  {
    achievementKey: 'market_regular',
    name: 'Market Regular',
    description: 'Claimed equipment from Mira\'s Market.',
    icon: 'fa-store',
    rarity: 'keepsake',
    titleReward: 'Market Regular',
  },
  {
    achievementKey: 'trusted_trader',
    name: 'Trusted Trader',
    description: 'Completed a secure item exchange with another avatar.',
    icon: 'fa-people-arrows',
    rarity: 'keepsake',
    titleReward: 'Trusted Trader',
  },
];

const ACHIEVEMENT_BY_KEY = new Map(WORLD_ACHIEVEMENTS.map(achievement => [achievement.achievementKey, achievement]));

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

export function cleanWorldAchievementRarity(value: string): WorldAchievementRarity {
  return ['common', 'rare', 'keepsake'].includes(value) ? value as WorldAchievementRarity : 'common';
}

export function getWorldAchievementDefinition(achievementKey: string) {
  return ACHIEVEMENT_BY_KEY.get(achievementKey);
}

export function toWorldAchievement(
  achievement: PrismaWorldAchievement,
  equippedTitle = ''
): WorldAchievement {
  return {
    id: achievement.id,
    configId: achievement.configId,
    userId: achievement.userId,
    achievementKey: achievement.achievementKey,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    rarity: cleanWorldAchievementRarity(achievement.rarity),
    titleReward: achievement.titleReward,
    isTitleEquipped: Boolean(achievement.titleReward && achievement.titleReward === equippedTitle),
    metadata: normalizeMetadata(achievement.metadata),
    earnedAt: achievement.earnedAt.toISOString(),
    updatedAt: achievement.updatedAt.toISOString(),
  };
}

export function toWorldAchievementBadge(achievement: WorldAchievement): WorldAchievementBadge {
  return {
    achievementKey: achievement.achievementKey,
    name: achievement.name,
    icon: achievement.icon,
    rarity: achievement.rarity,
    titleReward: achievement.titleReward,
  };
}

export async function awardWorldAchievement(
  configId: string,
  userId: string,
  achievementKey: string,
  metadata: Record<string, unknown> = {},
  client: AchievementClient = prisma
) {
  const definition = getWorldAchievementDefinition(achievementKey);
  if (!definition) return null;

  return client.worldAchievement.upsert({
    where: {
      configId_userId_achievementKey: {
        configId,
        userId,
        achievementKey,
      },
    },
    create: {
      configId,
      userId,
      achievementKey,
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      rarity: definition.rarity,
      titleReward: definition.titleReward,
      metadata: toInputJson(normalizeMetadata(metadata)),
    },
    update: {
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      rarity: definition.rarity,
      titleReward: definition.titleReward,
      metadata: toInputJson(normalizeMetadata(metadata)),
    },
  });
}

export async function getWorldAchievements(configId: string, userId: string, equippedTitle = '') {
  const achievements = await prisma.worldAchievement.findMany({
    where: { configId, userId },
    orderBy: [
      { earnedAt: 'desc' },
      { name: 'asc' },
    ],
  });
  return achievements.map(achievement => toWorldAchievement(achievement, equippedTitle));
}
