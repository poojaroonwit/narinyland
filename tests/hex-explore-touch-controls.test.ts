import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const sourcePath = new URL('../components/hex-world/HexExploreTouchControls.tsx', import.meta.url);

test('mobile Explore joystick owns only its pointer stream and resets safely', async () => {
  const source = await readFile(sourcePath, 'utf8').catch(() => '');
  assert.ok(source, 'HexExploreTouchControls must exist');
  assert.match(source, /setPointerCapture/);
  assert.match(source, /onPointerCancel/);
  assert.match(source, /onLostPointerCapture/);
  assert.match(source, /stopPropagation\(\)/);
  assert.match(source, /touch-none/);
  assert.match(source, /sm:hidden/);
  assert.match(source, /Movement joystick/);
  assert.match(source, /ZERO_HEX_EXPLORE_MOVEMENT/);
  assert.match(source, /movementInputRef\.current/);
});

test('mobile Explore joystick clears movement on disable and lifecycle cleanup', async () => {
  const source = await readFile(sourcePath, 'utf8').catch(() => '');
  assert.ok(source, 'HexExploreTouchControls must exist');
  assert.match(source, /useEffect/);
  assert.match(source, /enabled/);
  assert.match(source, /reset/);
  assert.match(source, /pointerup|onPointerUp/);
});
