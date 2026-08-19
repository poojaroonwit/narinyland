import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  createInitialFamilyFarmState,
  normalizeFamilyFarmState,
  performFarmAction,
  type FamilyFarmState,
  type FarmAction,
} from '@/lib/family-farm-game';

// Keep the original key so existing v1 farm saves migrate in place through the
// normalizer instead of creating a second parallel save record.
const FARM_SAVE_ITEM_KEY = 'family-farm-state-v1';
const FARM_SAVE_SLOT = 'system';
const FARM_SAVE_NAME = 'Family Life Save';
const MAX_TRANSACTION_ATTEMPTS = 3;

type SaveMetadata = {
  revision?: number;
  state?: unknown;
};

type FarmDb = Pick<Prisma.TransactionClient, 'land' | 'appConfig' | 'worldInventoryItem'>;

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

async function getLandContext(db: FarmDb, configId: string, landId: string) {
  const [land, config] = await Promise.all([
    db.land.findFirst({
      where: { id: landId, configId },
      select: { id: true, name: true },
    }),
    db.appConfig.findUnique({
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

async function readFamilyFarmSave(db: FarmDb, configId: string, landId: string): Promise<FamilyFarmSave> {
  const context = await getLandContext(db, configId, landId);
  const userId = farmSaveUserId(landId);
  const existing = await db.worldInventoryItem.findUnique({
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

export async function getFamilyFarmSave(configId: string, landId: string): Promise<FamilyFarmSave> {
  return readFamilyFarmSave(prisma, configId, landId);
}

function isSerializableRetry(error: unknown) {
  return !!error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'P2034';
}

export async function applyFamilyFarmAction(
  configId: string,
  landId: string,
  action: FarmAction
): Promise<FamilyFarmSave & { message: string }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const current = await readFamilyFarmSave(tx, configId, landId);
        const result = performFarmAction(current.state, action);
        const revision = current.revision + 1;
        const userId = farmSaveUserId(landId);
        const metadata = {
          revision,
          state: result.state,
        } as unknown as Prisma.InputJsonValue;

        await tx.worldInventoryItem.upsert({
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
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      lastError = error;
      if (!isSerializableRetry(error) || attempt === MAX_TRANSACTION_ATTEMPTS) throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not save the family world action.');
}
