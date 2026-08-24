import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function source(path: string) { return readFile(new URL(path, import.meta.url), 'utf8'); }

test('world scene uses bounded PBR naturalistic atmosphere without heavy postprocessing', async () => {
  const scene = await source('../components/hex-world/HexWorld3D.tsx');
  assert.match(scene, /HexPBRCliff/);
  assert.match(scene, /HexPBRTerrain/);
  assert.match(scene, /HexPBRVegetation/);
  assert.match(scene, /HexWorldParticles/);
  assert.match(scene, /HexWaterSurface/);
  assert.doesNotMatch(scene, /HexIslandUnderside|HexIslandCliffShell|HexNaturalTerrain|HexAmbientDecor|HexTerrainDetails/);
  assert.doesNotMatch(scene, /EffectComposer|DepthOfField|Bloom|MeshReflectorMaterial/);
});

test('premium atmosphere components stay visual-only', async () => {
  const files = [
    '../components/hex-world/pbr/HexPBRCliff.tsx',
    '../components/hex-world/pbr/HexPBRTerrain.tsx',
    '../components/hex-world/pbr/HexPBRVegetation.tsx',
    '../components/hex-world/HexWorldParticles.tsx',
    '../components/hex-world/HexWaterSurface.tsx',
  ];
  for (const path of files) {
    const contents = await source(path).catch(() => '');
    assert.doesNotMatch(contents, /fetch\(|hexWorldAPI|prisma|api\//);
  }
});

test('render budget keeps one primary directional shadow owner and one particle points batch', async () => {
  const lighting = await source('../components/hex-world/HexWorldLighting.tsx');
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  const particles = await source('../components/hex-world/HexWorldParticles.tsx');
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
  assert.doesNotMatch(world, /<directionalLight\b/);
  assert.equal((particles.match(/<points\b/g) ?? []).length, 1);
});

test('repeated scanned vegetation stays instanced and high quality DPR remains bounded', async () => {
  const vegetation = await source('../components/hex-world/pbr/HexPBRVegetation.tsx');
  const quality = await source('../lib/hex-world/quality.ts');
  assert.match(vegetation, /THREE\.InstancedMesh/);
  assert.match(vegetation, /<instancedMesh\b/);
  assert.match(vegetation, /buildPBRVegetationScatter/);
  assert.match(quality, /maxDpr:\s*1\.75/);
  assert.doesNotMatch(quality, /maxDpr:\s*(?:[2-9]|1\.(?:8|9))/);
});

test('confirmed placement effects use one bounded points batch and stay visual-only', async () => {
  const placement = await source('../components/hex-world/HexPlacementEffects.tsx').catch(() => '');
  assert.equal((placement.match(/<points\b/g) ?? []).length, 1);
  assert.doesNotMatch(placement, /hexWorldAPI|fetch\(|prisma/);
});
