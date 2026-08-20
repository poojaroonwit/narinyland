import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('builder exposes one world toolbar and in-product contextual actions', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  for (const name of ['HexWorldToolbar', 'HexPlacementBar', 'HexBuildingContextToolbar', 'HexRemovalConfirm']) {
    assert.match(controller, new RegExp(name));
  }
  assert.doesNotMatch(controller, /window\.confirm/);
});

test('world toolbar carries Build Expand and Reset View with mobile-safe controls', async () => {
  const toolbar = await readFile(new URL('../components/hex-world/HexWorldToolbar.tsx', import.meta.url), 'utf8');
  for (const label of ['Build', 'Expand', 'Reset View']) assert.match(toolbar, new RegExp(label));
  assert.match(toolbar, /min-h-\[44px\]|h-11|h-12/);
  assert.match(toolbar, /safe-area-inset-bottom/);
});

test('keyboard shortcuts ignore editable controls', async () => {
  const hook = await readFile(new URL('../components/hex-world/useHexKeyboardShortcuts.ts', import.meta.url), 'utf8');
  assert.match(hook, /INPUT/);
  assert.match(hook, /TEXTAREA/);
  assert.match(hook, /contentEditable|isContentEditable/);
  assert.match(hook, /Escape/);
  assert.match(hook, /Enter/);
});
