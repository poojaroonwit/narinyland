import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  OPEN_WORLD_CHUNK_SIZE,
  OPEN_WORLD_GRID_STEP,
  OPEN_WORLD_LANDMARKS,
  OPEN_WORLD_MAX_CHUNKS,
  getOpenWorldBiome,
  getOpenWorldChunkDecor,
  getOpenWorldChunkIndex,
  getOpenWorldVisibleChunks,
  getNearestOpenWorldLandmark,
  isOpenWorldWalkable,
  sampleOpenWorldHeight,
} from '@/lib/open-world/terrain';

test('terrain chunks stream deterministically around the player and remain bounded', () => {
  assert.equal(OPEN_WORLD_CHUNK_SIZE % OPEN_WORLD_GRID_STEP, 0);
  assert.equal(getOpenWorldChunkIndex(-0.01), -1);
  assert.equal(getOpenWorldChunkIndex(0), 0);
  assert.equal(getOpenWorldChunkIndex(24), 1);
  const chunks = getOpenWorldVisibleChunks(0, 0);
  assert.equal(chunks.length, OPEN_WORLD_MAX_CHUNKS);
  assert.equal(chunks[0].key, '0:0');
  assert.equal(new Set(chunks.map((chunk) => chunk.key)).size, OPEN_WORLD_MAX_CHUNKS);
  assert.ok(chunks.some(({ key }) => key === '-2:-2'));
  assert.ok(chunks.some(({ key }) => key === '2:2'));
  assert.deepEqual(getOpenWorldVisibleChunks(0, 0), getOpenWorldVisibleChunks(0, 0));
  assert.equal(getOpenWorldVisibleChunks(0, 0, 999).length, OPEN_WORLD_MAX_CHUNKS);
  assert.equal(getOpenWorldVisibleChunks(0, 0, -8).length, 1);
  assert.deepEqual(getOpenWorldVisibleChunks(24.1, 0).map((v) => v.key), getOpenWorldVisibleChunks(46.1, 0).map((v) => v.key));
});

test('terrain height is finite, seamless at boundaries, and walkable near spawn', () => {
  for (const point of [-120, -48, -24, -0.1, 0, 0.1, 24, 48, 120]) {
    const height = sampleOpenWorldHeight(point, point * 0.43);
    assert.ok(Number.isFinite(height));
    assert.ok(Math.abs(height) < 10);
  }
  for (const boundary of [-48, -24, 0, 24, 48]) {
    assert.ok(Math.abs(sampleOpenWorldHeight(boundary - 0.00001, 11) - sampleOpenWorldHeight(boundary + 0.00001, 11)) < 0.001);
    assert.ok(Math.abs(sampleOpenWorldHeight(12, boundary - 0.00001) - sampleOpenWorldHeight(12, boundary + 0.00001)) < 0.001);
  }
  assert.equal(isOpenWorldWalkable(0.1, 0.1, 0, 0), true);
  assert.equal(isOpenWorldWalkable(-48, -32, -47.99, -32), false);
});

test('the village, forest, lakeshore and highlands have identifiable destinations', () => {
  assert.equal(getOpenWorldBiome(0, 0), 'village');
  assert.equal(getOpenWorldBiome(52, 12), 'forest');
  assert.equal(getOpenWorldBiome(-48, -32), 'lakeshore');
  assert.equal(getOpenWorldBiome(12, 68), 'highlands');
  assert.deepEqual(new Set(OPEN_WORLD_LANDMARKS.map((landmark) => landmark.id)), new Set(['commons', 'woods', 'lake', 'hills']));
  assert.equal(getNearestOpenWorldLandmark(0, 0).id, 'commons');
  assert.equal(getNearestOpenWorldLandmark(55, 9).id, 'woods');
});

test('procedural decor is stable, limited per chunk and leaves the village clearing free', () => {
  const decor = getOpenWorldChunkDecor(0, 0);
  assert.deepEqual(decor, getOpenWorldChunkDecor(0, 0));
  assert.ok(decor.length <= 18);
  assert.ok(decor.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.z)));
  const forest = getOpenWorldChunkDecor(3, 0);
  assert.ok(forest.some((item) => item.kind === 'tree' || item.kind === 'bush'));
  assert.ok(forest.every((item) => Math.hypot(item.x, item.z) >= 20));
});

test('protected /world route and garden entry preserve the private homestead', async () => {
  const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const [route, proxy, garden, world, scene, controller] = await Promise.all([
    read('app/world/page.tsx'),
    read('proxy.ts'),
    read('app/garden/_components/GardenAcceptedContent.tsx'),
    read('components/open-world/OpenWorldExperience.tsx'),
    read('components/open-world/OpenWorldScene.tsx'),
    read('components/open-world/OpenWorldPlayerController.tsx'),
  ]);
  assert.match(route, /OpenWorldExperience/);
  assert.match(proxy, /'\/world'/);
  assert.match(proxy, /'\/world\/:path\*'/);
  assert.match(garden, /href="\/world"/);
  assert.match(world, /href="\/garden"/);
  assert.match(world, /HexExploreTouchControls/);
  assert.match(world, /resetNonce/);
  assert.match(scene, /getOpenWorldVisibleChunks/);
  assert.match(scene, /ChunkGround/);
  assert.match(scene, /HexStorybookBuildingModel/);
  assert.match(controller, /OrbitControls/);
  assert.match(controller, /getCameraRelativeMoveVector/);
  assert.match(controller, /isOpenWorldWalkable/);
  for (const file of [scene, world, controller]) {
    assert.doesNotMatch(file, /\bfetch\(/);
    assert.doesNotMatch(file, /hexWorldAPI\.(place|update|remove)/);
  }
});
