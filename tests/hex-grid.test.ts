import assert from 'node:assert/strict';
import { test } from 'node:test';
import { axialToWorld, hexDistance, hexNeighbors, rotateHexOffset, worldToAxial } from '@/lib/hex-world/hex-grid';

test('axial origin round-trips through world space', () => {
  const world = axialToWorld({ q: 0, r: 0 });
  assert.deepEqual(worldToAxial(world.x, world.z), { q: 0, r: 0 });
});

test('non-origin axial coordinates round-trip through world space', () => {
  for (const coord of [{ q: 3, r: -2 }, { q: -7, r: 4 }, { q: 9, r: 9 }]) {
    const world = axialToWorld(coord);
    assert.deepEqual(worldToAxial(world.x, world.z), coord);
  }
});

test('hex neighbors are six unique adjacent cells', () => {
  const neighbors = hexNeighbors({ q: 0, r: 0 });
  assert.equal(new Set(neighbors.map(({ q, r }) => `${q}:${r}`)).size, 6);
  assert.ok(neighbors.every((coord) => hexDistance({ q: 0, r: 0 }, coord) === 1));
});

test('six rotations return an offset to its origin', () => {
  let coord = { q: 2, r: -1 };
  for (let i = 0; i < 6; i += 1) coord = rotateHexOffset(coord, 1);
  assert.deepEqual(coord, { q: 2, r: -1 });
});
