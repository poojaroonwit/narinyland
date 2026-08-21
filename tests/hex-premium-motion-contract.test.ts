import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('build camera does not chase hovered placement anchor', async () => {
  const camera = await source('../components/hex-world/HexDioramaCamera.tsx');
  const math = await source('../lib/hex-world/camera.ts');
  assert.doesNotMatch(math, /function getBuildCameraPose\([^)]*anchor/);
  assert.match(camera, /motionProfile/);
  assert.match(camera, /getOpeningCameraPose/);
});

test('terrain hover motion preserves instancing', async () => {
  const tiles = await source('../components/hex-world/HexTileInstances.tsx');
  assert.match(tiles, /hoverResponse/);
  assert.match(tiles, /InstancedMesh/);
  assert.doesNotMatch(tiles, /<mesh\s+key=\{.*tile/);
});

test('selection and ghost motion use shared motion profile', async () => {
  const selection = await source('../components/hex-world/HexSelectionEffects.tsx');
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  assert.doesNotMatch(selection, /export const HEX_MOTION/);
  assert.match(selection, /motionProfile/);
  assert.match(world, /ghostBobScale/);
});

test('confirmed building actions animate through shared presentation events', async () => {
  const buildings = await source('../components/hex-world/HexBuildings.tsx');
  const events = await source('../lib/hex-world/visual-events.ts').catch(() => '');
  assert.match(buildings, /useFrame/);
  assert.match(buildings, /visualEvent/);
  assert.match(events, /HexConfirmedVisualEvent/);
});

test('placement effects stay visual-only and invalid clicks use local pulse feedback', async () => {
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  const controller = await source('../components/hex-world/HexBuildController.tsx');
  assert.match(world, /HexPlacementEffects/);
  assert.match(controller, /invalidPulseNonce/);
});

test('ambient vegetation uses fixed quality-aware motion buckets', async () => {
  const ambient = await source('../components/hex-world/HexAmbientDecor.tsx');
  assert.match(ambient, /deterministicMotionBucket/);
  assert.match(ambient, /vegetationMotion/);
  assert.match(ambient, /motionProfile/);
  assert.match(ambient, /rocks/);
  assert.match(ambient, /paths/);
});

test('sky parallax remains bounded and uses shared motion profile', async () => {
  const sky = await source('../components/hex-world/HexSkyAtmosphere.tsx');
  const lighting = await source('../components/hex-world/HexWorldLighting.tsx');
  assert.match(sky, /cloudParallaxScale/);
  assert.match(sky, /motionProfile/);
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
  assert.doesNotMatch(`${sky}\n${lighting}`, /EffectComposer|Bloom|DepthOfField|volumetric/i);
});

test('water uses deterministic buckets and bounded quality glints', async () => {
  const water = await source('../components/hex-world/HexWaterSurface.tsx');
  assert.match(water, /deterministicMotionBucket/);
  assert.match(water, /waterGlintCount/);
  assert.doesNotMatch(water, /MeshReflectorMaterial|CubeCamera|WebGLCubeRenderTarget/);
});
