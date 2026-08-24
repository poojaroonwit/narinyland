import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('build controller owns one shared Explore movement ref for world and overlay', async () => {
  const controller = await read('components/hex-world/HexBuildController.tsx');
  assert.match(controller, /exploreMovementInputRef/);
  const passes = controller.match(/movementInputRef=\{exploreMovementInputRef\}/g) ?? [];
  assert.ok(passes.length >= 2, 'same movement ref must be passed to world and overlay');
  assert.match(controller, /ZERO_HEX_EXPLORE_MOVEMENT/);
});

test('overlay suspends touch movement behind blocking Explore surfaces', async () => {
  const overlay = await read('components/hex-world/HexGameplayOverlay.tsx');
  assert.match(overlay, /movementInputRef/);
  assert.match(overlay, /touchControlsEnabled/);
  assert.match(overlay, /inventoryOpen/);
  assert.match(overlay, /hudPanel/);
  assert.match(overlay, /detailsOpen/);
  assert.match(overlay, /ZERO_HEX_EXPLORE_MOVEMENT/);
});

test('Explore HUD renders mobile joystick and no longer requires a keyboard', async () => {
  const hud = await read('components/hex-world/HexExploreHUD.tsx');
  assert.match(hud, /HexExploreTouchControls/);
  assert.match(hud, /movementInputRef/);
  assert.match(hud, /touchControlsEnabled/);
  assert.doesNotMatch(hud, /movement requires a keyboard/i);
  assert.match(hud, /Move with the joystick/);
  assert.match(hud, /WASD \/ arrows/);
});

test('player controller combines keyboard and touch before authoritative traversal', async () => {
  const player = await read('components/hex-world/HexPlayerController.tsx');
  assert.match(player, /combineExploreMovementInputs/);
  assert.match(player, /movementInputRef\.current/);
  assert.match(player, /getCameraRelativeMoveVector/);
  assert.match(player, /resolveWalkablePlayerPosition/);
  assert.match(player, /KeyW/);
  assert.match(player, /ArrowUp/);
});

test('world passes shared movement input only into person controller path', async () => {
  const world = await read('components/hex-world/HexWorld3D.tsx');
  assert.match(world, /movementInputRef/);
  assert.match(world, /viewMode === 'person'/);
  assert.match(world, /<HexPlayerController/);
});
