import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('premium graphics pass keeps bounded procedural architecture', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const quality = await source('lib/hex-world/quality.ts');

  assert.match(world, /HexTerrainDetails/);
  assert.match(world, /getHexVisualEnvironment/);
  assert.doesNotMatch(world, /EffectComposer|Bloom|DepthOfField|SSAO|SSR/);
  assert.match(quality, /maxDpr:\s*1\.75/);
  assert.match(quality, /maxDpr:\s*1\.35/);
  assert.match(quality, /maxDpr:\s*1,/);
});

test('visual theme centralizes terrain structure water and atmosphere palettes', async () => {
  const theme = await source('lib/hex-world/visual-theme.ts');

  for (const token of ['terrain', 'structures', 'vegetation', 'water', 'atmosphere']) {
    assert.match(theme, new RegExp(token));
  }
  assert.match(theme, /HexVisualEnvironment/);
  assert.match(theme, /getHexVisualEnvironment/);
});

test('terrain detail and underside remain deterministic and instanced', async () => {
  const details = await source('components/hex-world/HexTerrainDetails.tsx');
  const underside = await source('components/hex-world/HexIslandUnderside.tsx');
  const tiles = await source('components/hex-world/HexTileInstances.tsx');

  assert.match(details, /instancedMesh/);
  assert.match(details, /ambientDensity/);
  assert.match(details, /seed/);
  assert.doesNotMatch(details, /Math\.random/);
  assert.match(underside, /getBoundaryTiles/);
  assert.match(underside, /instancedMesh/);
  assert.match(tiles, /getTerrainPresentation|HEX_VISUAL_THEME/);
});

test('lighting keeps one shadow owner and atmosphere accepts visual environment only', async () => {
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  const sky = await source('components/hex-world/HexSkyAtmosphere.tsx');

  assert.equal((lighting.match(/<directionalLight/g) ?? []).length, 1);
  assert.match(lighting, /HexVisualEnvironment/);
  assert.match(sky, /HexVisualEnvironment/);
  assert.doesNotMatch(sky, /HomesteadLifeState|HomesteadLifeAction/);
});

test('vegetation and water stay quality-aware and batched', async () => {
  const decor = await source('components/hex-world/HexAmbientDecor.tsx');
  const water = await source('components/hex-world/HexWaterSurface.tsx');

  assert.match(decor, /SwayInstanceBatch/);
  assert.match(decor, /canop/i);
  assert.match(water, /waterDetail/);
  assert.match(water, /waterGlintCount/);
  assert.doesNotMatch(water, /CubeCamera|Reflector|MeshReflectorMaterial/);
});

test('structure models share miniature construction primitives', async () => {
  const structures = await source('components/hex-world/models/HexStructureModels.tsx');

  for (const helper of ['Foundation', 'RoofTrim', 'Window', 'DoorFrame']) {
    assert.match(structures, new RegExp(`function ${helper}|const ${helper}`));
  }
  for (const key of ['home', 'barn', 'storage', 'workshop']) {
    assert.match(structures, new RegExp(`case '${key}'`));
  }
  assert.doesNotMatch(structures, /https?:\/\//);
});
