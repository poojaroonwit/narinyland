import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('hex world switches between diorama and person controller paths', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexPlayerController/);
  assert.match(source, /viewMode.*world.*person|viewMode.*person/s);
  assert.match(source, /viewMode\s*===\s*['"]person['"]/);
  assert.match(source, /<HexDioramaCamera/);
});

test('person controller uses close cozy third-person orbit bounds', async () => {
  const source = await readFile(new URL('../components/hex-world/HexPlayerController.tsx', import.meta.url), 'utf8');
  assert.match(source, /minDistance=\{2\.6\}/);
  assert.match(source, /maxDistance=\{5\.2\}/);
  assert.match(source, /PLAYER_CAMERA_TARGET_HEIGHT/);
  assert.match(source, /controls\.target/);
  assert.match(source, /getHexPlayerSpawn/);
  assert.match(source, /resolveWalkablePlayerPosition/);
});

test('person controller supports WASD and arrow movement without hijacking editable controls', async () => {
  const source = await readFile(new URL('../components/hex-world/HexPlayerController.tsx', import.meta.url), 'utf8');
  for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    assert.match(source, new RegExp(key));
  }
  assert.match(source, /INPUT|input/);
  assert.match(source, /TEXTAREA|textarea/);
  assert.match(source, /isContentEditable/);
});
