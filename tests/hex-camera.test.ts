import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBuildCameraPose, getFocusCameraPose, getOpeningCameraPose, getOverviewCameraPose, getUnlockedIslandBounds, shouldReframeForCoords } from '@/lib/hex-world/camera';
import type { HexTileDTO } from '@/lib/hex-world/types';

const tile = (q: number, r: number, height = 0) => ({ q, r, terrainType: 'grass' as const, height, unlocked: true });

const motionTiles = [
  { q: 0, r: 0, height: 0, unlocked: true, terrainType: 'grass' },
  { q: 4, r: -2, height: 0.15, unlocked: true, terrainType: 'grass' },
] as HexTileDTO[];

test('overview camera frames unlocked island around its actual bounds', () => {
  const bounds = getUnlockedIslandBounds([tile(-2, 0), tile(3, 1, 0.2)]);
  const pose = getOverviewCameraPose(bounds, 16 / 9);
  assert.ok(bounds.radius > 0);
  assert.ok(pose.position[1] > 0);
  assert.ok(pose.distance >= bounds.radius * 1.6);
  assert.equal(shouldReframeForCoords(bounds, [{ q: 3, r: 1 }]), false);
  assert.equal(shouldReframeForCoords(bounds, [{ q: 20, r: 20 }]), true);
});

test('overview uses a lower handcrafted diorama angle without losing portrait framing', () => {
  const bounds = getUnlockedIslandBounds([tile(-5, 0), tile(5, 0)]);
  const landscape = getOverviewCameraPose(bounds, 16 / 9);
  const portrait = getOverviewCameraPose(bounds, 9 / 16);
  const lateral = Math.abs(landscape.position[0] - landscape.target[0]);
  const vertical = Math.abs(landscape.position[1] - landscape.target[1]);

  assert.ok(lateral > vertical, 'landscape overview should feel more lateral than top-down');
  assert.ok(portrait.distance > landscape.distance, 'portrait framing keeps the existing distance penalty');
});

test('empty world uses a stable overview fallback', () => {
  const bounds = getUnlockedIslandBounds([]);
  assert.deepEqual(bounds.center, [0, 0, 0]);
  assert.equal(bounds.radius, 5);
  const pose = getOverviewCameraPose(bounds, 1);
  assert.ok(pose.distance >= 12);
});

test('focus camera keeps enough island context', () => {
  const bounds = getUnlockedIslandBounds([tile(-5, 0), tile(5, 0)]);
  const overview = getOverviewCameraPose(bounds, 16 / 9);
  const focus = getFocusCameraPose(bounds, { q: 2, r: 0 }, 16 / 9);
  assert.ok(focus.distance >= Math.max(10, overview.distance * 0.75));
});

test('build framing is derived from island bounds and stays more top-down than overview', () => {
  const bounds = getUnlockedIslandBounds(motionTiles);
  const overview = getOverviewCameraPose(bounds, 16 / 9);
  const build = getBuildCameraPose(bounds, 16 / 9);
  assert.deepEqual(build.target, overview.target);
  const overviewSlope = Math.abs(overview.position[1] - overview.target[1]) / Math.abs(overview.position[0] - overview.target[0]);
  const buildSlope = Math.abs(build.position[1] - build.target[1]) / Math.abs(build.position[0] - build.target[0]);
  assert.ok(buildSlope > overviewSlope);
});

test('opening pose starts wider and higher than final overview', () => {
  const overview = getOverviewCameraPose(getUnlockedIslandBounds(motionTiles), 16 / 9);
  const opening = getOpeningCameraPose(overview);
  assert.ok(opening.distance > overview.distance);
  assert.ok(opening.position[1] > overview.position[1]);
});
