import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

test('explore ground and environment are bounded visual-only instanced layers', async () => {
  const [ground, environment] = await Promise.all([
    source('components/hex-world/HexExploreGroundLayer.tsx'),
    source('components/hex-world/HexExploreEnvironmentLayer.tsx'),
  ]);
  assert.match(ground, /instancedMesh/);
  assert.match(environment, /instancedMesh/);
  assert.match(ground, /getExploreDecorationSamples/);
  assert.match(environment, /getExploreDecorationSamples/);
  assert.doesNotMatch(`${ground}\n${environment}`, /fetch\(|hexWorldAPI|prisma|api\//);
});

test('hex world mounts premium explore presentation only in person mode', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.match(world, /HexExploreGroundLayer/);
  assert.match(world, /HexExploreEnvironmentLayer/);
  assert.match(world, /viewMode\s*===\s*['"]person['"][\s\S]*HexExploreGroundLayer/s);
  assert.match(world, /viewMode\s*===\s*['"]person['"][\s\S]*HexExploreEnvironmentLayer/s);
  assert.match(world, /HexTileInstances/);
  assert.match(world, /HexPBRVegetation/);
  assert.doesNotMatch(world, /HexTerrainDetails|HexAmbientDecor/);
});
