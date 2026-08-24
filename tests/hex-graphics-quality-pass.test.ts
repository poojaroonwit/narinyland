import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('premium graphics pass keeps bounded PBR naturalistic architecture', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const quality = await source('lib/hex-world/quality.ts');
  assert.match(world, /HexPBRTerrain/);
  assert.match(world, /HexPBRCliff/);
  assert.match(world, /HexTerrainDetails/);
  assert.match(world, /getHexVisualEnvironment/);
  assert.doesNotMatch(world, /HexIslandUnderside|HexIslandCliffShell|HexNaturalTerrain/);
  assert.doesNotMatch(world, /EffectComposer|Bloom|DepthOfField|SSAO|SSR/);
  assert.match(quality, /maxDpr:\s*1\.75/);
  assert.match(quality, /maxDpr:\s*1\.5/);
  assert.match(quality, /maxDpr:\s*1,/);
  assert.match(quality, /pbrTextureTier/);
  assert.match(quality, /pbrGroundPropBudget/);
});

test('visual theme centralizes grounded terrain structure water and atmosphere palettes', async () => {
  const theme = await source('lib/hex-world/visual-theme.ts');
  for (const token of ['terrain', 'structures', 'vegetation', 'water', 'atmosphere', 'pathDirt', 'cliffRock', 'dampBank', 'glass', 'metal']) assert.match(theme, new RegExp(token));
  assert.match(theme, /HexVisualEnvironment/);
  assert.match(theme, /getHexVisualEnvironment/);
});

test('PBR terrain and organic cliff shell remain deterministic and local', async () => {
  const terrain = await source('components/hex-world/pbr/HexPBRTerrain.tsx');
  const cliff = await source('components/hex-world/pbr/HexPBRCliff.tsx');
  const boundary = await source('lib/hex-world/island-boundary.ts');
  const tiles = await source('components/hex-world/HexTileInstances.tsx');
  assert.match(terrain, /buildNaturalTerrainMesh/);
  assert.match(terrain, /normalMap/);
  assert.match(terrain, /roughnessMap/);
  assert.match(cliff, /buildIslandCliffMesh/);
  assert.match(cliff, /normalMap/);
  assert.match(boundary, /lowerTaper/);
  assert.doesNotMatch(`${terrain}\n${cliff}\n${boundary}`, /Math\.random|https?:\/\//);
  assert.match(tiles, /getTerrainPresentation|HEX_VISUAL_THEME/);
});

test('lighting keeps one shadow owner and atmosphere accepts visual environment only', async () => {
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  const sky = await source('components/hex-world/HexSkyAtmosphere.tsx');
  assert.equal((lighting.match(/<directionalLight/g) ?? []).length, 1);
  assert.match(lighting, /HexVisualEnvironment/);
  assert.match(sky, /HexVisualEnvironment/);
  assert.match(sky, /BelowIslandHaze/);
  assert.doesNotMatch(sky, /HomesteadLifeState|HomesteadLifeAction/);
});

test('World lighting interpolates target intensities and colors through Three refs', async () => {
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.match(lighting, /motionProfile/);
  assert.match(lighting, /lightingResponse/);
  assert.match(lighting, /useFrame/);
  assert.match(lighting, /DirectionalLight/);
  assert.match(lighting, /HemisphereLight/);
  assert.match(lighting, /AmbientLight/);
  assert.match(lighting, /Color/);
  assert.match(lighting, /\.lerp\(/);
  assert.match(lighting, /expSmoothingAlpha/);
  assert.doesNotMatch(lighting, /useState/);
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
  assert.match(lighting, /0\.22/);
  assert.match(lighting, /0\.19/);
  assert.match(lighting, /3\.2/);
  assert.match(lighting, /3\.8/);
  assert.match(lighting, /atmosphere\.sunDay/);
  assert.match(world, /<HexWorldLighting[^>]*motionProfile=\{motionProfile\}/);
});

test('vegetation and water stay quality-aware and batched', async () => {
  const decor = await source('components/hex-world/HexAmbientDecor.tsx');
  const water = await source('components/hex-world/HexWaterSurface.tsx');
  assert.match(decor, /SwayInstanceBatch/);
  assert.match(decor, /branches/);
  assert.match(decor, /treeLeafClusters/);
  assert.doesNotMatch(decor, /dodecahedronGeometry/);
  assert.match(water, /waterDetail/);
  assert.match(water, /waterGlintCount/);
  assert.match(water, /meshPhysicalMaterial/);
  assert.doesNotMatch(water, /CubeCamera|Reflector|MeshReflectorMaterial/);
});

test('World water uses bounded two-frequency motion shimmer and quality ripple budgets', async () => {
  const water = await source('components/hex-world/HexWaterSurface.tsx');
  assert.match(water, /waterMotionScale/);
  assert.match(water, /0\.010|0\.01/);
  assert.match(water, /0\.004/);
  assert.match(water, /1\.73/);
  assert.match(water, /materialRef/);
  assert.match(water, /roughness/);
  assert.match(water, /opacity/);
  assert.match(water, /0\.035/);
  assert.match(water, /0\.025/);
  assert.match(water, /0\.72/);
  assert.match(water, /1\.18/);
  assert.match(water, /profile\.waterDetail === ['"]full['"]/);
  assert.match(water, /profile\.waterDetail === ['"]reduced['"]/);
  assert.match(water, /instancedMesh/);
  assert.match(water, /ior=\{1\.33\}/);
  assert.match(water, /metalness=\{0\}/);
  assert.doesNotMatch(water, /CubeCamera|Reflector|MeshReflectorMaterial|EffectComposer|SSR/);
});

test('structure models use authored rural construction helpers', async () => {
  const structures = await source('components/hex-world/models/HexStructureModels.tsx');
  for (const helper of ['StoneFoundation', 'WallPanel', 'PitchedRoof', 'NaturalWindow', 'TimberBeam']) assert.match(structures, new RegExp(`function ${helper}|const ${helper}`));
  for (const key of ['home', 'barn', 'storage', 'workshop']) assert.match(structures, new RegExp(`case '${key}'`));
  assert.doesNotMatch(structures, /coneGeometry/);
  assert.doesNotMatch(structures, /https?:\/\//);
});
