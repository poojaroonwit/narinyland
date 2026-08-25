import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('World uses the organic PBR cliff shell and retires legacy underside renderers', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.match(world, /HexPBRCliff/);
  assert.match(world, /<HexPBRCliff[^>]*tiles=\{snapshot\.tiles\}[^>]*seed=\{snapshot\.world\.seed\}/);
  assert.doesNotMatch(world, /HexIslandUnderside|HexIslandCliffShell/);
});

test('quality tiers expose bounded natural detail budgets without adding tier names', async () => {
  const quality = await source('lib/hex-world/quality.ts');
  assert.match(quality, /groundCoverPerTile:\s*5\s*\|\s*3\s*\|\s*1/);
  assert.match(quality, /treeLeafClusters:\s*7\s*\|\s*5\s*\|\s*3/);
  assert.match(quality, /cliffDetailScale:\s*1\s*\|\s*0\.7\s*\|\s*0\.4/);
  for (const value of ['groundCoverPerTile: 5', 'groundCoverPerTile: 3', 'groundCoverPerTile: 1', 'treeLeafClusters: 7', 'treeLeafClusters: 5', 'treeLeafClusters: 3']) {
    assert.match(quality, new RegExp(value.replace('.', '\\.')));
  }
  assert.doesNotMatch(quality, /'ultra'|'low-end'|'cinematic'/);
});

test('visual theme exposes grounded terrain and physically distinct structure tokens', async () => {
  const theme = await source('lib/hex-world/visual-theme.ts');
  for (const token of ['pathDirt', 'cliffRock', 'dampBank', 'glass', 'metal', 'sunDay', 'horizonHaze']) {
    assert.match(theme, new RegExp(`${token}:`));
  }
});

test('ground cover and ambient vegetation are deterministic scanned natural silhouettes', async () => {
  const vegetation = await source('components/hex-world/pbr/HexPBRVegetation.tsx');
  const scatter = await source('lib/hex-world/pbr/vegetation-scatter.ts');
  assert.match(vegetation, /useGLTF/);
  assert.match(vegetation, /instancedMesh/);
  assert.match(vegetation, /worldWindScale/);
  assert.match(vegetation, /worldWindSecondaryScale/);
  assert.match(scatter, /pbrVegetationScale/);
  assert.match(scatter, /deterministic/i);
  assert.doesNotMatch(`${vegetation}\n${scatter}`, /Math\.random|https?:\/\//);
});

test('core homestead structures use local UV-mapped PBR construction and physical glass metal', async () => {
  const structures = await source('components/hex-world/pbr/HexPBRBuildings.tsx');
  for (const helper of ['StoneFoundation', 'WallPanel', 'PitchedRoof', 'NaturalWindow', 'TimberBeam', 'GablePanel']) {
    assert.match(structures, new RegExp(`function ${helper}|const ${helper}`));
  }
  for (const key of ['home', 'barn', 'storage', 'workshop']) {
    assert.match(structures, new RegExp(`case '${key}'`));
  }
  assert.match(structures, /getPBRTextureSet/);
  assert.match(structures, /map=/);
  assert.match(structures, /normalMap=/);
  assert.match(structures, /roughnessMap=/);
  assert.match(structures, /meshPhysicalMaterial/);
  assert.match(structures, /HEX_VISUAL_THEME\.structures\.glass/);
  assert.match(structures, /HEX_VISUAL_THEME\.structures\.metal/);
  assert.doesNotMatch(structures, /coneGeometry/);
  assert.doesNotMatch(structures, /https?:\/\//);
});

test('buildable nature reuses local scanned assets instead of geometric tree canopy', async () => {
  const nature = await source('components/hex-world/models/HexNatureModels.tsx');
  assert.match(nature, /useGLTF/);
  assert.match(nature, /LocalPBRModel/);
  assert.match(nature, /case 'tree'/);
  assert.match(nature, /name="tree"/);
  assert.match(nature, /case 'pond'/);
  assert.match(nature, /name="rockSet"/);
  assert.match(nature, /name="fern"/);
  assert.match(nature, /case 'garden_patch'/);
  assert.doesNotMatch(nature, /dodecahedronGeometry/);
  assert.doesNotMatch(nature, /cylinderGeometry args=\{\[0\.82,\s*0\.86,\s*0\.17,\s*6\]\}/);
  assert.doesNotMatch(nature, /https?:\/\//);
});

test('water stays bounded but uses physical PBR normal detail and environment response', async () => {
  const water = await source('components/hex-world/pbr/HexPBRWater.tsx');
  assert.match(water, /meshPhysicalMaterial/);
  assert.match(water, /normalMap/);
  assert.match(water, /envMapIntensity/);
  assert.match(water, /ior=\{1\.33\}/);
  assert.match(water, /metalness=\{0\}/);
  assert.match(water, /transmission=/);
  assert.match(water, /HEX_VISUAL_THEME\.water\.deep/);
  assert.match(water, /HEX_VISUAL_THEME\.water\.shallow/);
  assert.match(water, /waterGlintCount/);
  assert.match(water, /1\.73/);
  assert.doesNotMatch(water, /CubeCamera|Reflector|MeshReflectorMaterial|SSR|EffectComposer|https?:\/\//);
});

test('lighting atmosphere and World camera communicate outdoor scale without extra shadow owners', async () => {
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  const sky = await source('components/hex-world/HexSkyAtmosphere.tsx');
  const camera = await source('lib/hex-world/camera.ts');
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
  assert.match(lighting, /HEX_VISUAL_THEME\.atmosphere\.sunDay/);
  assert.match(sky, /BelowIslandHaze/);
  assert.match(sky, /horizonHaze/);
  assert.match(camera, /distance \* 0\.44/);
  assert.match(camera, /distance \* 0\.72/);
  assert.doesNotMatch(`${lighting}\n${sky}`, /EffectComposer|Bloom|SSAO|SSR|DepthOfField|CubeCamera/);
});
