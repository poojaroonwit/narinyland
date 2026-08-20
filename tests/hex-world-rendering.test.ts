import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { getHexTileTransform, hexRotationToRadians } from '@/lib/hex-world/rendering';

test('tile transform uses axial coordinate and stored height', () => {
  const transform = getHexTileTransform({ q: 2, r: -1, height: 0.3 });
  const expected = axialToWorld({ q: 2, r: -1 }, 1, 0.3);
  assert.deepEqual(transform.position, expected);
});

test('rotation 3 maps to half-turn yaw', () => {
  assert.equal(hexRotationToRadians(3), Math.PI);
});

test('hex tiles and ambient decor are rendered with instancing and no character controller', async () => {
  const tiles = await readFile(new URL('../components/hex-world/HexTileInstances.tsx', import.meta.url), 'utf8');
  const decor = await readFile(new URL('../components/hex-world/HexAmbientDecor.tsx', import.meta.url), 'utf8');
  const scene = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(tiles, /instancedMesh/);
  assert.match(decor, /instancedMesh/);
  assert.match(scene, /HexAmbientDecor/);
  assert.doesNotMatch(scene, /GameCameraController|WASD|Character/);
});

test('world scene delegates smart camera lighting and atmosphere instead of hard-coded camera', async () => {
  const scene = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(scene, /HexDioramaCamera/);
  assert.match(scene, /HexWorldLighting/);
  assert.match(scene, /HexSkyAtmosphere/);
  assert.doesNotMatch(scene, /camera=\{\{ position: \[17, 18, 22\]/);
  assert.doesNotMatch(scene, /<OrbitControls/);
});

test('selection feedback is a visual-only scene responsibility', async () => {
  const scene = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  const tiles = await readFile(new URL('../components/hex-world/HexTileInstances.tsx', import.meta.url), 'utf8');
  assert.match(scene, /HexSelectionEffects/);
  assert.doesNotMatch(tiles, /hexWorldAPI|fetch\(/);
});
