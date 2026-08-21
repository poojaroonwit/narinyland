import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import prisma from '@/lib/prisma';
import {
  expandHexWorld,
  getOrCreateHexWorldSnapshot,
  HexWorldServiceError,
  moveHexExpansion,
  placeHexBuilding,
  removeHexBuilding,
  updateHexBuilding,
} from '@/lib/hex-world/service';
import { getExpansionPlacementTiles, validateExpansionPlacement } from '@/lib/hex-world/expansions';
import { hexKey } from '@/lib/hex-world/hex-grid';
import { validatePlacement } from '@/lib/hex-world/rules';
import type { HexCoord, HexWorldSnapshot } from '@/lib/hex-world/types';

const createdConfigIds: string[] = [];

after(async () => {
  for (const id of createdConfigIds) {
    await prisma.appConfig.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

async function createFixture() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const configId = `hex-db-${suffix}`;
  createdConfigIds.push(configId);
  await prisma.appConfig.create({ data: { id: configId } });
  const land = await prisma.land.create({ data: { name: 'Integration Land', isActive: true, configId } });
  await prisma.partner.createMany({
    data: [
      { partnerId: 'partner1', userId: `user-a-${suffix}`, name: 'A', avatar: 'A', configId, points: 70, lifetimePoints: 70 },
      { partnerId: 'partner2', userId: `user-b-${suffix}`, name: 'B', avatar: 'B', configId, points: 50, lifetimePoints: 50 },
    ],
  });
  const legacy = await prisma.purchasedItem.create({ data: { type: 'legacy-tree', landId: land.id } });
  return { configId, landId: land.id, legacyId: legacy.id };
}

function findFreeBenchCell(snapshot: Awaited<ReturnType<typeof getOrCreateHexWorldSnapshot>>) {
  for (const tile of snapshot.tiles) {
    const result = validatePlacement({
      buildingKey: 'bench',
      anchor: { q: tile.q, r: tile.r },
      rotation: 0,
      tiles: snapshot.tiles,
      buildings: snapshot.buildings,
    });
    if (result.ok) return tile;
  }
  throw new Error('No free bench cell found');
}

function centerOf(coords: HexCoord[]): HexCoord {
  return {
    q: Math.round(coords.reduce((sum, coord) => sum + coord.q, 0) / coords.length),
    r: Math.round(coords.reduce((sum, coord) => sum + coord.r, 0) / coords.length),
  };
}

function findDifferentMoveAnchor(snapshot: HexWorldSnapshot, expansionKey: string, tier: 1 | 2 | 3, currentTiles: HexCoord[]) {
  const currentKeys = new Set(currentTiles.map(hexKey));
  for (let q = -24; q <= 24; q += 1) {
    for (let r = -24; r <= 24; r += 1) {
      const anchor = { q, r };
      const cells = getExpansionPlacementTiles(tier, anchor);
      const same = cells.every((cell) => currentKeys.has(hexKey(cell)));
      if (same) continue;
      if (validateExpansionPlacement(cells, snapshot.tiles, { ignoreExpansionKey: expansionKey }).ok) return anchor;
    }
  }
  throw new Error('No alternate expansion move anchor found');
}

test('lazy initialization preserves legacy items and protects starter Home', async () => {
  const fixture = await createFixture();
  const snapshot = await getOrCreateHexWorldSnapshot(fixture.configId, fixture.landId);
  assert.ok(snapshot.tiles.length >= 260 && snapshot.tiles.length <= 340);
  assert.equal(await prisma.purchasedItem.count({ where: { id: fixture.legacyId } }), 1);

  const home = snapshot.buildings.find((building) => building.buildingKey === 'home');
  assert.ok(home);
  await assert.rejects(
    () => removeHexBuilding(fixture.configId, fixture.landId, home.id),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'home_locked',
  );
});

test('reversible building mutations increment world revision exactly once', async () => {
  const fixture = await createFixture();
  const before = await getOrCreateHexWorldSnapshot(fixture.configId, fixture.landId);
  assert.equal(before.world.revision, 0);
  const tile = findFreeBenchCell(before);
  const placed = await placeHexBuilding(fixture.configId, fixture.landId, { buildingKey: 'bench', anchorQ: tile.q, anchorR: tile.r, rotation: 0 });
  assert.equal(placed.snapshot.world.revision, 1);
  const bench = placed.snapshot.buildings.find((building) => building.buildingKey === 'bench');
  assert.ok(bench);
  const rotated = await updateHexBuilding(fixture.configId, fixture.landId, bench.id, { rotation: 1 });
  assert.equal(rotated.snapshot.world.revision, 2);
  const removed = await removeHexBuilding(fixture.configId, fixture.landId, bench.id);
  assert.equal(removed.snapshot.world.revision, 3);
  const readAgain = await getOrCreateHexWorldSnapshot(fixture.configId, fixture.landId);
  assert.equal(readAgain.world.revision, 3);
});

test('concurrent placement serializes so only one building occupies a hex', async () => {
  const fixture = await createFixture();
  const snapshot = await getOrCreateHexWorldSnapshot(fixture.configId, fixture.landId);
  const tile = findFreeBenchCell(snapshot);
  const mutation = () => placeHexBuilding(fixture.configId, fixture.landId, {
    buildingKey: 'bench', anchorQ: tile.q, anchorR: tile.r, rotation: 0,
  });

  const results = await Promise.allSettled([mutation(), mutation()]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  assert.ok(rejected.reason instanceof HexWorldServiceError);
  assert.equal(rejected.reason.code, 'tile_occupied');

  const world = await prisma.hexWorld.findUniqueOrThrow({ where: { landId: fixture.landId } });
  assert.equal(await prisma.hexBuilding.count({ where: { worldId: world.id, buildingKey: 'bench' } }), 1);
});

test('expansion charges once, is idempotent, and rolls back when Points are insufficient', async () => {
  const fixture = await createFixture();
  const before = await getOrCreateHexWorldSnapshot(fixture.configId, fixture.landId);
  const expansion = before.expansions.find((item) => item.pointCost === 100);
  assert.ok(expansion);

  const expanded = await expandHexWorld(fixture.configId, fixture.landId, expansion.expansionKey);
  assert.equal(expanded.points, 20);
  const world = await prisma.hexWorld.findUniqueOrThrow({ where: { landId: fixture.landId } });
  const tileCountAfterPurchase = await prisma.hexTile.count({ where: { worldId: world.id } });
  assert.equal(await prisma.hexExpansion.count({ where: { worldId: world.id, expansionKey: expansion.expansionKey } }), 1);

  const repeated = await expandHexWorld(fixture.configId, fixture.landId, expansion.expansionKey);
  assert.equal(repeated.points, 20);
  assert.equal(await prisma.hexTile.count({ where: { worldId: world.id } }), tileCountAfterPurchase);
  assert.equal(await prisma.hexExpansion.count({ where: { worldId: world.id, expansionKey: expansion.expansionKey } }), 1);

  const unavailableByBalance = repeated.expansions.find((item) => item.pointCost >= 100);
  assert.ok(unavailableByBalance);
  const expansionCountBeforeFailure = await prisma.hexExpansion.count({ where: { worldId: world.id } });
  await assert.rejects(
    () => expandHexWorld(fixture.configId, fixture.landId, unavailableByBalance.expansionKey),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'not_enough_points',
  );
  assert.equal(await prisma.hexExpansion.count({ where: { worldId: world.id } }), expansionCountBeforeFailure);
  assert.equal(await prisma.hexTile.count({ where: { worldId: world.id } }), tileCountAfterPurchase);
  const remainingPoints = await prisma.partner.aggregate({ where: { configId: fixture.configId }, _sum: { points: true } });
  assert.equal(remainingPoints._sum.points, 20);
});

test('explicit expansion placement persists, rejected placement does not spend Points, and empty purchased land can move for free', async () => {
  const fixture = await createFixture();
  const before = await getOrCreateHexWorldSnapshot(fixture.configId, fixture.landId);
  const expansion = before.expansions.find((item) => item.tier === 1);
  assert.ok(expansion);

  await assert.rejects(
    () => expandHexWorld(fixture.configId, fixture.landId, expansion.expansionKey, 100, 100),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'expansion_disconnected',
  );
  const pointsAfterRejectedPlacement = await prisma.partner.aggregate({ where: { configId: fixture.configId }, _sum: { points: true } });
  assert.equal(pointsAfterRejectedPlacement._sum.points, 120);

  const purchaseAnchor = centerOf(expansion.tiles);
  const purchased = await expandHexWorld(fixture.configId, fixture.landId, expansion.expansionKey, purchaseAnchor.q, purchaseAnchor.r);
  assert.equal(purchased.points, 20);
  const purchasedCluster = purchased.purchasedExpansions?.find((item) => item.expansionKey === expansion.expansionKey);
  assert.ok(purchasedCluster);
  assert.equal(purchasedCluster.tiles.length, 7);
  assert.equal(purchasedCluster.movable, true);

  const moveAnchor = findDifferentMoveAnchor(purchased, purchasedCluster.expansionKey, purchasedCluster.tier, purchasedCluster.tiles);
  const moved = await moveHexExpansion(fixture.configId, fixture.landId, purchasedCluster.expansionKey, moveAnchor.q, moveAnchor.r);
  assert.equal(moved.points, 20);
  const movedCluster = moved.purchasedExpansions?.find((item) => item.expansionKey === purchasedCluster.expansionKey);
  assert.ok(movedCluster);
  assert.equal(movedCluster.tiles.length, 7);
  assert.deepEqual(new Set(movedCluster.tiles.map(hexKey)), new Set(getExpansionPlacementTiles(1, moveAnchor).map(hexKey)));

  const benchTile = movedCluster.tiles.find((coord) => validatePlacement({
    buildingKey: 'bench',
    anchor: coord,
    rotation: 0,
    tiles: moved.tiles,
    buildings: moved.buildings,
  }).ok);
  assert.ok(benchTile);
  const withBench = await placeHexBuilding(fixture.configId, fixture.landId, { buildingKey: 'bench', anchorQ: benchTile.q, anchorR: benchTile.r, rotation: 0 });
  const occupiedCluster = withBench.snapshot.purchasedExpansions?.find((item) => item.expansionKey === purchasedCluster.expansionKey);
  assert.ok(occupiedCluster);
  assert.equal(occupiedCluster.hasBuildings, true);
  assert.equal(occupiedCluster.movable, false);

  const blockedMoveAnchor = findDifferentMoveAnchor(withBench.snapshot, purchasedCluster.expansionKey, purchasedCluster.tier, occupiedCluster.tiles);
  await assert.rejects(
    () => moveHexExpansion(fixture.configId, fixture.landId, purchasedCluster.expansionKey, blockedMoveAnchor.q, blockedMoveAnchor.r),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'expansion_has_buildings',
  );
  const pointsAfterBlockedMove = await prisma.partner.aggregate({ where: { configId: fixture.configId }, _sum: { points: true } });
  assert.equal(pointsAfterBlockedMove._sum.points, 20);
});
