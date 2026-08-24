import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('expansion chooses a growth size before entering free ghost placement', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexExpansionController.tsx', import.meta.url), 'utf8');
  const scene = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(scene, /HexExpansionClusters/);
  assert.match(scene, /ExpansionPlacementGhost/);
  assert.match(scene, /ExpansionPlacementPlane/);
  assert.doesNotMatch(controller, /snapshot\.expansions\.map/);
  assert.match(controller, /tierChoices/);
  assert.match(controller, /Grow your island/);
  assert.match(controller, /Tap the ghost land to choose this spot/);
  assert.match(controller, /hexes/);
  assert.match(controller, /Points/);
  assert.match(controller, /Small Grove/);
  assert.match(controller, /Garden Wing/);
  assert.match(controller, /Homestead Field/);
});
