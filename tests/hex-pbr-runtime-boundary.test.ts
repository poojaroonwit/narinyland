import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PBR runtime path resolver emits local asset paths only', async () => {
  const paths = await source('lib/hex-world/pbr/asset-paths.ts').catch(() => '');
  assert.match(paths, /\/assets\/hex-world\//);
  assert.match(paths, /getPBRAssetPath/);
  assert.doesNotMatch(paths, /https?:\/\//);
  assert.doesNotMatch(paths, /polyhaven|api\.polyhaven|dl\.polyhaven/i);
});

test('Hex World runtime code never depends on Poly Haven hosts', async () => {
  const runtimePaths = [
    'components/hex-world/HexWorld3D.tsx',
    'components/hex-world/pbr/HexPBRTerrain.tsx',
    'components/hex-world/pbr/HexPBRCliff.tsx',
    'components/hex-world/pbr/HexPBRVegetation.tsx',
    'components/hex-world/pbr/HexPBRAssetPreloader.tsx',
    'components/hex-world/HexWaterSurface.tsx',
    'components/hex-world/models/HexNatureModels.tsx',
    'lib/hex-world/pbr/vegetation-scatter.ts',
    'lib/hex-world/pbr/asset-manifest.ts',
    'lib/hex-world/pbr/asset-paths.ts',
    'lib/hex-world/pbr/quality-assets.ts',
    'lib/hex-world/natural-terrain.ts',
    'lib/hex-world/island-boundary.ts',
  ];
  const combined = (await Promise.all(runtimePaths.map((path) => source(path)))).join('\n');
  assert.doesNotMatch(combined, /api\.polyhaven\.com|dl\.polyhaven\.org|polyhaven\.com\/a\//i);
});
