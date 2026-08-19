import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getExpansionDefinitions } from '@/lib/hex-world/expansions';
import { generateStarterWorld } from '@/lib/hex-world/generator';
import { isConnectedHexSet } from '@/lib/hex-world/hex-grid';

test('starter envelope is exactly 20x20', () => {
  const generated = generateStarterWorld('land-123');
  assert.equal(generated.candidates.length, 400);
  assert.ok(generated.candidates.every(({ q, r }) => q >= -10 && q <= 9 && r >= -10 && r <= 9));
});

test('starter island is connected and within target size', () => {
  const generated = generateStarterWorld('land-123');
  assert.ok(generated.tiles.length >= 260 && generated.tiles.length <= 340);
  assert.equal(isConnectedHexSet(generated.tiles), true);
});

test('starter generation is deterministic', () => {
  assert.deepEqual(generateStarterWorld('land-123'), generateStarterWorld('land-123'));
});

test('starter home is fixed at origin', () => {
  assert.deepEqual(generateStarterWorld('land-123').buildings[0], {
    buildingKey: 'home', anchorQ: 0, anchorR: 0, rotation: 0, metadata: { starter: true },
  });
});

test('expansion definitions use fixed 7/19/37 sizes and costs', () => {
  const definitions = getExpansionDefinitions('land-123');
  assert.equal(definitions.length, 18);
  for (const directionIndex of [0, 1, 2, 3, 4, 5]) {
    const direction = definitions.filter((item) => item.directionIndex === directionIndex);
    assert.deepEqual(direction.map((item) => item.tiles.length), [7, 19, 37]);
    assert.deepEqual(direction.map((item) => item.pointCost), [100, 250, 500]);
    assert.ok(direction.every((item) => isConnectedHexSet(item.tiles)));
  }
});
