import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const controllerPath = 'components/hex-world/HexBuildController.tsx';
const overlayPath = 'components/hex-world/HexGameplayOverlay.tsx';

test('build controller owns transient Explore interaction state and clears it across lifecycle boundaries', async () => {
  const source = await readFile(controllerPath, 'utf8');
  assert.match(source, /exploreInteractionTarget/);
  assert.match(source, /exploreInteractionBuildingId/);
  assert.match(source, /clearExploreInteraction/);
  assert.match(source, /onInteractionTargetChange/);
  assert.match(source, /ZERO_HEX_EXPLORE_MOVEMENT/);
  assert.match(source, /landId/);
  assert.match(source, /openBuild/);
  assert.match(source, /openExpand/);
  assert.match(source, /handleFarm/);
  assert.match(source, /startMoveSelected/);
  assert.match(source, /onResetView/);
});

test('Explore overlay reuses existing homestead panels and keeps one blocking surface', async () => {
  const source = await readFile(overlayPath, 'utf8');
  assert.match(source, /HexExploreInteractionPrompt/);
  assert.match(source, /HexQuickActionPanel/);
  assert.match(source, /HexLivingActionPanel/);
  assert.match(source, /movementInputRef/);
  assert.match(source, /ZERO_HEX_EXPLORE_MOVEMENT/);
  assert.match(source, /inventoryOpen/);
  assert.match(source, /hudPanel/);
  assert.match(source, /interaction/);
});
