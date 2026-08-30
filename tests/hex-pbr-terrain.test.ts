import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { buildNaturalTerrainMesh } from '@/lib/hex-world/natural-terrain';
import { buildIslandCliffMesh } from '@/lib/hex-world/island-boundary';
import type { HexTileDTO } from '@/lib/hex-world/types';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const tiles: HexTileDTO[] = [
  { q: 0, r: 0, height: 0, unlocked: true, terrainType: 'grass' },
  { q: 1, r: 0, height: 0.14, unlocked: true, terrainType: 'soil' },
  { q: 0, r: 1, height: 0.05, unlocked: true, terrainType: 'stone', metadata: { feature: 'path' } },
];

test('natural terrain exposes deterministic UVs and bounded material groups without moving geometry', () => {
  const mesh = buildNaturalTerrainMesh(tiles, 'pbr-test');
  assert.equal(mesh.uvs.length, (mesh.positions.length / 3) * 2);
  assert.ok(mesh.groups.length >= 2);
  assert.equal(mesh.groups.reduce((sum, group) => sum + group.count, 0), mesh.indices.length);
  assert.deepEqual([...new Set(mesh.groups.map((group) => group.material))].sort(), ['grass', 'path', 'soil'].sort());
  assert.ok(mesh.uvs.every(Number.isFinite));
});

test('cliff mesh exposes projected UVs and separate soil and rock material groups', () => {
  const terrain = buildNaturalTerrainMesh(tiles, 'pbr-test');
  const cliff = buildIslandCliffMesh(terrain.boundaryEdges, 'pbr-test');
  assert.equal(cliff.uvs.length, (cliff.positions.length / 3) * 2);
  assert.deepEqual(cliff.groups.map((group) => group.material).sort(), ['rock', 'soil']);
  assert.equal(cliff.groups.reduce((sum, group) => sum + group.count, 0), cliff.indices.length);
  assert.ok(cliff.uvs.every(Number.isFinite));
});

test('normal World terrain and cliff renderers bind local PBR maps instead of flat vertex colors', async () => {
  const terrain = await source('components/hex-world/pbr/HexPBRTerrain.tsx').catch(() => '');
  const cliff = await source('components/hex-world/pbr/HexPBRCliff.tsx').catch(() => '');
  const textureHelpers = await source('lib/hex-world/pbr/terrain-materials.ts').catch(() => '');
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const combined = `${terrain}\n${cliff}`;

  assert.match(terrain, /useTexture/);
  assert.match(terrain, /getPBRTextureSet/);
  assert.match(cliff, /useTexture/);
  assert.match(cliff, /getPBRTextureSet/);
  assert.match(combined, /map=/);
  assert.match(combined, /normalMap=/);
  assert.match(combined, /roughnessMap=/);
  assert.match(combined, /createOwnedPBRTextureBundle/);
  assert.match(textureHelpers, /SRGBColorSpace/);
  assert.match(textureHelpers, /NoColorSpace/);
  assert.match(textureHelpers, /RepeatWrapping/);
  assert.doesNotMatch(combined, /https?:\/\/|polyhaven/i);

  assert.match(world, /HexPBRTerrain/);
  assert.match(world, /HexPBRCliff/);
  assert.doesNotMatch(world, /<HexNaturalTerrain\b|<HexIslandCliffShell\b/);
});

test('Explore mode does not cover the PBR land surface with legacy flat turf or path meshes', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  assert.doesNotMatch(world, /HexExploreGroundLayer/);
});
