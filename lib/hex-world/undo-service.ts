import { Prisma } from '@prisma/client';
import { getBuildingDefinition } from './building-catalog';
import { validatePlacement } from './rules';
import { getOrCreateHexWorldSnapshotWithClient, HexWorldServiceError } from './service';
import { runHexTransaction } from './transaction';
import type { HexBuildingDTO, HexWorldSnapshot } from './types';
import type { HexUndoBuildingState, HexUndoClaim, HexUndoDescriptor, HexUndoScope } from './undo-types';
import { redisHexUndoStore, type HexUndoStore } from './undo-store';

function conflict(message = 'Land changed — undo unavailable'): never {
  throw new HexWorldServiceError('undo_conflict', 409, message);
}

function buildingMatches(building: HexBuildingDTO | undefined, expected: HexUndoBuildingState): boolean {
  if (!building) return false;
  return building.id === expected.id
    && building.buildingKey === expected.buildingKey
    && building.anchorQ === expected.anchorQ
    && building.anchorR === expected.anchorR
    && building.rotation === expected.rotation
    && (building.modelUrl ?? null) === (expected.modelUrl ?? null)
    && JSON.stringify(building.metadata ?? {}) === JSON.stringify(expected.metadata ?? {});
}

async function incrementRevision(tx: Prisma.TransactionClient, worldId: string) {
  await tx.hexWorld.update({ where: { id: worldId }, data: { revision: { increment: 1 } } });
}

export async function applyInverseAndIncrementRevision(
  tx: Prisma.TransactionClient,
  scope: HexUndoScope,
  descriptor: HexUndoDescriptor,
): Promise<HexWorldSnapshot> {
  const current = await getOrCreateHexWorldSnapshotWithClient(tx, scope.configId, scope.landId);
  if (current.world.revision !== descriptor.expectedRevision) conflict();

  if (descriptor.action === 'place') {
    const building = current.buildings.find((item) => item.id === descriptor.expected.id);
    if (!buildingMatches(building, descriptor.expected)) conflict();
    await tx.hexBuilding.delete({ where: { id: descriptor.expected.id } });
  } else if (descriptor.action === 'move' || descriptor.action === 'rotate') {
    const building = current.buildings.find((item) => item.id === descriptor.expected.id);
    if (!buildingMatches(building, descriptor.expected)) conflict();
    const placement = validatePlacement({
      buildingKey: descriptor.before.buildingKey,
      anchor: { q: descriptor.before.anchorQ, r: descriptor.before.anchorR },
      rotation: descriptor.before.rotation,
      tiles: current.tiles,
      buildings: current.buildings,
      ignoreBuildingId: descriptor.before.id,
    });
    if (!placement.ok) conflict();
    await tx.hexBuilding.update({
      where: { id: descriptor.before.id },
      data: {
        anchorQ: descriptor.before.anchorQ,
        anchorR: descriptor.before.anchorR,
        rotation: descriptor.before.rotation,
        modelUrl: descriptor.before.modelUrl ?? null,
        metadata: (descriptor.before.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } else {
    if (current.buildings.some((item) => item.id === descriptor.before.id)) conflict();
    const definition = getBuildingDefinition(descriptor.before.buildingKey);
    if (!definition) conflict();
    if (!definition.duplicates && current.buildings.some((item) => item.buildingKey === descriptor.before.buildingKey)) conflict();
    const placement = validatePlacement({
      buildingKey: descriptor.before.buildingKey,
      anchor: { q: descriptor.before.anchorQ, r: descriptor.before.anchorR },
      rotation: descriptor.before.rotation,
      tiles: current.tiles,
      buildings: current.buildings,
    });
    if (!placement.ok) conflict();
    await tx.hexBuilding.create({
      data: {
        id: descriptor.before.id,
        worldId: current.world.id,
        buildingKey: descriptor.before.buildingKey,
        anchorQ: descriptor.before.anchorQ,
        anchorR: descriptor.before.anchorR,
        rotation: descriptor.before.rotation,
        modelUrl: descriptor.before.modelUrl ?? null,
        metadata: (descriptor.before.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  await incrementRevision(tx, current.world.id);
  return getOrCreateHexWorldSnapshotWithClient(tx, scope.configId, scope.landId);
}

async function handleClaimFailure(store: HexUndoStore, claim: HexUndoClaim, error: unknown) {
  if (error instanceof HexWorldServiceError && error.code === 'undo_conflict') {
    await store.consume(claim);
  } else {
    await store.release(claim);
  }
}

export async function undoHexWorldMutation(
  scope: HexUndoScope,
  token: string,
  store: HexUndoStore = redisHexUndoStore,
): Promise<HexWorldSnapshot> {
  const claim = await store.claim(scope, token);
  if (!claim) throw new HexWorldServiceError('undo_unavailable', 409, 'Undo is no longer available');

  try {
    const snapshot = await runHexTransaction((tx) => applyInverseAndIncrementRevision(tx, scope, claim.descriptor));
    await store.consume(claim);
    return snapshot;
  } catch (error) {
    await handleClaimFailure(store, claim, error);
    throw error;
  }
}
