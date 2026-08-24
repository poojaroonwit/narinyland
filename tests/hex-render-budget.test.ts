import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('world scene uses bounded naturalistic atmosphere without heavy postprocessing', async () => {
  const scene = await source('../components/hex-world/HexWorld3D.tsx');
  assert.match(scene, /HexIslandCliffShell/);
  assert.match(scene, /HexNaturalTerrain/);
  assert.match(scene, /HexWorldParticles/);
  assert.match(scene, /HexWaterSurface/);
  assert.doesNotMatch(scene, /HexIslandUnderside/);
  assert.doesNotMatch(scene, /EffectComposer|DepthOfField|Bloom|MeshReflectorMaterial/);
});

test('premium atmosphere components stay visual-only', async () => {
  const files = [
    '../components/hex-world/terrain/HexIslandCliffShell.tsx',
    '../components/hex-world/terrain/HexNaturalTerrain.tsx',
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

test('repeated ambient geometry stays instanced and high quality DPR remains bounded', async () => {
  const ambient = await source('../components/hex-world/HexAmbientDecor.tsx');
  const quality = await source('../lib/hex-world/quality.ts');

  assert.match(ambient, /THREE\.InstancedMesh/);
  assert.match(ambient, /<instancedMesh\b/);
  assert.match(quality, /maxDpr:\s*1\.75/);
  assert.doesNotMatch(quality, /maxDpr:\s*(?:[2-9]|1\.(?:8|9))/);
});

test('confirmed placement effects use one bounded points batch and stay visual-only', async () => {
  const placement = await source('../components/hex-world/HexPlacementEffects.tsx').catch(() => '');
  assert.equal((placement.match(/<points\b/g) ?? []).length, 1);
  assert.doesNotMatch(placement, /hexWorldAPI|fetch\(|prisma/);
});
