import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

const retiredRuntimePaths = [
  'components/hex-world/HexAmbientDecor.tsx',
  'components/hex-world/HexTerrainDetails.tsx',
  'components/hex-world/HexWaterSurface.tsx',
  'components/hex-world/models/HexStructureModels.tsx',
  'components/hex-world/terrain/HexNaturalTerrain.tsx',
  'components/hex-world/terrain/HexIslandCliffShell.tsx',
];

test('normal World mounts the complete local Hybrid PBR visual stack and shared preloader', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  for (const layer of ['HexPBRAssetPreloader', 'HexPBREnvironment', 'HexPBRTerrain', 'HexPBRCliff', 'HexPBRVegetation', 'HexPBRWater']) {
    assert.match(world, new RegExp(layer));
  }
  assert.match(world, /<HexPBRAssetPreloader[^>]*profile=\{profile\}/);
  assert.doesNotMatch(world, /HexAmbientDecor|HexTerrainDetails|HexWaterSurface|HexNaturalTerrain|HexIslandCliffShell|HexStructureModel/);
});

test('floating island fragments use local scanned rock assets and deterministic island composition', async () => {
  const [world, fragments] = await Promise.all([
    source('components/hex-world/HexWorld3D.tsx'),
    source('components/hex-world/pbr/HexPBRFloatingFragments.tsx'),
  ]);
  assert.match(world, /HexPBRFloatingFragments/);
  assert.doesNotMatch(world, /function FloatingFragments|icosahedronGeometry/);
  assert.match(fragments, /useGLTF/);
  assert.match(fragments, /getPBRModelPathForQuality/);
  assert.match(fragments, /rockSet/);
  assert.match(fragments, /instancedMesh/);
  assert.match(fragments, /buildFloatingIslandFragmentPlacements/);
  assert.doesNotMatch(fragments, /const FRAGMENTS/);
  assert.doesNotMatch(fragments, /Math\.random|https?:\/\//);
});

test('superseded normal World visual fallback files are physically removed', async () => {
  for (const path of retiredRuntimePaths) assert.equal(await source(path), '', `${path} should not exist`);
});

test('final Hybrid PBR scene keeps quality buckets and bounded renderer architecture', async () => {
  const [world, quality, lighting, preloader] = await Promise.all([
    source('components/hex-world/HexWorld3D.tsx'),
    source('lib/hex-world/quality.ts'),
    source('components/hex-world/HexWorldLighting.tsx'),
    source('components/hex-world/pbr/HexPBRAssetPreloader.tsx'),
  ]);
  for (const token of ['pbrTextureTier', 'pbrVegetationScale', 'pbrCliffPropBudget', 'pbrGroundPropBudget', 'pbrEnvironmentResolution']) assert.match(quality, new RegExp(token));
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
  assert.doesNotMatch(`${world}\n${preloader}`, /https?:\/\/|api\.polyhaven|dl\.polyhaven|EffectComposer|Bloom|SSAO|SSR|DepthOfField|CubeCamera/);
});
