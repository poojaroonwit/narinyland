import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

const tile = (q: number, r: number, terrainType: HexTileDTO['terrainType'], unlocked = true): HexTileDTO => ({
  q,
  r,
  terrainType,
  height: 0,
  unlocked,
});

async function loadExploreDecoration() {
  return import('@/lib/hex-world/explore-decoration').catch(() => null);
}

test('explore decoration module exists and is deterministic for a world seed', async () => {
  const module = await loadExploreDecoration();
  assert.ok(module, 'explore decoration module must exist');
  if (!module) return;
  const profile = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1280 });
  const tiles = [tile(0, 0, 'grass'), tile(1, 0, 'soil'), tile(0, 1, 'stone'), tile(-1, 1, 'water')];
  const first = module.getExploreDecorationSamples({ seed: 'cozy-seed', tiles, profile });
  const second = module.getExploreDecorationSamples({ seed: 'cozy-seed', tiles, profile });
  assert.deepEqual(first, second);
});

test('explore decoration skips locked land and stays inside quality budgets', async () => {
  const module = await loadExploreDecoration();
  assert.ok(module, 'explore decoration module must exist');
  if (!module) return;
  const profile = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1280 });
  assert.equal(typeof profile.exploreGroundPerTile, 'number');
  assert.equal(typeof profile.exploreDecorPerTile, 'number');
  const unlocked = tile(0, 0, 'grass');
  const locked = tile(1, 0, 'grass', false);
  const samples = module.getExploreDecorationSamples({ seed: 'bounded', tiles: [unlocked, locked], profile });
  assert.ok(samples.length <= profile.exploreGroundPerTile + profile.exploreDecorPerTile);
  assert.ok(samples.every((sample) => Math.hypot(sample.x, sample.z) < 1.8), 'locked neighboring tile must not emit decoration');
});

test('mobile explore density is lower than medium and high', async () => {
  const module = await loadExploreDecoration();
  assert.ok(module, 'explore decoration module must exist');
  if (!module) return;
  const tiles = Array.from({ length: 9 }, (_, index) => tile(index % 3, Math.floor(index / 3), 'grass'));
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1280 });
  const medium = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1280 });
  const mobile = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 390 });
  const count = (profile: typeof high) => module.getExploreDecorationSamples({ seed: 'density', tiles, profile }).length;
  assert.ok(count(mobile) < count(medium));
  assert.ok(count(medium) < count(high));
});
