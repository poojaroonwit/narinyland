import assert from 'node:assert/strict';
import test from 'node:test';
import { getExploreInteractionTarget, HEX_EXPLORE_INTERACTION_RADIUS } from '@/lib/hex-world/explore-interactions';
import type { HexBuildingDTO } from '@/lib/hex-world/types';

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

const resident = (
  residentId: 'partner-1' | 'partner-2' | 'child' | 'pet',
  role: 'partner' | 'child' | 'pet',
  x: number,
  z: number,
  petKind?: 'cat' | 'dog',
) => ({ residentId, role, x, z, ...(petKind ? { petKind } : {}) });

test('resident and building candidates share exact 1.7 radius and nearest wins', () => {
  assert.equal(HEX_EXPLORE_INTERACTION_RADIUS, 1.7);
  const target = getExploreInteractionTarget(
    { x: 0, z: 0 },
    [building('home', 'home', 1, 0)],
    [resident('partner-1', 'partner', 0.6, 0)],
  );
  assert.equal(target?.kind, 'resident');
  assert.equal(target?.id, 'resident:partner-1');
  assert.equal(target?.residentId, 'partner-1');
});

test('stable target id resolves exact-distance ties instead of array order', () => {
  const target = getExploreInteractionTarget(
    { x: 0, z: 0 },
    [],
    [resident('partner-2', 'partner', 1, 0), resident('partner-1', 'partner', -1, 0)],
  );
  assert.equal(target?.id, 'resident:partner-1');
});

test('resident outside 1.7 radius is ignored and height is irrelevant', () => {
  assert.equal(getExploreInteractionTarget({ x: 0, z: 0, y: 999 } as never, [], [resident('child', 'child', 1.71, 0)]), null);
  const target = getExploreInteractionTarget({ x: 0, z: 0, y: 999 } as never, [], [resident('pet', 'pet', 1.2, 0, 'cat')]);
  assert.equal(target?.kind, 'resident');
  assert.equal(target?.petKind, 'cat');
});

test('existing building targeting remains available as a discriminated building target', () => {
  const target = getExploreInteractionTarget({ x: 0, z: 0 }, [building('home', 'home', 0, 0)], []);
  assert.equal(target?.kind, 'building');
  assert.equal(target?.id, 'building:home');
  assert.equal(target?.buildingId, 'home');
});
