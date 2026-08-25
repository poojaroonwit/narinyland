import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

test('World mounts local HDRI image based lighting while keeping the authored sky visible', async () => {
  const [world, environment, qualityAssets] = await Promise.all([
    source('components/hex-world/HexWorld3D.tsx'),
    source('components/hex-world/pbr/HexPBREnvironment.tsx'),
    source('lib/hex-world/pbr/quality-assets.ts'),
  ]);
  assert.match(world, /HexPBREnvironment/);
  assert.match(environment, /Environment/);
  assert.match(environment, /getPBREnvironmentPathForQuality/);
  assert.match(environment, /background=\{false\}/);
  assert.match(environment, /profile\.name/);
  assert.match(qualityAssets, /quality === ['"]high['"] \? ['"]2k['"] : ['"]1k['"]/);
  assert.doesNotMatch(environment, /https?:\/\/|polyhaven|api\.polyhaven|dl\.polyhaven/i);
});

test('PBR water keeps deterministic motion but adds local normal detail and physical reflection response', async () => {
  const [world, water] = await Promise.all([
    source('components/hex-world/HexWorld3D.tsx'),
    source('components/hex-world/pbr/HexPBRWater.tsx'),
  ]);
  assert.match(world, /HexPBRWater/);
  assert.doesNotMatch(world, /HexWaterSurface/);
  assert.match(water, /getPBRTextureSet/);
  assert.match(water, /normalMap/);
  assert.match(water, /RepeatWrapping/);
  assert.match(water, /normalMap\.offset|normal\.offset|normalTexture\.offset/);
  assert.match(water, /waterMotionScale/);
  assert.match(water, /deterministicMotionBucket/);
  assert.match(water, /meshPhysicalMaterial/);
  assert.match(water, /ior=\{1\.33\}/);
  assert.match(water, /metalness=\{0\}/);
  assert.match(water, /envMapIntensity=/);
  assert.match(water, /waterGlintCount/);
  assert.doesNotMatch(water, /CubeCamera|Reflector|MeshReflectorMaterial|SSR|EffectComposer|https?:\/\//);
});

test('HDRI retune preserves one directional shadow owner and ref based lighting interpolation', async () => {
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
  assert.match(lighting, /useFrame/);
  assert.match(lighting, /lightingResponse/);
  assert.match(lighting, /HemisphereLight/);
  assert.match(lighting, /AmbientLight/);
  assert.doesNotMatch(lighting, /CubeCamera|EffectComposer|SSR/);
});
