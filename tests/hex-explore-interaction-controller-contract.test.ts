import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const playerPath = 'components/hex-world/HexPlayerController.tsx';
const worldPath = 'components/hex-world/HexWorld3D.tsx';

test('player controller reports proximity targets only when target identity changes', async () => {
  const playerSource = await readFile(playerPath, 'utf8');
  assert.match(playerSource, /getExploreInteractionTarget/);
  assert.match(playerSource, /lastInteractionTargetIdRef/);
  assert.match(playerSource, /onInteractionTargetChange/);
  assert.match(playerSource, /buildingId/);
});

test('world passes interaction reporting only into the person controller path', async () => {
  const worldSource = await readFile(worldPath, 'utf8');
  assert.match(worldSource, /onInteractionTargetChange/);
  assert.match(worldSource, /viewMode === 'person'/);
  assert.match(worldSource, /HexPlayerController/);
});
