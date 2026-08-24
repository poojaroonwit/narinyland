import assert from 'node:assert/strict';
import test from 'node:test';
import type { HexBuildingDTO } from '@/lib/hex-world/types';

async function loadInteractions() {
  try {
    return await import('@/lib/hex-world/explore-interactions');
  } catch {
    assert.fail('Explore interactions module must exist');
  }
}

function building(id: string, buildingKey: string, q: number, r: number): HexBuildingDTO {
  return {
    id,
    worldId: 'world',
    buildingKey,
    anchorQ: q,
    anchorR: r,
    rotation: 0,
    modelUrl: null,
    metadata: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as HexBuildingDTO;
}

test('nearest supported interaction target inside 1.7 wins', async () => {
  const { getExploreInteractionTarget, HEX_EXPLORE_INTERACTION_RADIUS } = await loadInteractions();
  const target = getExploreInteractionTarget({ x: 0, z: 0 }, [
    building('b', 'pond', 1, 0),
    building('a', 'home', 0, 0),
  ]);

  assert.equal(HEX_EXPLORE_INTERACTION_RADIUS, 1.7);
  assert.equal(target?.buildingId, 'a');
  assert.equal(target?.role, 'home');
});

test('target outside radius is ignored', async () => {
  const { getExploreInteractionTarget } = await loadInteractions();
  assert.equal(getExploreInteractionTarget({ x: 20, z: 20 }, [building('a', 'home', 0, 0)]), null);
});

test('unsupported building type is ignored', async () => {
  const { getExploreInteractionTarget } = await loadInteractions();
  assert.equal(getExploreInteractionTarget({ x: 0, z: 0 }, [building('lamp', 'lamp', 0, 0)]), null);
});

test('exact-distance ties resolve by building id', async () => {
  const { getExploreInteractionTarget } = await loadInteractions();
  const target = getExploreInteractionTarget({ x: 0, z: 0 }, [
    building('z', 'home', 0, 0),
    building('a', 'pond', 0, 0),
  ]);
  assert.equal(target?.buildingId, 'a');
});

test('height does not affect horizontal targeting', async () => {
  const { getExploreInteractionTarget } = await loadInteractions();
  const target = getExploreInteractionTarget({ x: 0, z: 0, y: 999 } as { x: number; z: number }, [building('home', 'home', 0, 0)]);
  assert.equal(target?.buildingId, 'home');
});
