import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type WorldInventoryItem as PrismaWorldInventoryItem } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { getStats } from '@/lib/stats-service';
import { redis } from '@/lib/redis';
import { publishWorldUpdate } from '@/lib/world-state';
import {
  DEFAULT_WORLD_EQUIPMENT,
  MARKET_WORLD_INVENTORY_ITEMS,
  STARTER_WORLD_INVENTORY_ITEMS,
  cleanWorldInventoryRarity,
  getWorldEquipmentItem,
  normalizeWorldEquipment,
} from '@/lib/world-inventory-catalog';
import { awardWorldAchievement } from '@/lib/world-achievements';
import { DEFAULT_WORLD_POSITION, normalizeWorldLocationMap, normalizeWorldPosition } from '@/lib/world-location';
import type { CharacterAppearance, CharacterEquipment, CharacterProfile, LoveStats, WorldInventoryCatalogItem, WorldInventoryItem, WorldInventorySlot } from '@/types';

type WorldInventoryBody = {
  action?: 'equip' | 'unequip' | 'purchase';
  itemKey?: string;
  slot?: string;
};

type WorldInventoryResponse = {
  profile: CharacterProfile;
  equipment: CharacterEquipment;
  inventory: WorldInventoryItem[];
  catalog: WorldInventoryCatalogItem[];
  stats: LoveStats;
};

const DEFAULT_APPEARANCE: CharacterAppearance = {
  bodyColor: '#b45309',
  trimColor: '#fde68a',
  hairColor: '#3f2b1f',
  skinColor: '#f5d0b6',
};

const INVENTORY_SLOTS = new Set<WorldInventorySlot>(['head', 'back', 'hand']);

class WorldInventoryError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'WorldInventoryError';
  }
}

function cleanSlot(value: unknown): WorldInventorySlot | null {
  return typeof value === 'string' && INVENTORY_SLOTS.has(value as WorldInventorySlot)
    ? value as WorldInventorySlot
    : null;
}

function normalizeAppearance(value: unknown): CharacterAppearance {
  const input = value && typeof value === 'object' ? value as Partial<CharacterAppearance> : {};
  return {
    bodyColor: typeof input.bodyColor === 'string' ? input.bodyColor : DEFAULT_APPEARANCE.bodyColor,
    trimColor: typeof input.trimColor === 'string' ? input.trimColor : DEFAULT_APPEARANCE.trimColor,
    hairColor: typeof input.hairColor === 'string' ? input.hairColor : DEFAULT_APPEARANCE.hairColor,
    skinColor: typeof input.skinColor === 'string' ? input.skinColor : DEFAULT_APPEARANCE.skinColor,
  };
}

function normalizeCosmetics(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => key.length <= 40 && ['string', 'number', 'boolean'].includes(typeof entry))
      .slice(0, 12)
  );
}

function toInputJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function toCharacterProfile(profile: {
  userId: string;
  configId: string;
  displayName: string;
  title: string;
  status: string;
  activity: string;
  emote: string;
  modelUrl: string | null;
  appearance: Prisma.JsonValue;
  equipment: Prisma.JsonValue;
  cosmetics: Prisma.JsonValue;
  lastPosition: Prisma.JsonValue;
  lastZone: string;
  lastMapPositions: Prisma.JsonValue;
  updatedAt: Date;
}): CharacterProfile {
  return {
    userId: profile.userId,
    configId: profile.configId,
    displayName: profile.displayName,
    title: profile.title,
    status: profile.status,
    activity: profile.activity,
    emote: profile.emote,
    modelUrl: profile.modelUrl,
    appearance: normalizeAppearance(profile.appearance),
    equipment: normalizeWorldEquipment(profile.equipment),
    cosmetics: normalizeCosmetics(profile.cosmetics),
    lastPosition: normalizeWorldPosition(profile.lastPosition),
    lastZone: profile.lastZone,
    lastMapPositions: normalizeWorldLocationMap(profile.lastMapPositions),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function toWorldInventoryItem(item: PrismaWorldInventoryItem, equipment: CharacterEquipment): WorldInventoryItem {
  const slot = cleanSlot(item.slot) || 'hand';
  return {
    id: item.id,
    configId: item.configId,
    userId: item.userId,
    slot,
    itemKey: item.itemKey,
    name: item.name,
    rarity: cleanWorldInventoryRarity(item.rarity),
    icon: item.icon,
    isEquipped: equipment[slot] === item.itemKey,
    metadata: normalizeCosmetics(item.metadata),
    acquiredAt: item.acquiredAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
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
      lastPosition: toInputJson(DEFAULT_WORLD_POSITION),
      lastZone: 'Narinyland Commons',
      lastMapPositions: toInputJson({}),
    },
    update: {},
  });
}

