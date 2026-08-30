import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFloatingIslandFragmentPlacements } from '@/lib/hex-world/floating-island-composition';
import type { HexIslandBounds } from '@/lib/hex-world/camera';

const bounds: HexIslandBounds = {
  minX: -6,
  maxX: 6,
  minZ: -5,
  maxZ: 5,
  center: [0, 0, 0],
  radius: 8,
};

test('floating fragment composition is deterministic and quality bounded', () => {
  const high = buildFloatingIslandFragmentPlacements({ bounds, seed: 'island', quality: 'high' });
  const medium = buildFloatingIslandFragmentPlacements({ bounds, seed: 'island', quality: 'medium' });
  const mobile = buildFloatingIslandFragmentPlacements({ bounds, seed: 'island', quality: 'mobile' });
  assert.deepEqual(high, buildFloatingIslandFragmentPlacements({ bounds, seed: 'island', quality: 'high' }));
  assert.equal(high.length, 10);
  assert.equal(medium.length, 7);
  assert.equal(mobile.length, 4);
  assert.ok(mobile.length < high.length);
});

test('fragments stay below the playable top and vary in distance scale and height', () => {
  const items = buildFloatingIslandFragmentPlacements({ bounds, seed: 'composition', quality: 'high' });
  assert.ok(items.every((item) => item.position[1] <= -2.4));
  assert.ok(items.every((item) => Number.isFinite(item.position[0] + item.position[1] + item.position[2] + item.scale)));
  assert.ok(new Set(items.map((item) => item.position[1].toFixed(1))).size >= 4);
  assert.ok(new Set(items.map((item) => item.scale.toFixed(2))).size >= 4);
  const radii = items.map((item) => Math.hypot(item.position[0] - bounds.center[0], item.position[2] - bounds.center[2]));
  assert.ok(Math.max(...radii) - Math.min(...radii) > bounds.radius * 0.2);
});
