import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIslandCliffMesh } from '@/lib/hex-world/island-boundary';
import { buildNaturalTerrainMesh } from '@/lib/hex-world/natural-terrain';
import { getOverviewCameraPose, getUnlockedIslandBounds } from '@/lib/hex-world/camera';
import type { HexTileDTO } from '@/lib/hex-world/types';

const tile = (q: number, r: number, height = 0): HexTileDTO => ({ q, r, height, unlocked: true, terrainType: 'grass' });

function triangleEdgeCounts(indices: number[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (let index = 0; index < indices.length; index += 3) {
    const triangle = [indices[index], indices[index + 1], indices[index + 2]];
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge];
      const b = triangle[(edge + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

test('floating island has a visibly deep core instead of the previous shallow edge skirt', () => {
  const terrain = buildNaturalTerrainMesh([
    tile(0, 0, 0.15), tile(1, 0, 0.1), tile(0, 1, 0.05),
    tile(-1, 1, 0.08), tile(-1, 0, 0.02), tile(0, -1, 0.06),
  ], 'deep-solid-island');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'deep-solid-island');
  const ys = cliff.positions.filter((_, index) => index % 3 === 1);
  assert.ok(Math.min(...ys) < -8.5, `expected a visibly deep underside, got ${Math.min(...ys)}`);
  assert.ok(Math.min(...ys) > -13.5, 'island depth must remain bounded');
});

test('lower contour continues into underside geometry instead of ending as an open ring', () => {
  const terrain = buildNaturalTerrainMesh([tile(0, 0)], 'closed-core');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'closed-core');
  const edgeCounts = triangleEdgeCounts(cliff.indices);

  terrain.boundaryEdges.forEach((_, edgeIndex) => {
    const lowerStart = edgeIndex * 12 + 10;
    const lowerEnd = edgeIndex * 12 + 11;
    const key = `${Math.min(lowerStart, lowerEnd)}:${Math.max(lowerStart, lowerEnd)}`;
    assert.ok((edgeCounts.get(key) ?? 0) >= 2, `lower contour edge ${edgeIndex} must continue into the underside core`);
  });
});

test('underside reaches the island interior instead of remaining only around the boundary', () => {
  const terrain = buildNaturalTerrainMesh([
    tile(0, 0), tile(1, 0), tile(0, 1), tile(-1, 1), tile(-1, 0), tile(0, -1), tile(1, -1),
  ], 'solid-core');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'solid-core');
  const boundaryRadius = Math.max(...terrain.boundaryEdges.flatMap((edge) => [Math.hypot(edge.start[0], edge.start[2]), Math.hypot(edge.end[0], edge.end[2])]));
  let hasDeepInterior = false;
  for (let index = 0; index < cliff.positions.length; index += 3) {
    const x = cliff.positions[index];
    const y = cliff.positions[index + 1];
    const z = cliff.positions[index + 2];
    if (y < -5 && Math.hypot(x, z) < boundaryRadius * 0.2) hasDeepInterior = true;
  }
  assert.equal(hasDeepInterior, true, 'expected deep underside geometry near the island core');
});

test('World overview aims through the floating island body rather than lifting above the land top', () => {
  const bounds = getUnlockedIslandBounds([tile(-5, 0), tile(5, 0)]);
  const overview = getOverviewCameraPose(bounds, 16 / 9);
  const vertical = overview.position[1] - overview.target[1];
  const lateral = Math.abs(overview.position[0] - overview.target[0]);
  assert.ok(overview.target[1] < bounds.center[1] - 0.4, 'overview target should sit inside the island body');
  assert.ok(vertical / lateral < 0.5, 'overview should be substantially less top-down');
});