async function ensureStarterInventory(configId: string, userId: string) {
  await Promise.all(STARTER_WORLD_INVENTORY_ITEMS.map(item => (
    prisma.worldInventoryItem.upsert({
      where: {
        configId_userId_itemKey: {
          configId,
          userId,
          itemKey: item.itemKey,
        },
      },
      create: {
        configId,
        userId,
        slot: item.slot,
        itemKey: item.itemKey,
        name: item.name,
        rarity: item.rarity,
        icon: item.icon,
        metadata: toInputJson(item.metadata || { source: item.source }),
      },
      update: {
        slot: item.slot,
        name: item.name,
        rarity: item.rarity,
        icon: item.icon,
      },
    })
  )));
}

async function getInventory(
  client: typeof prisma | Prisma.TransactionClient,
  configId: string,
  userId: string,
  equipment: CharacterEquipment
) {
  const items = await client.worldInventoryItem.findMany({
    where: { configId, userId },
    orderBy: [
      { slot: 'asc' },
      { acquiredAt: 'asc' },
    ],
  });

  return items.map(item => toWorldInventoryItem(item, equipment));
}

function buildCatalog(inventory: WorldInventoryItem[], equipment: CharacterEquipment): WorldInventoryCatalogItem[] {
  const ownedKeys = new Set(inventory.map(item => item.itemKey));
  return MARKET_WORLD_INVENTORY_ITEMS.map(item => ({
    slot: item.slot,
    itemKey: item.itemKey,
    name: item.name,
    rarity: item.rarity,
    icon: item.icon,
    price: item.price,
    description: item.description,
    source: item.source,
    isOwned: ownedKeys.has(item.itemKey),
    isEquipped: equipment[item.slot] === item.itemKey,
  }));
}

async function spendMarketplacePoints(tx: Prisma.TransactionClient, configId: string, price: number) {
  if (price <= 0) return;

  const partners = await tx.partner.findMany({
    where: { configId },
    orderBy: { points: 'desc' },
    select: { id: true, points: true },
  });
  const totalPoints = partners.reduce((sum, partner) => sum + (partner.points || 0), 0);
  if (totalPoints < price) {
    throw new WorldInventoryError(400, `Need ${price} points for this market item`);
  }

  let remainingCost = price;
  for (const partner of partners) {
    if (remainingCost <= 0) break;
    const deduct = Math.min(partner.points || 0, remainingCost);
    if (deduct <= 0) continue;
    await tx.partner.update({
      where: { id: partner.id },
      data: { points: { decrement: deduct } },
    });
    remainingCost -= deduct;
  }
}

