import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNaturalTerrainMesh } from '@/lib/hex-world/natural-terrain';
import type { HexTileDTO } from '@/lib/hex-world/types';

const tile = (q: number, r: number, height = 0, unlocked = true, terrainType: HexTileDTO['terrainType'] = 'grass'): HexTileDTO => ({
  q,
  r,
  height,
  unlocked,
  terrainType,
});

function xzKey(x: number, z: number): string {
  return `${Math.round(x * 100000)}:${Math.round(z * 100000)}`;
}

test('natural terrain generation is deterministic and never mutates authoritative tiles', () => {
  const tiles = [tile(0, 0, 0), tile(1, 0, 0.3, true, 'soil')];
  const before = structuredClone(tiles);
  const first = buildNaturalTerrainMesh(tiles, 'world-seed');
  const second = buildNaturalTerrainMesh(tiles, 'world-seed');

  assert.deepEqual(first, second);
  assert.deepEqual(tiles, before);
  assert.deepEqual([tiles[0].height, tiles[1].height], [0, 0.3]);
  assert.equal(first.boundaryEdges.length, 10, 'two adjacent hexes should expose ten outer edges');
});

test('adjacent terrain triangles position-match every shared XZ corner so the surface cannot crack', () => {
  const mesh = buildNaturalTerrainMesh([
    tile(0, 0, 0),
    tile(1, 0, 0.42),
    tile(0, 1, 0.16),
  ], 'shared-corners');

  const yByXZ = new Map<string, Set<number>>();
  for (let index = 0; index < mesh.positions.length; index += 3) {
    const x = mesh.positions[index];
    const y = mesh.positions[index + 1];
    const z = mesh.positions[index + 2];
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
    const key = xzKey(x, z);
    const values = yByXZ.get(key) ?? new Set<number>();
    values.add(Math.round(y * 100000));
    yByXZ.set(key, values);
  }

  const sharedCornerGroups = [...yByXZ.values()].filter((values) => values.size >= 1);
  assert.ok(sharedCornerGroups.length > 0);
  for (const values of sharedCornerGroups) {
    assert.equal(values.size, 1, 'the same visual XZ corner must resolve to exactly one Y value');
  }
});

test('locked tiles do not contribute visible terrain or island boundary ownership', () => {
  const mesh = buildNaturalTerrainMesh([
    tile(0, 0, 0, true),
    tile(1, 0, 0.2, false),
  ], 'locked-tile');

  assert.deepEqual(Object.keys(mesh.tileCenters), ['0:0']);
  assert.equal(mesh.indices.length, 18, 'one visible hex should emit six triangles');
  assert.equal(mesh.boundaryEdges.length, 6);
});

test('terrain output is finite and classifies every emitted vertex with a color', () => {
  const mesh = buildNaturalTerrainMesh([
    tile(0, 0, 0, true, 'grass'),
    tile(1, 0, 0.2, true, 'soil'),
    tile(0, 1, -0.1, true, 'stone'),
    tile(-1, 1, -0.04, true, 'water'),
  ], 'finite-output');

  assert.equal(mesh.positions.length, mesh.colors.length);
  assert.equal(mesh.positions.length % 3, 0);
  assert.equal(mesh.indices.length % 3, 0);
  for (const value of [...mesh.positions, ...mesh.colors]) assert.ok(Number.isFinite(value));
  for (const index of mesh.indices) assert.ok(index >= 0 && index < mesh.positions.length / 3);
});
