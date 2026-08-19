import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getErrorField } from '@/lib/errors';
import { spendSharedPoints } from '@/lib/stats-service';
import { getBuildingDefinition } from './building-catalog';
import { getEligibleExpansionDefinitions, getExpansionDefinitions } from './expansions';
import { generateStarterWorld } from './generator';
import { validatePlacement } from './rules';
import type { HexPlacementInput, HexRotation, HexWorldErrorCode, HexWorldSnapshot } from './types';

export class HexWorldServiceError extends Error {
  constructor(
    public readonly code: HexWorldErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HexWorldServiceError';
  }
}

type HexWorldClient = Prisma.TransactionClient | typeof prisma;

const WORLD_INCLUDE = {
  tiles: { orderBy: [{ q: 'asc' as const }, { r: 'asc' as const }] },
  buildings: { orderBy: { createdAt: 'asc' as const } },
  expansions: { orderBy: { createdAt: 'asc' as const } },
} as const;

async function requireLand(client: HexWorldClient, configId: string, landId: string) {
  const land = await client.land.findFirst({ where: { id: landId, configId }, select: { id: true } });
  if (!land) throw new HexWorldServiceError('land_access_denied', 403, 'Land is not available in this circle');
  return land;
}

async function getSharedPoints(client: HexWorldClient, configId: string): Promise<number> {
  const result = await client.partner.aggregate({ where: { configId }, _sum: { points: true } });
  return result._sum.points ?? 0;
}

function serializeSnapshot(world: any, points: number): HexWorldSnapshot {
  const base: HexWorldSnapshot = {
    world: {
      id: world.id,
      landId: world.landId,
      schemaVersion: world.schemaVersion,
      generatorVersion: world.generatorVersion,
      seed: world.seed,
      expansionLevel: world.expansionLevel,
    },
    tiles: world.tiles.map((tile: any) => ({
      id: tile.id,
      worldId: tile.worldId,
      q: tile.q,
      r: tile.r,
      terrainType: tile.terrainType,
      height: tile.height,
      unlocked: tile.unlocked,
      metadata: (tile.metadata ?? {}) as Record<string, unknown>,
    })),
    buildings: world.buildings.map((building: any) => ({
      id: building.id,
      worldId: building.worldId,
      buildingKey: building.buildingKey,
      anchorQ: building.anchorQ,
      anchorR: building.anchorR,
      rotation: building.rotation as HexRotation,
      modelUrl: building.modelUrl,
      metadata: (building.metadata ?? {}) as Record<string, unknown>,
    })),
    expansions: [],
    points,
  };
  base.expansions = getEligibleExpansionDefinitions(base, world.expansions.map((item: any) => item.expansionKey));
  return base;
}

async function readSnapshot(client: HexWorldClient, configId: string, landId: string): Promise<HexWorldSnapshot | null> {
  await requireLand(client, configId, landId);
  const world = await client.hexWorld.findUnique({ where: { landId }, include: WORLD_INCLUDE });
  if (!world) return null;
  return serializeSnapshot(world, await getSharedPoints(client, configId));
}

export async function getOrCreateHexWorldSnapshotWithClient(
  client: HexWorldClient,
  configId: string,
  landId: string,
): Promise<HexWorldSnapshot> {
  await requireLand(client, configId, landId);
  const existing = await client.hexWorld.findUnique({ where: { landId }, include: WORLD_INCLUDE });
  if (existing) return serializeSnapshot(existing, await getSharedPoints(client, configId));

  const generated = generateStarterWorld(landId);
  const created = await client.hexWorld.create({
    data: {
      landId,
      seed: landId,
      schemaVersion: 1,
      generatorVersion: 1,
      tiles: {
        createMany: {
          data: generated.tiles.map(({ q, r, terrainType, height, unlocked, metadata }) => ({
            q, r, terrainType, height, unlocked, metadata: metadata ?? {},
          })),
        },
      },
      buildings: {
        create: generated.buildings.map((building) => ({
          buildingKey: building.buildingKey,
          anchorQ: building.anchorQ,
          anchorR: building.anchorR,
          rotation: building.rotation,
          metadata: building.metadata ?? {},
        })),
      },
    },
    include: WORLD_INCLUDE,
  });
  return serializeSnapshot(created, await getSharedPoints(client, configId));
}

async function runHexTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>, retries = 2): Promise<T> {
  try {
    return await prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const code = getErrorField(error, 'code');
    if (retries > 0 && (code === 'P2034' || code === 'P2002')) return runHexTransaction(callback, retries - 1);
    throw error;
  }
}

export async function getOrCreateHexWorldSnapshot(configId: string, landId: string): Promise<HexWorldSnapshot> {
  return runHexTransaction((tx) => getOrCreateHexWorldSnapshotWithClient(tx, configId, landId));
}

function throwPlacement(result: ReturnType<typeof validatePlacement>): never {
  if (result.ok) throw new Error('Expected invalid placement');
  const status = result.code === 'tile_occupied' ? 409 : 400;
  throw new HexWorldServiceError(result.code, status, result.code.replaceAll('_', ' '));
}