async function buildInventoryResponse(
  configId: string,
  userId: string,
  profile: Awaited<ReturnType<typeof ensureProfile>>,
  options: { refreshStatsCache?: boolean } = {}
): Promise<WorldInventoryResponse> {
  const equipment = normalizeWorldEquipment(profile.equipment);
  const inventory = await getInventory(prisma, configId, userId, equipment);
  if (options.refreshStatsCache) await redis.del(`app_stats:${configId}`);
  const stats = await getStats(configId);
  return {
    profile: toCharacterProfile(profile),
    equipment,
    inventory,
    catalog: buildCatalog(inventory, equipment),
    stats,
  };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const profile = await ensureProfile(access.configId, access.userId);
    await ensureStarterInventory(access.configId, access.userId);

    return NextResponse.json(await buildInventoryResponse(access.configId, access.userId, profile));
  } catch (err: unknown) {
    console.error('GET /api/world-inventory error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldInventoryBody;
    const action = body.action || 'equip';

    const profile = await ensureProfile(access.configId, access.userId);
    await ensureStarterInventory(access.configId, access.userId);

    if (action === 'purchase') {
      const itemKey = typeof body.itemKey === 'string' ? body.itemKey.trim().slice(0, 80) : '';
      const marketItem = itemKey ? getWorldEquipmentItem(itemKey) : null;
      if (!marketItem || marketItem.source !== 'market') {
        return NextResponse.json({ error: 'Market item not found' }, { status: 404 });
      }

      const updatedProfile = await prisma.$transaction(async (tx) => {
        const existingItem = await tx.worldInventoryItem.findUnique({
          where: {
            configId_userId_itemKey: {
              configId: access.configId,
              userId: access.userId,
              itemKey: marketItem.itemKey,
            },
          },
        });

        if (!existingItem) {
          await spendMarketplacePoints(tx, access.configId, marketItem.price);
          await tx.worldInventoryItem.create({
            data: {
              configId: access.configId,
              userId: access.userId,
              slot: marketItem.slot,
              itemKey: marketItem.itemKey,
              name: marketItem.name,
              rarity: marketItem.rarity,
              icon: marketItem.icon,
              metadata: toInputJson(marketItem.metadata || { source: 'market', price: marketItem.price }),
            },
          });
          await awardWorldAchievement(access.configId, access.userId, 'market_regular', {
            itemKey: marketItem.itemKey,
            price: marketItem.price,
          }, tx);
        }

        const freshProfile = await tx.characterProfile.findUniqueOrThrow({
          where: { configId_userId: { configId: access.configId, userId: access.userId } },
        });
        const equipment = normalizeWorldEquipment(freshProfile.equipment);
        equipment[marketItem.slot] = marketItem.itemKey;

        return tx.characterProfile.update({
          where: { configId_userId: { configId: access.configId, userId: access.userId } },
          data: { equipment: toInputJson(equipment) },
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      const response = await buildInventoryResponse(access.configId, access.userId, updatedProfile, { refreshStatsCache: true });
      await publishWorldUpdate(access.configId, 'inventory', {
        userId: access.userId,
        action: 'purchase',
        itemKey: marketItem.itemKey,
      });
      await publishWorldUpdate(access.configId, 'achievement', {
        userId: access.userId,
        action: 'market_purchase',
      });
      return NextResponse.json(response);
    }

    const slot = cleanSlot(body.slot);
    if (!slot) return NextResponse.json({ error: 'slot is required' }, { status: 400 });

    const equipment = normalizeWorldEquipment(profile.equipment);

    if (action === 'unequip') {
      equipment[slot] = 'none';
    } else {
      const itemKey = typeof body.itemKey === 'string' ? body.itemKey.trim().slice(0, 80) : '';
      if (!itemKey) return NextResponse.json({ error: 'itemKey is required' }, { status: 400 });

      const item = await prisma.worldInventoryItem.findUnique({
        where: {
          configId_userId_itemKey: {
            configId: access.configId,
            userId: access.userId,
            itemKey,
          },
        },
      });
      if (!item || cleanSlot(item.slot) !== slot) {
        return NextResponse.json({ error: 'Item is not owned for this slot' }, { status: 404 });
      }
      equipment[slot] = item.itemKey;
    }

    const updatedProfile = await prisma.characterProfile.update({
      where: { configId_userId: { configId: access.configId, userId: access.userId } },
      data: { equipment: toInputJson(equipment) },
    });

    const response = await buildInventoryResponse(access.configId, access.userId, updatedProfile);
    await publishWorldUpdate(access.configId, 'inventory', {
      userId: access.userId,
      action,
      slot,
      itemKey: equipment[slot] || 'none',
    });
    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('POST /api/world-inventory error:', err);
    if (err instanceof WorldInventoryError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
