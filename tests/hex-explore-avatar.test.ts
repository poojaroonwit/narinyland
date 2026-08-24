import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('explore avatar has a real articulated walk rig instead of whole-body bob only', async () => {
  const avatar = await source('components/hex-world/HexPlayerAvatar.tsx');
  for (const refName of ['leftArmRef', 'rightArmRef', 'leftLegRef', 'rightLegRef', 'torsoRef']) {
    assert.match(avatar, new RegExp(refName));
  }
  assert.match(avatar, /rotation\.[xz]/);
  assert.match(avatar, /moving/);
  assert.match(avatar, /reducedMotion/);
  assert.match(avatar, /backpack|Backpack/i);
  assert.match(avatar, /scarf|collar/i);
  assert.match(avatar, /hair/i);
});

test('explore camera uses the approved cozy RPG zoom range and preserves traversal helpers', async () => {
  const controller = await source('components/hex-world/HexPlayerController.tsx');
  assert.match(controller, /minDistance=\{2\.6\}/);
  assert.match(controller, /maxDistance=\{5\.2\}/);
  assert.match(controller, /PLAYER_CAMERA_TARGET_HEIGHT/);
  assert.match(controller, /getHexPlayerSpawn/);
  assert.match(controller, /resolveWalkablePlayerPosition/);
  assert.match(controller, /getCameraRelativeMoveVector/);
});
