import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNaturalTerrainMesh } from '@/lib/hex-world/natural-terrain';
import { buildIslandCliffMesh } from '@/lib/hex-world/island-boundary';
import type { HexTileDTO } from '@/lib/hex-world/types';

const tile = (q: number, r: number, height = 0): HexTileDTO => ({ q, r, height, unlocked: true, terrainType: 'grass' });

test('island cliff mesh is deterministic finite and does not mutate boundary input', () => {
  const terrain = buildNaturalTerrainMesh([tile(0, 0), tile(1, 0, 0.18), tile(0, 1, 0.08)], 'cliff-seed');
  const before = structuredClone(terrain.boundaryEdges);
  const first = buildIslandCliffMesh(terrain.boundaryEdges, 'cliff-seed');
  const second = buildIslandCliffMesh(terrain.boundaryEdges, 'cliff-seed');

  assert.deepEqual(first, second);
  assert.deepEqual(terrain.boundaryEdges, before);
  assert.ok(first.positions.length > 0);
  assert.equal(first.positions.length, first.colors.length);
  assert.equal(first.positions.length % 3, 0);
  assert.equal(first.indices.length % 3, 0);
  for (const value of [...first.positions, ...first.colors]) assert.ok(Number.isFinite(value));
});

test('cliff top vertices stay on the natural terrain boundary and lower strata descend', () => {
  const terrain = buildNaturalTerrainMesh([tile(0, 0, 0.22)], 'single-island');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'single-island');
  const topBoundary = new Set(terrain.boundaryEdges.flatMap((edge) => [edge.start, edge.end]).map(([x, y, z]) => `${x.toFixed(5)}:${y.toFixed(5)}:${z.toFixed(5)}`));

  let matchedTop = 0;
  let hasLowerVertex = false;
  for (let index = 0; index < cliff.positions.length; index += 3) {
    const point = cliff.positions.slice(index, index + 3);
    const key = `${point[0].toFixed(5)}:${point[1].toFixed(5)}:${point[2].toFixed(5)}`;
    if (topBoundary.has(key)) matchedTop += 1;
    if (point[1] < -0.9) hasLowerVertex = true;
  }
  assert.ok(matchedTop >= terrain.boundaryEdges.length * 2);
  assert.equal(hasLowerVertex, true);
});

test('cliff underside tapers inward instead of flaring away from the island', () => {
  const terrain = buildNaturalTerrainMesh([tile(0, 0)], 'taper');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'taper');
  const radii: Array<{ y: number; radius: number }> = [];
  for (let index = 0; index < cliff.positions.length; index += 3) {
    const x = cliff.positions[index];
    const y = cliff.positions[index + 1];
    const z = cliff.positions[index + 2];
    radii.push({ y, radius: Math.hypot(x, z) });
  }
  const top = radii.filter((sample) => sample.y > -0.1).reduce((sum, sample) => sum + sample.radius, 0) / Math.max(1, radii.filter((sample) => sample.y > -0.1).length);
  const bottomSamples = radii.filter((sample) => sample.y < -1);
  const bottom = bottomSamples.reduce((sum, sample) => sum + sample.radius, 0) / Math.max(1, bottomSamples.length);
  assert.ok(bottom < top, `expected bottom radius ${bottom} to be less than top radius ${top}`);
});
