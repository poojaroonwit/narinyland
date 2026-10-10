import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('landing and in-game renderer default to texture-free storybook assets', async () => {
  const [landing, renderer, buildings] = await Promise.all([
    read('components/landing/LandingWorldExperience.tsx'),
    read('components/hex-world/HexWorld3D.tsx'),
    read('components/hex-world/HexBuildingModels.tsx'),
  ]);

  assert.match(landing, /visualStyle="storybook"/);
  assert.match(renderer, /props\.visualStyle\?\?'storybook'/);
  for (const layer of ['HexStorybookCliff', 'HexStorybookTerrain', 'HexStorybookVegetation', 'HexStorybookWater', 'HexStorybookFragments']) {
    assert.match(renderer, new RegExp(layer));
  }
  assert.match(renderer, /visualStyle==='natural'&&<HexPBRAssetPreloader/);
  assert.match(renderer, /visualStyle==='natural'&&<HexPBREnvironment/);
  assert.match(buildings, /visualStyle === 'storybook'/);
  assert.match(buildings, /HexStorybookBuildingModel/);
});

test('storybook material and building implementations never fetch or mount photographic assets', async () => {
  const [world, props] = await Promise.all([
    read('components/hex-world/storybook/HexStorybookWorld.tsx'),
    read('components/hex-world/storybook/HexStorybookBuildingModels.tsx'),
  ]);
  for (const [label, source] of [['world', world], ['buildings', props]] as const) {
    for (const banned of ['useTexture', 'useGLTF', 'useEnvironment', 'TextureLoader', 'normalMap=', 'roughnessMap=', 'map={', '.glb', '.hdr', '.jpg', '.webp', '/pbr/quality-assets']) {
      assert.ok(!source.includes(banned), `${label} loads realistic asset: ${banned}`);
    }
    assert.ok(!source.includes('fetch('), `${label} makes network requests`);
    assert.match(source, /roughness=\{?0\.9|roughness=\{?1|roughness=\{?0\.78/);
  }
  assert.match(world, /buildNaturalTerrainMesh/);
  assert.match(world, /buildIslandCliffMesh/);
  assert.match(world, /raycast=\{\(\) => \{\}\}/);
  assert.match(props, /StorybookGarden/);
  assert.match(props, /Cottage/);
});

test('storybook still uses authoritative tile, building and camera data', async () => {
  const [renderer, buildings] = await Promise.all([
    read('components/hex-world/HexWorld3D.tsx'),
    read('components/hex-world/HexBuildings.tsx'),
  ]);
  assert.match(renderer, /<HexTileInstances /);
  assert.match(renderer, /presentation="proxy"/);
  assert.match(renderer, /<HexBuildGridOverlay /);
  assert.match(renderer, /<HexPlayerController /);
  assert.match(renderer, /<HexDioramaCamera /);
  assert.match(renderer, /visualStyle=\{visualStyle\}/);
  assert.match(buildings, /onSelect\?\.\(building\)/);
  assert.match(buildings, /buildingTiers\?/);
});
