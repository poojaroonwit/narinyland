import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getBuildCameraPose, getCameraScriptCommandKey, getFocusCameraPose, getOpeningCameraPose, getOverviewCameraPose, getUnlockedIslandBounds, shouldReframeForCoords } from '@/lib/hex-world/camera';
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

test('camera script command ignores equivalent React prop identities but changes for real camera commands', () => {
  const bounds = getUnlockedIslandBounds(motionTiles);
  const first = getCameraScriptCommandKey({
    bounds,
    intent: { kind: 'overview' },
    aspect: 16 / 9,
    resetNonce: 0,
    reframeCoords: [{ q: 2, r: 1 }, { q: 1, r: 0 }],
  });
  const equivalent = getCameraScriptCommandKey({
    bounds: { ...bounds, center: [...bounds.center] },
    intent: { kind: 'overview' },
    aspect: 16 / 9,
    resetNonce: 0,
    reframeCoords: [{ q: 1, r: 0 }, { q: 2, r: 1 }],
  });
  const reset = getCameraScriptCommandKey({
    bounds,
    intent: { kind: 'overview' },
    aspect: 16 / 9,
    resetNonce: 1,
    reframeCoords: [{ q: 2, r: 1 }, { q: 1, r: 0 }],
  });
  const focus = getCameraScriptCommandKey({
    bounds,
    intent: { kind: 'focus', coord: { q: 2, r: 1 } },
    aspect: 16 / 9,
    resetNonce: 0,
    reframeCoords: [{ q: 2, r: 1 }, { q: 1, r: 0 }],
  });

  assert.equal(first, equivalent, 'new object/array identities must not re-arm scripted motion');
  assert.notEqual(first, reset, 'explicit reset must re-arm scripted motion');
  assert.notEqual(first, focus, 'real camera intent changes must re-arm scripted motion');
});

test('manual OrbitControls zoom stays authoritative until the semantic camera command changes', async () => {
  const source = await readFile(new URL('../components/hex-world/HexDioramaCamera.tsx', import.meta.url), 'utf8');
  assert.match(source, /getCameraScriptCommandKey/);
  assert.match(source, /lastScriptCommandKey/);
  assert.match(source, /lastScriptCommandKey\.current === scriptCommandKey/);
  assert.match(source, /onStart=\{\(\) => \{ scriptedMotion\.current = false; \}\}/);
});
