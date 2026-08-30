import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('floating island cliff renders three PBR geological layers', async () => {
  const cliff = await source('components/hex-world/pbr/HexPBRCliff.tsx');
  assert.equal((cliff.match(/<meshStandardMaterial\b/g) ?? []).length, 3);
  assert.match(cliff, /upperRock/);
  assert.match(cliff, /lowerRock/);
  assert.match(cliff, /materialIndex/);
  assert.ok((cliff.match(/normalMap=/g) ?? []).length >= 3);
  assert.ok((cliff.match(/roughnessMap=/g) ?? []).length >= 3);
  assert.doesNotMatch(cliff, /meshBasicMaterial|https?:\/\/|Math\.random/);
});

test('World sells altitude with below-island cloud layers and no island-scale contact floor', async () => {
  const sky = await source('components/hex-world/HexSkyAtmosphere.tsx');
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  assert.match(sky, /BELOW_ISLAND_CLOUDS/);
  assert.match(sky, /BelowIslandHaze/);
  assert.match(lighting, /explore\s*&&\s*\(/);
  assert.match(lighting, /position=\{\[0,\s*-0\.03,\s*0\]\}/);
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
});

test('World integrates floating island presentation without replacing Hex gameplay authority', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.match(world, /<HexPBRCliff[^>]*tiles=\{snapshot\.tiles\}[^>]*seed=\{snapshot\.world\.seed\}[^>]*profile=\{profile\}/);
  assert.match(world, /<HexPBRFloatingFragments[^>]*tiles=\{snapshot\.tiles\}[^>]*seed=\{snapshot\.world\.seed\}[^>]*profile=\{profile\}/);
  assert.match(world, /<HexPBRTerrain[^>]*tiles=\{snapshot\.tiles\}[^>]*seed=\{snapshot\.world\.seed\}/);
  assert.match(world, /<HexTileInstances[^>]*presentation="proxy"/);
  assert.doesNotMatch(world, /EffectComposer|Bloom|DepthOfField|SSAO|SSR|CubeCamera/);
  assert.doesNotMatch(world, /buildIslandCliffMesh|buildFloatingIslandFragmentPlacements|buildNaturalTerrainMesh/);
});

test('floating island presentation stays deterministic local and visual-only', async () => {
  const files = await Promise.all([
    source('components/hex-world/pbr/HexPBRCliff.tsx'),
    source('components/hex-world/pbr/HexPBRFloatingFragments.tsx'),
    source('components/hex-world/HexSkyAtmosphere.tsx'),
    source('lib/hex-world/floating-island-composition.ts'),
  ]);
  for (const content of files) {
    assert.doesNotMatch(content, /Math\.random|https?:\/\/|\bfetch\s*\(|hexWorldAPI|\bprisma\b|\/api\//i);
  }
  assert.match(files[1], /<instancedMesh/);
  assert.match(files[1], /buildFloatingIslandFragmentPlacements/);
});

test('floating island keeps bounded renderer budgets across quality tiers', async () => {
  const quality = await source('lib/hex-world/quality.ts');
  const vegetation = await source('components/hex-world/pbr/HexPBRVegetation.tsx');
  const fragments = await source('components/hex-world/pbr/HexPBRFloatingFragments.tsx');
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.match(quality, /maxDpr:\s*1\.75/);
  assert.match(quality, /name:\s*'mobile'/);
  assert.match(vegetation, /instancedMesh/);
  assert.match(fragments, /instancedMesh/);
  assert.match(world, /<HexPBRCliff/);
  assert.doesNotMatch(world, /profile\.name\s*!==\s*['"]mobile['"][\s\S]{0,120}<HexPBRCliff/);
});
