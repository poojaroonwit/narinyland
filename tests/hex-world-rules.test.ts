import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validatePlacement } from '@/lib/hex-world/rules';

const unlockedGrass = { q: 4, r: 4, terrainType: 'grass' as const, unlocked: true };

test('placement rejects locked tiles', () => {
  const result = validatePlacement({
    buildingKey: 'bench',
    anchor: { q: 4, r: 4 },
    rotation: 0,
    tiles: [{ ...unlockedGrass, unlocked: false }],
    buildings: [],
  });
  assert.deepEqual(result, { ok: false, code: 'tile_locked' });
});

test('placement rejects occupied tiles', () => {
  const result = validatePlacement({
    buildingKey: 'bench',
    anchor: { q: 4, r: 4 },
    rotation: 0,
    tiles: [unlockedGrass],
    buildings: [{ id: 'existing', buildingKey: 'tree', anchorQ: 4, anchorR: 4, rotation: 0 }],
  });
  assert.deepEqual(result, { ok: false, code: 'tile_occupied' });
});

test('placement rejects invalid terrain', () => {
  const result = validatePlacement({
    buildingKey: 'tree',
    anchor: { q: 4, r: 4 },
    rotation: 0,
    tiles: [{ q: 4, r: 4, terrainType: 'water', unlocked: true }],
    buildings: [],
  });
  assert.deepEqual(result, { ok: false, code: 'invalid_terrain' });
});

test('placement rejects invalid rotation', () => {
  const result = validatePlacement({ buildingKey: 'bench', anchor: { q: 4, r: 4 }, rotation: 6, tiles: [unlockedGrass], buildings: [] });
  assert.deepEqual(result, { ok: false, code: 'invalid_rotation' });
});

test('moving a building can ignore its own occupied cell', () => {
  const result = validatePlacement({
    buildingKey: 'bench',
    anchor: { q: 4, r: 4 },
    rotation: 0,
    tiles: [unlockedGrass],
    buildings: [{ id: 'self', buildingKey: 'bench', anchorQ: 4, anchorR: 4, rotation: 0 }],
    ignoreBuildingId: 'self',
  });
  assert.equal(result.ok, true);
});
