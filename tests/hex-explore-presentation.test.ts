import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

test('explore environment remains a bounded visual-only instanced layer', async () => {
  const environment = await source('components/hex-world/HexExploreEnvironmentLayer.tsx');
  assert.match(environment, /instancedMesh/);
  assert.match(environment, /getExploreDecorationSamples/);
  assert.doesNotMatch(environment, /fetch\(|hexWorldAPI|prisma|api\//);
});

test('hex world mounts premium explore detail only in person mode without covering PBR terrain', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.doesNotMatch(world, /HexExploreGroundLayer/);
  assert.match(world, /HexExploreEnvironmentLayer/);
  assert.match(world, /HexExploreStructureDetails/);
  assert.match(world, /viewMode\s*===\s*['"]person['"][\s\S]*HexExploreEnvironmentLayer/s);
  assert.match(world, /viewMode\s*===\s*['"]person['"][\s\S]*HexExploreStructureDetails/s);
  assert.match(world, /HexTileInstances/);
  assert.match(world, /HexPBRVegetation/);
  assert.doesNotMatch(world, /HexTerrainDetails|HexAmbientDecor/);
});
