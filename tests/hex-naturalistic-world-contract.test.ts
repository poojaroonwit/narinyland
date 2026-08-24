import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('World renders continuous natural terrain separately from authoritative hex picking', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const terrain = await source('components/hex-world/terrain/HexNaturalTerrain.tsx');
  const tiles = await source('components/hex-world/HexTileInstances.tsx');

  assert.match(world, /HexNaturalTerrain/);
  assert.match(world, /<HexNaturalTerrain[^>]*seed=\{snapshot\.world\.seed\}/);
  assert.match(world, /<HexTileInstances[^>]*presentation=["']proxy["']/);
  assert.match(terrain, /buildNaturalTerrainMesh/);
  assert.match(terrain, /BufferGeometry/);
  assert.match(terrain, /computeVertexNormals/);
  assert.match(terrain, /vertexColors/);
  assert.doesNotMatch(terrain, /onPointer|onClick|onHover|hexWorldAPI|prisma/i);

  assert.match(tiles, /presentation\??:\s*['"]visible['"]\s*\|\s*['"]proxy['"]/);
  assert.match(tiles, /colorWrite=\{false\}/);
  assert.match(tiles, /depthWrite=\{false\}/);
  assert.match(tiles, /instanceId/);
});

test('hex grid is contextual build and grow guidance rather than permanent world art', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const overlay = await source('components/hex-world/terrain/HexBuildGridOverlay.tsx');

  assert.match(world, /HexBuildGridOverlay/);
  assert.match(world, /buildingPreview|validKeys|invalidKeys/);
  assert.match(world, /expansionPlacementPreview/);
  assert.match(overlay, /instancedMesh/);
  assert.match(overlay, /ringGeometry/);
  assert.match(overlay, /validKeys/);
  assert.match(overlay, /invalidKeys/);
  assert.match(overlay, /expansion/);
  assert.doesNotMatch(overlay, /Math\.random|https?:\/\//);
});

test('normal World no longer uses visible stacked hex cylinders as primary ground', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const tiles = await source('components/hex-world/HexTileInstances.tsx');

  assert.match(world, /presentation=["']proxy["']/);
  assert.match(tiles, /const proxy = props\.presentation === ['"]proxy['"]/);
  assert.match(tiles, /proxy\s*\?\s*\([\s\S]*?<meshBasicMaterial[\s\S]*?colorWrite=\{false\}[\s\S]*?depthWrite=\{false\}/);
  assert.doesNotMatch(world, /HEX_TILE_DEPTH/);
});

test('floating island side is one boundary-driven geological shell instead of per-hex rock masses', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const shell = await source('components/hex-world/terrain/HexIslandCliffShell.tsx');
  const boundary = await source('lib/hex-world/island-boundary.ts');

  assert.match(world, /HexIslandCliffShell/);
  assert.match(world, /<HexIslandCliffShell[^>]*seed=\{snapshot\.world\.seed\}/);
  assert.doesNotMatch(world, /<HexIslandUnderside\b/);
  assert.match(shell, /buildNaturalTerrainMesh/);
  assert.match(shell, /buildIslandCliffMesh/);
  assert.match(shell, /BufferGeometry/);
  assert.match(shell, /computeVertexNormals/);
  assert.match(shell, /vertexColors/);
  assert.doesNotMatch(shell, /dodecahedronGeometry|Math\.random|https?:\/\//);
  assert.match(boundary, /soilLipDepth/);
  assert.match(boundary, /rockWallDepth/);
  assert.match(boundary, /lowerTaper/);
  assert.doesNotMatch(boundary, /Math\.random/);
});

test('naturalistic world stays local deterministic and avoids heavyweight renderer dependencies', async () => {
  const files = await Promise.all([
    source('components/hex-world/terrain/HexNaturalTerrain.tsx'),
    source('components/hex-world/terrain/HexBuildGridOverlay.tsx'),
    source('lib/hex-world/natural-terrain.ts'),
  ]);
  const combined = files.join('\n');

  assert.doesNotMatch(combined, /Math\.random|https?:\/\//);
  assert.doesNotMatch(combined, /EffectComposer|Bloom|SSAO|SSR|DepthOfField|WebGPU|CubeCamera/);
});
