import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import { buildPBRVegetationScatter } from '@/lib/hex-world/pbr/vegetation-scatter';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const tiles: HexTileDTO[] = [
  { q: 0, r: 0, height: 0, unlocked: true, terrainType: 'grass', metadata: { decor: 'tree' } },
  { q: 1, r: 0, height: 0.05, unlocked: true, terrainType: 'grass' },
  { q: 2, r: 0, height: 0, unlocked: true, terrainType: 'grass', metadata: { feature: 'path' } },
  { q: 0, r: 1, height: -0.04, unlocked: true, terrainType: 'water' },
  { q: -1, r: 1, height: 0.02, unlocked: true, terrainType: 'grass', metadata: { decor: 'rock' } },
  { q: -1, r: 0, height: 0.01, unlocked: true, terrainType: 'grass' },
];
const buildings: HexBuildingDTO[] = [
  { id: 'home', buildingKey: 'home', anchorQ: 0, anchorR: 0, rotation: 0 },
];

test('PBR vegetation scatter is deterministic bounded and excludes water paths and building footprints', () => {
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440 });
  const first = buildPBRVegetationScatter({ tiles, buildings, seed: 'world-seed', profile: high });
  const second = buildPBRVegetationScatter({ tiles, buildings, seed: 'world-seed', profile: high });
  assert.deepEqual(first, second);
  assert.ok(first.length > 0);
  assert.ok(first.length <= high.pbrGroundPropBudget);
  assert.equal(first.some((item) => item.tileKey === '2:0'), false, 'path center must remain clear');
  assert.equal(first.some((item) => item.tileKey === '0:1'), false, 'water must remain clear');
  assert.equal(first.some((item) => item.tileKey === '0:0' || item.tileKey === '1:0' || item.tileKey === '0:1' || item.tileKey === '1:-1'), false, 'home footprint must remain clear');
  assert.ok(first.every((item) => Number.isFinite(item.x + item.y + item.z + item.rotation + item.scale + item.windPhase)));
});

test('mobile PBR vegetation density remains below desktop high', () => {
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440 });
  const mobile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 390 });
  const highScatter = buildPBRVegetationScatter({ tiles, buildings: [], seed: 'density', profile: high });
  const mobileScatter = buildPBRVegetationScatter({ tiles, buildings: [], seed: 'density', profile: mobile });
  assert.ok(mobileScatter.length <= highScatter.length);
  assert.ok(mobile.pbrGroundPropBudget < high.pbrGroundPropBudget);
});

test('World uses local scanned GLTF vegetation with instanced batches and v2 wind', async () => {
  const vegetation = await source('components/hex-world/pbr/HexPBRVegetation.tsx').catch(() => '');
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.match(vegetation, /useGLTF/);
  assert.match(vegetation, /getPBRModelPathForQuality/);
  assert.match(vegetation, /InstancedMesh|instancedMesh/);
  assert.match(vegetation, /alphaTest/);
  assert.match(vegetation, /worldWindScale/);
  assert.match(vegetation, /worldWindSecondaryScale/);
  assert.match(vegetation, /useFrame/);
  assert.doesNotMatch(vegetation, /Math\.random|https?:\/\/|polyhaven/i);
  assert.match(world, /HexPBRVegetation/);
  assert.doesNotMatch(world, /<HexAmbientDecor\b|<HexTerrainDetails\b/);
});

test('buildable nature reuses the local PBR model library for trees and pond-edge dressing', async () => {
  const nature = await source('components/hex-world/models/HexNatureModels.tsx');
  assert.match(nature, /useGLTF/);
  assert.match(nature, /getPBRModelPathForQuality|getPBRAssetPath/);
  assert.match(nature, /case 'tree'/);
  assert.match(nature, /case 'pond'/);
  assert.doesNotMatch(nature, /https?:\/\/|polyhaven/i);
});
