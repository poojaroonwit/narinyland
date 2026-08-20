import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getExpansionDefinitions } from '@/lib/hex-world/expansions';
import { generateStarterWorld } from '@/lib/hex-world/generator';
import { hexKey, isConnectedHexSet } from '@/lib/hex-world/hex-grid';

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

test('starter island contains the approved visible homestead composition', () => {
  const generated = generateStarterWorld('land-123');
  const features = generated.tiles.map((tile) => tile.metadata?.feature).filter(Boolean);
  const decor = generated.tiles.map((tile) => tile.metadata?.decor).filter(Boolean);
  assert.ok(features.includes('pond'));
  assert.ok(features.includes('garden'));
  assert.ok(features.includes('path'));
  assert.ok(features.includes('tree_grove'));
  assert.ok(features.includes('rock_cluster'));
  assert.ok(features.includes('flower_cluster'));
  assert.ok(decor.includes('tree'));
  assert.ok(decor.includes('rock'));
  assert.ok(decor.includes('flower'));
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

test('expansion clusters never overlap between edge directions', () => {
  for (const seed of ['land-0', 'land-17', 'land-123', 'land-999']) {
    const definitions = getExpansionDefinitions(seed);
    for (let i = 0; i < definitions.length; i += 1) {
      for (let j = i + 1; j < definitions.length; j += 1) {
        if (definitions[i].directionIndex === definitions[j].directionIndex) continue;
        const occupied = new Set(definitions[i].tiles.map(hexKey));
        assert.equal(definitions[j].tiles.some((tile) => occupied.has(hexKey(tile))), false);
      }
    }
  }
});
