import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPlacementMessage } from '@/lib/hex-world/placement-message';
import { clampScreenPoint } from '@/lib/hex-world/screen-space';

test('placement errors map to concise user-facing reasons', () => {
  assert.equal(getPlacementMessage('tile_occupied'), 'Occupied');
  assert.equal(getPlacementMessage('invalid_terrain'), 'Needs compatible terrain');
  assert.equal(getPlacementMessage('tile_locked'), 'Outside unlocked land');
  assert.equal(getPlacementMessage('invalid_rotation'), 'Rotation unavailable');
});

test('screen-space actions clamp inside small viewport', () => {
  const clamped = clampScreenPoint({ x: -10, y: 900 }, { width: 390, height: 844 }, 16);
  assert.ok(clamped.x >= 16 && clamped.x <= 374);
  assert.ok(clamped.y >= 16 && clamped.y <= 828);
});
