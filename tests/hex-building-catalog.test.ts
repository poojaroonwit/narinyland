import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILDING_CATALOG, getBuildingFootprint } from '@/lib/hex-world/building-catalog';

test('catalog exposes exactly the MVP building keys', () => {
  assert.deepEqual(Object.keys(BUILDING_CATALOG).sort(), [
    'bench', 'fence', 'flower_patch', 'garden_patch', 'home', 'lamp',
    'pond', 'stone_path', 'storage', 'tree', 'workshop',
  ]);
});

test('starter home is protected and multi-hex', () => {
  const home = BUILDING_CATALOG.home;
  assert.equal(home.removable, false);
  assert.ok(home.footprint.length > 1);
  assert.deepEqual(home.allowedRotations, [0, 1, 2, 3, 4, 5]);
});

test('footprint rotation keeps cell count stable', () => {
  const original = getBuildingFootprint('workshop', { q: 0, r: 0 }, 0);
  const rotated = getBuildingFootprint('workshop', { q: 0, r: 0 }, 3);
  assert.equal(rotated.length, original.length);
  assert.equal(new Set(rotated.map(({ q, r }) => `${q}:${r}`)).size, original.length);
});