export async function placeHexBuilding(configId: string, landId: string, input: HexPlacementInput): Promise<HexWorldSnapshot> {
  return runHexTransaction(async (tx) => {
    const snapshot = await getOrCreateHexWorldSnapshotWithClient(tx, configId, landId);
    const result = validatePlacement({
      buildingKey: input.buildingKey,
      anchor: { q: input.anchorQ, r: input.anchorR },
      rotation: input.rotation,
      tiles: snapshot.tiles,
      buildings: snapshot.buildings,
    });
    if (!result.ok) throwPlacement(result);
    const definition = getBuildingDefinition(input.buildingKey)!;
    if (!definition.duplicates && snapshot.buildings.some((item) => item.buildingKey === input.buildingKey)) {
      throw new HexWorldServiceError('invalid_building', 409, `${definition.name} already exists on this Land`);
    }
    await tx.hexBuilding.create({
      data: {
        worldId: snapshot.world.id,
        buildingKey: input.buildingKey,
        anchorQ: input.anchorQ,
        anchorR: input.anchorR,
        rotation: input.rotation,
        metadata: {},
      },
    });
    return (await readSnapshot(tx, configId, landId))!;
  });
}

export async function updateHexBuilding(
  configId: string,
  landId: string,
  buildingId: string,
  patch: { anchorQ?: number; anchorR?: number; rotation?: number },
): Promise<HexWorldSnapshot> {
  return runHexTransaction(async (tx) => {
    const snapshot = await getOrCreateHexWorldSnapshotWithClient(tx, configId, landId);
    const building = snapshot.buildings.find((item) => item.id === buildingId);
    if (!building) throw new HexWorldServiceError('building_not_found', 404, 'Building not found');

    const nextRotation = patch.rotation ?? building.rotation;
    const result = validatePlacement({
      buildingKey: building.buildingKey,
      anchor: { q: patch.anchorQ ?? building.anchorQ, r: patch.anchorR ?? building.anchorR },
      rotation: nextRotation,
      tiles: snapshot.tiles,
      buildings: snapshot.buildings,
      ignoreBuildingId: buildingId,
    });
    if (!result.ok) throwPlacement(result);

    await tx.hexBuilding.update({
      where: { id: buildingId },
      data: {
        ...(patch.anchorQ !== undefined ? { anchorQ: patch.anchorQ } : {}),
        ...(patch.anchorR !== undefined ? { anchorR: patch.anchorR } : {}),
        ...(patch.rotation !== undefined ? { rotation: patch.rotation } : {}),
      },
    });
    return (await readSnapshot(tx, configId, landId))!;
  });
}

export async function removeHexBuilding(configId: string, landId: string, buildingId: string): Promise<HexWorldSnapshot> {
  return runHexTransaction(async (tx) => {
    const snapshot = await getOrCreateHexWorldSnapshotWithClient(tx, configId, landId);
    const building = snapshot.buildings.find((item) => item.id === buildingId);
    if (!building) throw new HexWorldServiceError('building_not_found', 404, 'Building not found');
    const definition = getBuildingDefinition(building.buildingKey);
    if (!definition?.removable) throw new HexWorldServiceError('home_locked', 409, 'Starter Home cannot be removed');
    await tx.hexBuilding.delete({ where: { id: buildingId } });
    return (await readSnapshot(tx, configId, landId))!;
  });
}

export async function expandHexWorld(configId: string, landId: string, expansionKey: string): Promise<HexWorldSnapshot> {
  return runHexTransaction(async (tx) => {
    const snapshot = await getOrCreateHexWorldSnapshotWithClient(tx, configId, landId);
    const purchased = await tx.hexExpansion.findUnique({
      where: { worldId_expansionKey: { worldId: snapshot.world.id, expansionKey } },
    });
    if (purchased) return (await readSnapshot(tx, configId, landId))!;

    const definition = getExpansionDefinitions(snapshot.world.seed).find((item) => item.expansionKey === expansionKey);
    if (!definition || !snapshot.expansions.some((item) => item.expansionKey === expansionKey)) {
      throw new HexWorldServiceError('expansion_not_available', 409, 'This Land expansion is not currently available');
    }

    try {
      await spendSharedPoints(tx, configId, definition.pointCost);
    } catch (error: any) {
      if (error?.code === 'not_enough_points') {
        throw new HexWorldServiceError('not_enough_points', 400, 'Not enough shared Points for this expansion');
      }
      throw error;
    }

    await tx.hexTile.createMany({
      data: definition.tiles.map((tile) => ({
        worldId: snapshot.world.id,
        q: tile.q,
        r: tile.r,
        terrainType: 'grass',
        height: 0,
        unlocked: true,
        metadata: { expansionKey },
      })),
      skipDuplicates: true,
    });
    await tx.hexExpansion.create({
      data: {
        worldId: snapshot.world.id,
        expansionKey,
        tier: definition.tier,
        pointCost: definition.pointCost,
      },
    });
    await tx.hexWorld.update({ where: { id: snapshot.world.id }, data: { expansionLevel: { increment: 1 } } });
    return (await readSnapshot(tx, configId, landId))!;
  });
}
