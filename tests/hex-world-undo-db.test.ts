import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import prisma from '@/lib/prisma';
import { closeRedisConnection } from '@/lib/redis';
import { finalizeReversibleMutation } from '@/lib/hex-world/reversible-mutation';
import {
  getOrCreateHexWorldSnapshot,
  HexWorldServiceError,
  placeHexBuilding,
  removeHexBuilding,
  updateHexBuilding,
} from '@/lib/hex-world/service';
import { undoHexWorldMutation } from '@/lib/hex-world/undo-service';
import { validatePlacement } from '@/lib/hex-world/rules';
import type { HexUndoScope } from '@/lib/hex-world/undo-types';

const createdConfigIds: string[] = [];

after(async () => {
  for (const id of createdConfigIds) await prisma.appConfig.delete({ where: { id } }).catch(() => undefined);
  await prisma.$disconnect();
  await closeRedisConnection();
});

async function createFixture() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const configId = `hex-undo-${suffix}`;
  const userId = `user-${suffix}`;
  createdConfigIds.push(configId);
  await prisma.appConfig.create({ data: { id: configId } });
  const land = await prisma.land.create({ data: { name: 'Undo Land', isActive: true, configId } });
  await prisma.partner.create({
    data: { partnerId: 'partner1', userId, name: 'Undo User', avatar: 'U', configId, points: 1000, lifetimePoints: 1000 },
  });
  const scope: HexUndoScope = { configId, landId: land.id, userId };
  const snapshot = await getOrCreateHexWorldSnapshot(configId, land.id);
  return { scope, snapshot };
}

function freeBenchCells(snapshot: Awaited<ReturnType<typeof getOrCreateHexWorldSnapshot>>, count = 2) {
  const result = [] as Array<{ q: number; r: number }>;
  for (const tile of snapshot.tiles) {
    const placement = validatePlacement({
      buildingKey: 'bench',
      anchor: { q: tile.q, r: tile.r },
      rotation: 0,
      tiles: snapshot.tiles,
      buildings: snapshot.buildings,
    });
    if (placement.ok) result.push({ q: tile.q, r: tile.r });
    if (result.length >= count) return result;
  }
  throw new Error('Not enough free bench cells');
}

async function persistWithUndo(scope: HexUndoScope, persistence: Awaited<ReturnType<typeof placeHexBuilding> | ReturnType<typeof updateHexBuilding> | ReturnType<typeof removeHexBuilding>>) {
  const response = await finalizeReversibleMutation(scope, persistence);
  assert.ok(response.undo, 'Redis-backed mutation should return an undo opportunity');
  return response;
}

test('place move rotate and remove each undo authoritatively and advance revision', async () => {
  const { scope, snapshot } = await createFixture();
  const [first, second] = freeBenchCells(snapshot, 2);

  const placed = await persistWithUndo(scope, await placeHexBuilding(scope.configId, scope.landId, {
    buildingKey: 'bench', anchorQ: first.q, anchorR: first.r, rotation: 0,
  }));
  const firstBench = placed.snapshot.buildings.find((building) => building.buildingKey === 'bench');
  assert.ok(firstBench && placed.undo);
  const afterPlaceUndo = await undoHexWorldMutation(scope, placed.undo.token);
  assert.equal(afterPlaceUndo.world.revision, placed.snapshot.world.revision + 1);
  assert.equal(afterPlaceUndo.buildings.some((building) => building.id === firstBench.id), false);
  await assert.rejects(
    () => undoHexWorldMutation(scope, placed.undo!.token),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'undo_unavailable',
  );

  const placedAgain = await persistWithUndo(scope, await placeHexBuilding(scope.configId, scope.landId, {
    buildingKey: 'bench', anchorQ: first.q, anchorR: first.r, rotation: 0,
  }));
  const bench = placedAgain.snapshot.buildings.find((building) => building.buildingKey === 'bench');
  assert.ok(bench);

  const moved = await persistWithUndo(scope, await updateHexBuilding(scope.configId, scope.landId, bench.id, {
    anchorQ: second.q, anchorR: second.r, rotation: 1,
  }));
  assert.ok(moved.undo);
  const afterMoveUndo = await undoHexWorldMutation(scope, moved.undo.token);
  const movedBack = afterMoveUndo.buildings.find((building) => building.id === bench.id);
  assert.deepEqual(movedBack && [movedBack.anchorQ, movedBack.anchorR, movedBack.rotation], [first.q, first.r, 0]);

  const rotated = await persistWithUndo(scope, await updateHexBuilding(scope.configId, scope.landId, bench.id, { rotation: 2 }));
  assert.ok(rotated.undo);
  const afterRotateUndo = await undoHexWorldMutation(scope, rotated.undo.token);
  assert.equal(afterRotateUndo.buildings.find((building) => building.id === bench.id)?.rotation, 0);

  const removed = await persistWithUndo(scope, await removeHexBuilding(scope.configId, scope.landId, bench.id));
  assert.ok(removed.undo);
  const afterRemoveUndo = await undoHexWorldMutation(scope, removed.undo.token);
  const restored = afterRemoveUndo.buildings.find((building) => building.id === bench.id);
  assert.ok(restored);
  assert.deepEqual([restored.anchorQ, restored.anchorR, restored.rotation], [first.q, first.r, 0]);
});

