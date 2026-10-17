import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path: string) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('open-world mobile controls do not occupy the same bottom row', async () => {
  const [world, joystick] = await Promise.all([
    read('components/open-world/OpenWorldExperience.tsx'),
    read('components/hex-world/HexExploreTouchControls.tsx'),
  ]);
  assert.match(world, /enabled=\{!mapOpen\}/, 'map disables the movement joystick while it is open');
  assert.match(world, /bottom-\[calc\(0\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(joystick, /bottom-\[calc\(6\.15rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(world, /max-h-\[min\(57dvh/);
  assert.match(world, /overflow-y-auto overscroll-contain/);
  assert.doesNotMatch(world, /min-h-\[30rem\]/);
});

test('expansion, dialogue, and placement panels stay within the viewport', async () => {
  const [expansion, dialogue, placement] = await Promise.all([
    read('components/hex-world/HexExpansionController.tsx'),
    read('components/hex-world/HexResidentConversationCard.tsx'),
    read('components/hex-world/HexPlacementBar.tsx'),
  ]);
  assert.match(expansion, /max-h-\[min\(72dvh/);
  assert.match(expansion, /overflow-y-auto overscroll-contain/);
  assert.match(expansion, /sticky -top-3\.5/);
  assert.match(expansion, /grid-cols-2 gap-2 sm:grid-cols-3/);
  assert.match(dialogue, /max-h-\[min\(56dvh/);
  assert.match(dialogue, /overflow-y-auto overscroll-contain/);
  assert.match(placement, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(placement, /break-words/);
  assert.match(placement, /Tap or click a highlighted hex/);
});

test('mobile gameplay sheets replace secondary controls without hiding their own content', async () => {
  const css = await read('app/globals.css');
  assert.match(css, /--hex-sheet-bottom-mobile: calc\(6rem \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /body:has\(\[data-hex-gameplay-sheet\]\) \[data-hex-world-toolbar\]/);
  assert.match(css, /\[data-hex-gameplay-sheet\] \{[\s\S]*?bottom: var\(--hex-sheet-bottom-mobile\)/);
  assert.match(css, /body:has\(\[data-hex-expansion-panel\]\) \[data-hex-top-hud\]/);
  assert.doesNotMatch(css, /data-hex-overlay-state="details"\]\s*>\s*aside/);
});

test('explore movement help is accessible without covering touch controls', async () => {
  const hud = await read('components/hex-world/HexExploreHUD.tsx');
  assert.match(hud, /<p className="sr-only">Move with the joystick/);
  assert.doesNotMatch(hud, /pointer-events-none fixed bottom-\[calc\(10\.65rem/);
});
