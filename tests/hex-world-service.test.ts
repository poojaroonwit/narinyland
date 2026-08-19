import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOrCreateHexWorldSnapshotWithClient, HexWorldServiceError } from '@/lib/hex-world/service';

function makeHexWorldFake(input: { land: { id: string; configId: string; items: unknown[] } }) {
  let world: any = null;
  let sequence = 0;
  return {
    legacyItemsDeleted: 0,
    land: {
      findFirst: async ({ where }: any) => where.id === input.land.id && where.configId === input.land.configId ? { id: input.land.id } : null,
    },
    hexWorld: {
      findUnique: async ({ where }: any) => where.landId === input.land.id ? world : null,
      create: async ({ data }: any) => {
        world = {
          id: 'world-1', landId: data.landId, seed: data.seed,
          schemaVersion: data.schemaVersion ?? 1, generatorVersion: data.generatorVersion ?? 1,
          expansionLevel: 0,
          tiles: data.tiles.createMany.data.map((tile: any) => ({ id: `tile-${++sequence}`, worldId: 'world-1', ...tile })),
          buildings: data.buildings.create.map((building: any) => ({ id: `building-${++sequence}`, worldId: 'world-1', modelUrl: null, ...building })),
          expansions: [],
        };
        return world;
      },
    },
    partner: { aggregate: async () => ({ _sum: { points: 0 } }) },
  };
}

test('lazy initialization preserves legacy purchased items', async () => {
  const fake = makeHexWorldFake({ land: { id: 'land-1', configId: 'circle-1', items: [{ id: 'legacy-1', type: 'tree' }] } });
  const snapshot = await getOrCreateHexWorldSnapshotWithClient(fake as any, 'circle-1', 'land-1');
  assert.equal(snapshot.world.landId, 'land-1');
  assert.equal(fake.legacyItemsDeleted, 0);
  assert.equal(snapshot.buildings.filter((item) => item.buildingKey === 'home').length, 1);
  assert.ok(snapshot.tiles.length >= 260 && snapshot.tiles.length <= 340);
});

test('lazy initialization is stable on repeated reads', async () => {
  const fake = makeHexWorldFake({ land: { id: 'land-1', configId: 'circle-1', items: [] } });
  const first = await getOrCreateHexWorldSnapshotWithClient(fake as any, 'circle-1', 'land-1');
  const second = await getOrCreateHexWorldSnapshotWithClient(fake as any, 'circle-1', 'land-1');
  assert.equal(first.world.id, second.world.id);
  assert.equal(first.tiles.length, second.tiles.length);
});

test('wrong-config Land is rejected', async () => {
  const fake = makeHexWorldFake({ land: { id: 'land-1', configId: 'circle-1', items: [] } });
  await assert.rejects(
    () => getOrCreateHexWorldSnapshotWithClient(fake as any, 'circle-other', 'land-1'),
    (error: unknown) => error instanceof HexWorldServiceError && error.code === 'land_access_denied' && error.status === 403,
  );
});
