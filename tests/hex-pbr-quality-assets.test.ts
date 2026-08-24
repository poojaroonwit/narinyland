import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PBR quality assets preserve high medium mobile and resolve local texture tiers', async () => {
  const quality = await source('lib/hex-world/quality.ts');
  const assets = await source('lib/hex-world/pbr/quality-assets.ts').catch(() => '');

  assert.match(quality, /pbrTextureTier/);
  assert.match(quality, /pbrVegetationScale/);
  assert.match(quality, /pbrCliffPropBudget/);
  assert.match(quality, /pbrGroundPropBudget/);
  assert.match(quality, /pbrEnvironmentResolution/);
  assert.match(quality, /const HIGH:[\s\S]*?pbrTextureTier:\s*['"]2k['"]/);
  assert.match(quality, /const MEDIUM:[\s\S]*?pbrTextureTier:\s*['"]1k['"]/);
  assert.match(quality, /const MOBILE:[\s\S]*?pbrTextureTier:\s*['"]1k['"]/);
  assert.doesNotMatch(quality, /ultra|low|cinematic/i);

  assert.match(assets, /getPBRTextureSet/);
  assert.match(assets, /getPBRModelPathForQuality/);
  assert.match(assets, /getPBREnvironmentPathForQuality/);
  assert.match(assets, /grass_surface/);
  assert.match(assets, /cliff_surface/);
  assert.doesNotMatch(assets, /https?:\/\//);
});

test('PBR asset preloader loads local shared essentials without eager remote dependencies', async () => {
  const preloader = await source('components/hex-world/pbr/HexPBRAssetPreloader.tsx').catch(() => '');
  assert.match(preloader, /useTexture\.preload/);
  assert.match(preloader, /useGLTF\.preload/);
  assert.match(preloader, /getPBREnvironmentPathForQuality/);
  assert.doesNotMatch(preloader, /https?:\/\/|polyhaven/i);
});
