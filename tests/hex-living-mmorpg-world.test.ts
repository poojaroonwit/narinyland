import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { hexKey, hexNeighbors } from '@/lib/hex-world/hex-grid';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import * as vegetationScatter from '@/lib/hex-world/pbr/vegetation-scatter';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const tiles: HexTileDTO[] = [];
for (let q = -2; q <= 2; q += 1) {
  for (let r = -2; r <= 2; r += 1) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) > 2) continue;
    tiles.push({ q, r, height: 0, unlocked: true, terrainType: 'grass' });
  }
}

const edgeKeys = new Set(
  tiles
    .filter((tile) => hexNeighbors(tile).some((neighbor) => !tiles.some((candidate) => hexKey(candidate) === hexKey(neighbor))))
    .map(hexKey),
);

test('Explore uses a deterministic clustered PBR vegetation composition with edge groves', () => {
  const buildExplore = (vegetationScatter as typeof vegetationScatter & {
    buildExplorePBRVegetationScatter?: typeof vegetationScatter.buildPBRVegetationScatter;
  }).buildExplorePBRVegetationScatter;
  assert.equal(typeof buildExplore, 'function', 'Explore must have its own PBR composition builder');
  if (!buildExplore) return;

  const profile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440 });
  const first = buildExplore({ tiles, buildings: [], seed: 'living-world', profile });
  const second = buildExplore({ tiles, buildings: [], seed: 'living-world', profile });
  assert.deepEqual(first, second);
  assert.ok(first.length > 0 && first.length <= profile.pbrGroundPropBudget);

  const edge = first.filter((item) => edgeKeys.has(item.tileKey));
  const interior = first.filter((item) => !edgeKeys.has(item.tileKey));
  const groveKinds = new Set(['tree', 'shrub', 'fern']);
  const edgeGroveRate = edge.filter((item) => groveKinds.has(item.kind)).length / Math.max(1, edge.length);
  const interiorGroveRate = interior.filter((item) => groveKinds.has(item.kind)).length / Math.max(1, interior.length);
  assert.ok(edgeGroveRate > interiorGroveRate, 'island edges should read as denser groves than interior clearings');
});

test('Explore composition remains quality bounded and mobile stays lighter', () => {
  const buildExplore = (vegetationScatter as typeof vegetationScatter & {
    buildExplorePBRVegetationScatter?: typeof vegetationScatter.buildPBRVegetationScatter;
  }).buildExplorePBRVegetationScatter;
  assert.equal(typeof buildExplore, 'function');
  if (!buildExplore) return;
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440 });
  const mobile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 390 });
  const highScatter = buildExplore({ tiles, buildings: [], seed: 'living-density', profile: high });
  const mobileScatter = buildExplore({ tiles, buildings: [], seed: 'living-density', profile: mobile });
  assert.ok(mobileScatter.length < highScatter.length);
  assert.ok(highScatter.length <= high.pbrGroundPropBudget);
  assert.ok(mobileScatter.length <= mobile.pbrGroundPropBudget);
});

test('person-scale World selects the living PBR composition and avoids primitive core foliage', async () => {
  const vegetation = await source('components/hex-world/pbr/HexPBRVegetation.tsx');
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const explore = await source('components/hex-world/HexExploreEnvironmentLayer.tsx');
  assert.match(vegetation, /buildExplorePBRVegetationScatter/);
  assert.match(vegetation, /presentation/);
  assert.match(world, /presentation=\{viewMode\}/);
  assert.doesNotMatch(explore, /dodecahedronGeometry/, 'Explore core foliage should come from scanned PBR assets, not placeholder polyhedra');
});
