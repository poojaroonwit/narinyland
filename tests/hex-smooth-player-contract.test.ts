import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('player smooths velocity while preserving traversal authority', async () => {
  const source = await read('components/hex-world/HexPlayerController.tsx');
  assert.match(source, /smoothVector2/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.acceleration/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.deceleration/);
  assert.match(source, /velocityRef/);
  assert.match(source, /resolveWalkablePlayerPosition/);
  assert.match(source, /PLAYER_SPEED\s*=\s*1\.7/);
});

test('player smooths shortest-path heading and camera follow', async () => {
  const source = await read('components/hex-world/HexPlayerController.tsx');
  assert.match(source, /smoothAngle/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.heading/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.camera/);
  assert.match(source, /desiredTarget/);
  assert.match(source, /controls\.target/);
});

test('avatar gait is driven by normalized movement amount', async () => {
  const source = await read('components/hex-world/HexPlayerAvatar.tsx');
  assert.match(source, /movementAmount/);
  assert.match(source, /smoothScalar/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.gait/);
  assert.doesNotMatch(source, /const stride = moving \?/);
});

test('interaction suspension clears velocity and prevents drift', async () => {
  const source = await read('components/hex-world/HexPlayerController.tsx');
  assert.match(source, /movementSuspended/);
  assert.match(source, /velocityRef\.current\s*=\s*\{\s*x:\s*0,\s*z:\s*0\s*\}/);
  assert.match(source, /ZERO_HEX_EXPLORE_MOVEMENT/);
});