test('undo token is scope-safe and unknown tokens are unavailable', async () => {
  const { scope, snapshot } = await createFixture();
  const [tile] = freeBenchCells(snapshot, 1);
  const placed = await persistWithUndo(scope, await placeHexBuilding(scope.configId, scope.landId, {
    buildingKey: 'bench', anchorQ: tile.q, anchorR: tile.r, rotation: 0,
  }));
  assert.ok(placed.undo);
  await assert.rejects(
    () => undoHexWorldMutation({ ...scope, userId: 'other-user' }, placed.undo!.token),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'undo_unavailable',
  );
  await assert.rejects(
    () => undoHexWorldMutation(scope, 'unknown-token'),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'undo_unavailable',
  );
  await undoHexWorldMutation(scope, placed.undo.token);
});

test('newer unfinalized building mutation makes an older undo conflict instead of overwriting state', async () => {
  const { scope, snapshot } = await createFixture();
  const [tile] = freeBenchCells(snapshot, 1);
  const placed = await persistWithUndo(scope, await placeHexBuilding(scope.configId, scope.landId, {
    buildingKey: 'bench', anchorQ: tile.q, anchorR: tile.r, rotation: 0,
  }));
  assert.ok(placed.undo);
  const bench = placed.snapshot.buildings.find((building) => building.buildingKey === 'bench');
  assert.ok(bench);

  const newer = await updateHexBuilding(scope.configId, scope.landId, bench.id, { rotation: 1 });
  await assert.rejects(
    () => undoHexWorldMutation(scope, placed.undo!.token),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'undo_conflict',
  );
  const current = await getOrCreateHexWorldSnapshot(scope.configId, scope.landId);
  assert.equal(current.world.revision, newer.snapshot.world.revision);
  assert.equal(current.buildings.find((building) => building.id === bench.id)?.rotation, 1);
});

test('parallel calls for one undo token permit at most one successful inverse', async () => {
  const { scope, snapshot } = await createFixture();
  const [tile] = freeBenchCells(snapshot, 1);
  const placed = await persistWithUndo(scope, await placeHexBuilding(scope.configId, scope.landId, {
    buildingKey: 'bench', anchorQ: tile.q, anchorR: tile.r, rotation: 0,
  }));
  assert.ok(placed.undo);

  const results = await Promise.allSettled([
    undoHexWorldMutation(scope, placed.undo.token),
    undoHexWorldMutation(scope, placed.undo.token),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
});

test('inverse placement conflict leaves authoritative DB state unchanged', async () => {
  const { scope, snapshot } = await createFixture();
  const [tile] = freeBenchCells(snapshot, 1);
  const placed = await persistWithUndo(scope, await placeHexBuilding(scope.configId, scope.landId, {
    buildingKey: 'bench', anchorQ: tile.q, anchorR: tile.r, rotation: 0,
  }));
  const bench = placed.snapshot.buildings.find((building) => building.buildingKey === 'bench');
  assert.ok(bench);
  const removed = await persistWithUndo(scope, await removeHexBuilding(scope.configId, scope.landId, bench.id));
  assert.ok(removed.undo);

  await prisma.hexBuilding.create({
    data: { worldId: removed.snapshot.world.id, buildingKey: 'lamp', anchorQ: tile.q, anchorR: tile.r, rotation: 0, metadata: {} },
  });
  await assert.rejects(
    () => undoHexWorldMutation(scope, removed.undo!.token),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'undo_conflict',
  );
  const current = await getOrCreateHexWorldSnapshot(scope.configId, scope.landId);
  assert.equal(current.buildings.some((building) => building.id === bench.id), false);
  assert.equal(current.buildings.some((building) => building.buildingKey === 'lamp' && building.anchorQ === tile.q && building.anchorR === tile.r), true);
});
