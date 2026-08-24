import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('builder exposes one gameplay overlay plus contextual edit actions', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  for (const name of ['HexGameplayOverlay', 'HexPlacementBar', 'HexBuildingContextToolbar', 'HexRemovalConfirm']) {
    assert.match(controller, new RegExp(name));
  }
  const overlay = await readFile(new URL('../components/hex-world/HexGameplayOverlay.tsx', import.meta.url), 'utf8');
  for (const name of ['HexWorldToolbar', 'HexQuickActionPanel', 'HexInventorySheet']) assert.match(overlay, new RegExp(name));
  assert.doesNotMatch(controller, /window\.confirm/);
});

test('world toolbar carries Farm Build Bag Goals plus compact grow/reset utilities', async () => {
  const toolbar = await readFile(new URL('../components/hex-world/HexWorldToolbar.tsx', import.meta.url), 'utf8');
  for (const label of ['Farm', 'Build', 'Bag', 'Goals']) assert.match(toolbar, new RegExp(label));
  assert.match(toolbar, /aria-label="Grow land"/i);
  assert.match(toolbar, /aria-label="Reset view"/i);
  assert.match(toolbar, /min-h-\[48px\]|min-h-\[44px\]|h-11|h-12/);
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

test('build mode places on valid tile click while move mode keeps explicit confirmation', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  const placementBar = await readFile(new URL('../components/hex-world/HexPlacementBar.tsx', import.meta.url), 'utf8');

  assert.match(controller, /const confirmPlacementAt = async \(coord: HexCoord\)/);
  assert.match(controller, /state\.mode === 'placing'[\s\S]*confirmPlacementAt\(coord\)/);
  assert.match(controller, /state\.mode === 'moving'[\s\S]*setAnchor\(coord\)/);
  assert.match(controller, /onSelectTile=\{handleTileSelect\}/);

  assert.doesNotMatch(placementBar, />Place</);
  assert.match(placementBar, /mode === 'moving'/);
  assert.match(placementBar, /Move here/);
});

test('confirmed building mutations create presentation-only visual events', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(controller, /new Set\(snapshot\.buildings\.map\(\(building\) => building\.id\)\)/);
  assert.match(controller, /confirmed\.snapshot\.buildings\.find/);
  assert.match(controller, /setVisualEvent/);
  assert.match(controller, /invalidPulseNonce/);
});
