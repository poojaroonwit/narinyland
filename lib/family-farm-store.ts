import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  createInitialFamilyFarmState,
  normalizeFamilyFarmState,
  performFarmAction,
  type FamilyFarmState,
  type FarmAction,
} from '@/lib/family-farm-game';

const FARM_SAVE_ITEM_KEY = 'family-farm-state-v1';
const FARM_SAVE_SLOT = 'system';
const FARM_SAVE_NAME = 'Family Farm Save';

type SaveMetadata = {
  revision?: number;
  state?: unknown;
};

export type FamilyFarmSave = {
  landId: string;
  revision: number;
  state: FamilyFarmState;
};

function farmSaveUserId(landId: string) {
  return `__family_farm__:${landId}`;
}

function readMetadata(value: Prisma.JsonValue): SaveMetadata {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};
  return value as SaveMetadata;
}

async function getLandContext(configId: string, landId: string) {
  const [land, config] = await Promise.all([
    prisma.land.findFirst({
      where: { id: landId, configId },
      select: { id: true, name: true },
    }),
    prisma.appConfig.findUnique({
      where: { id: configId },
      select: { appName: true },
    }),
  ]);

  if (!land) throw new Error('Garden not found in this family world.');

  return {
    land,
    familyName: `${config?.appName || 'Our Family'} Farm`.slice(0, 32),
  };
}

export async function getFamilyFarmSave(configId: string, landId: string): Promise<FamilyFarmSave> {
  const context = await getLandContext(configId, landId);
  const userId = farmSaveUserId(landId);
  const existing = await prisma.worldInventoryItem.findUnique({
    where: {
      configId_userId_itemKey: {
        configId,
        userId,
        itemKey: FARM_SAVE_ITEM_KEY,
      },
    },
    select: { metadata: true },
  });

  if (!existing) {
    return {
      landId,
      revision: 0,
      state: createInitialFamilyFarmState(context.familyName),
    };
  }

  const metadata = readMetadata(existing.metadata);
  return {
    landId,
    revision: typeof metadata.revision === 'number' && Number.isFinite(metadata.revision)
      ? Math.max(0, Math.floor(metadata.revision))
      : 0,
    state: normalizeFamilyFarmState(metadata.state, context.familyName),
  };
}

export async function applyFamilyFarmAction(
  configId: string,
  landId: string,
  action: FarmAction
): Promise<FamilyFarmSave & { message: string }> {
  const current = await getFamilyFarmSave(configId, landId);
  const result = performFarmAction(current.state, action);
  const revision = current.revision + 1;
  const userId = farmSaveUserId(landId);
  const metadata = {
    revision,
    state: result.state,
  } as unknown as Prisma.InputJsonValue;

  await prisma.worldInventoryItem.upsert({
    where: {
      configId_userId_itemKey: {
        configId,
        userId,
        itemKey: FARM_SAVE_ITEM_KEY,
      },
    },
    create: {
      configId,
      userId,
      slot: FARM_SAVE_SLOT,
      itemKey: FARM_SAVE_ITEM_KEY,
      name: FARM_SAVE_NAME,
      rarity: 'system',
      icon: 'fa-seedling',
      metadata,
    },
    update: {
      metadata,
    },
  });

  return {
    landId,
    revision,
    state: result.state,
    message: result.message,
  };
}
