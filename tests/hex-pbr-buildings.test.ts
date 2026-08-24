import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

test('core homestead buildings dispatch through one local PBR structure renderer', async () => {
  const renderer = await source('components/hex-world/pbr/HexPBRBuildings.tsx');
  const dispatcher = await source('components/hex-world/HexBuildingModels.tsx');

  assert.match(renderer, /export function HexPBRStructureModel/);
  for (const key of ['home', 'barn', 'storage', 'workshop']) {
    assert.match(renderer, new RegExp(`case ['"]${key}['"]`));
  }
  assert.match(dispatcher, /HexPBRStructureModel/);
  assert.doesNotMatch(dispatcher, /HexStructureModel/);
  assert.doesNotMatch(`${renderer}\n${dispatcher}`, /https?:\/\/|modelUrl|fetch\(/);
});

test('PBR building surfaces bind pinned local texture maps with stable UV-capable geometry', async () => {
  const renderer = await source('components/hex-world/pbr/HexPBRBuildings.tsx');

  assert.match(renderer, /useTexture/);
  assert.match(renderer, /getPBRTextureSet/);
  for (const material of ['wood', 'plaster', 'roof', 'cliff']) {
    assert.match(renderer, new RegExp(`getPBRTextureSet\\(['"]${material}['"]`));
  }
  assert.match(renderer, /configurePBRTextureBundle/);
  assert.match(renderer, /map=/);
  assert.match(renderer, /normalMap=/);
  assert.match(renderer, /roughnessMap=/);
  assert.match(renderer, /BufferGeometry|bufferGeometry/);
  assert.match(renderer, /uv/i);
  assert.match(renderer, /Float32BufferAttribute/);
});

test('PBR structures keep physical glass metal tier and textured ghost presentation', async () => {
  const renderer = await source('components/hex-world/pbr/HexPBRBuildings.tsx');
  const buildings = await source('components/hex-world/HexBuildings.tsx');

  assert.match(renderer, /meshPhysicalMaterial/);
  assert.match(renderer, /transmission|ior/);
  assert.match(renderer, /metalness/);
  assert.match(renderer, /tier\s*>=\s*2/);
  assert.match(renderer, /tier\s*>=\s*3/);
  assert.match(renderer, /ghost/);
  assert.match(renderer, /opacity/);
  assert.match(renderer, /map=/);
  assert.match(buildings, /tier=\{tier\}/);
  assert.match(buildings, /buildingFeedbackScale/);
  assert.doesNotMatch(buildings, /fetch\(|prisma\.|DATABASE_URL/);
});
