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

test('building transforms initialize once so first selection and rotation can interpolate', async () => {
  const buildings = await source('../components/hex-world/HexBuildings.tsx');
  assert.match(buildings, /initialized(?:Ref)?\s*=\s*useRef\(false\)/);
  assert.match(buildings, /if \(!initialized(?:Ref)?\.current\)/);
  assert.doesNotMatch(buildings, /if \(lastEventNonce\.current === null\) \{/);
});

test('World building feedback is stronger but remains presentation-only', async () => {
  const buildings = await source('../components/hex-world/HexBuildings.tsx');
  assert.match(buildings, /buildingFeedbackScale/);
  assert.match(buildings, /1\.045/);
  assert.match(buildings, /0\.055/);
  assert.match(buildings, /0\.72/);
  assert.match(buildings, /0\.30|0\.3/);
  assert.match(buildings, /0\.94/);
  assert.match(buildings, /0\.97/);
  assert.match(buildings, /0\.975/);
  assert.match(buildings, /confirmed\.kind === ['"]placed['"]/);
  assert.match(buildings, /confirmed\.kind === ['"]moved['"]/);
  assert.match(buildings, /confirmed\.kind === ['"]rotated['"]/);
  assert.doesNotMatch(buildings, /fetch\(|hexWorldAPI|prisma\.|DATABASE_URL/);
});

test('placement effects stay visual-only and invalid clicks use local pulse feedback', async () => {
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  const controller = await source('../components/hex-world/HexBuildController.tsx');
  assert.match(world, /HexPlacementEffects/);
  assert.match(controller, /invalidPulseNonce/);
});

test('scanned vegetation stays quality-aware and deterministic', async () => {
  const vegetation = await source('../components/hex-world/pbr/HexPBRVegetation.tsx');
  const scatter = await source('../lib/hex-world/pbr/vegetation-scatter.ts');
  assert.match(vegetation, /buildPBRVegetationScatter/);
  assert.match(vegetation, /motionProfile/);
  assert.match(vegetation, /instancedMesh/);
  assert.match(scatter, /pbrVegetationScale/);
  assert.doesNotMatch(`${vegetation}\n${scatter}`, /Math\.random/);
});

test('vegetation sway is applied to instance-local transforms instead of rotating world-space parents', async () => {
  const vegetation = await source('../components/hex-world/pbr/HexPBRVegetation.tsx');
  assert.match(vegetation, /PBRInstancedGLTF/);
  assert.match(vegetation, /mesh\.setMatrixAt/);
  assert.match(vegetation, /dummy\.rotation\.set/);
  assert.doesNotMatch(vegetation, /ref\.current\.rotation\.[xz]\s*=/);
});

test('World vegetation uses layered deterministic wind while remaining instanced', async () => {
  const vegetation = await source('../components/hex-world/pbr/HexPBRVegetation.tsx');
  assert.match(vegetation, /worldWindScale/);
  assert.match(vegetation, /worldWindSecondaryScale/);
  assert.match(vegetation, /primary/);
  assert.match(vegetation, /secondary/);
  assert.match(vegetation, /1\.83/);
  assert.match(vegetation, /0\.35/);
  assert.match(vegetation, /WIND_AMPLITUDE/);
  assert.match(vegetation, /instancedMesh/);
  assert.doesNotMatch(vegetation, /Math\.random/);
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

test('confirmed expansion uses deterministic stagger and visual-only mist', async () => {
  const tiles = await source('../components/hex-world/HexTileInstances.tsx');
  const effects = await source('../components/hex-world/HexPlacementEffects.tsx');
  const controller = await source('../components/hex-world/HexBuildController.tsx');
  const expansionHandler = controller.match(/const handleExpansionConfirmed[\s\S]*?\n\s*};/)?.[0] ?? '';
  assert.match(tiles, /stagger/i);
  assert.match(effects, /expanded|expansion/i);
  assert.match(expansionHandler, /setUndo\(null\)/);
  assert.doesNotMatch(expansionHandler, /hexWorldAPI\.undo/);
});

test('placement effect origin narrows rotation-only events before reading coord', async () => {
  const effects = await source('../components/hex-world/HexPlacementEffects.tsx');
  const helper = effects.match(/function effectOrigin[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(helper, /event\.kind === 'rotated'/);
});

test('reduced motion preference is resolved synchronously on the first client render', async () => {
  const hook = await source('../components/hex-world/useReducedHexMotion.ts');
  assert.match(hook, /useState\(\(\) =>/);
  assert.match(hook, /typeof window !== ['"]undefined['"]/);
  assert.match(hook, /matchMedia\(['"]\(prefers-reduced-motion: reduce\)['"]\)\.matches/);
});

test('world resolves reduced motion once and children consume the resolved profile', async () => {
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  const childPaths = [
    '../components/hex-world/HexDioramaCamera.tsx',
    '../components/hex-world/HexTileInstances.tsx',
    '../components/hex-world/HexSelectionEffects.tsx',
    '../components/hex-world/pbr/HexPBRVegetation.tsx',
    '../components/hex-world/HexSkyAtmosphere.tsx',
    '../components/hex-world/HexWaterSurface.tsx',
    '../components/hex-world/HexBuildings.tsx',
    '../components/hex-world/HexPlacementEffects.tsx',
  ];
  assert.match(world, /useReducedHexMotion/);
  assert.match(world, /resolveHexMotionProfile/);
  assert.doesNotMatch(world, /const reducedMotion = false/);
  for (const path of childPaths) {
    const child = await source(path);
    assert.doesNotMatch(child, /matchMedia\(/);
  }
});
