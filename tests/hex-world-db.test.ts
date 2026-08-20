import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import prisma from '@/lib/prisma';
import {
  expandHexWorld,
  getOrCreateHexWorldSnapshot,
  HexWorldServiceError,
  placeHexBuilding,
  removeHexBuilding,
  updateHexBuilding,
} from '@/lib/hex-world/service';
import { validatePlacement } from '@/lib/hex-world/rules';

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
