import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('eligible expansion clusters are selected in-world instead of a long list', async () => {
  const clusters = await readFile(new URL('../components/hex-world/HexExpansionClusters.tsx', import.meta.url), 'utf8');
  const controller = await readFile(new URL('../components/hex-world/HexExpansionController.tsx', import.meta.url), 'utf8');
  const scene = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(clusters, /instancedMesh/);
  assert.match(scene, /HexExpansionClusters/);
  assert.doesNotMatch(controller, /snapshot\.expansions\.map/);
  assert.match(controller, /hexes/);
  assert.match(controller, /Points/);
});
