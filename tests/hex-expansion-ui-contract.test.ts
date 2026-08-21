import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('expansion chooses a size before entering free ghost placement', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexExpansionController.tsx', import.meta.url), 'utf8');
  const scene = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(scene, /HexExpansionClusters/);
  assert.match(scene, /ExpansionPlacementGhost/);
  assert.match(scene, /ExpansionPlacementPlane/);
  assert.doesNotMatch(controller, /snapshot\.expansions\.map/);
  assert.match(controller, /tierChoices/);
  assert.match(controller, /Choose where to place/);
  assert.match(controller, /hexes/);
  assert.match(controller, /Points/);
});
