import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const controllerPath = 'components/hex-world/HexBuildController.tsx';

test('Explore interaction state resets with existing touch movement lifecycle', async () => {
  const source = await readFile(controllerPath, 'utf8');
  assert.match(source, /clearExploreInteraction/);
  assert.match(source, /setExploreInteractionTarget\(null\)/);
  assert.match(source, /setExploreInteractionBuildingId\(null\)/);
  assert.match(source, /exploreMovementInputRef\.current = ZERO_HEX_EXPLORE_MOVEMENT/);
});
