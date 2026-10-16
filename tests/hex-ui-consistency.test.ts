import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Narinyland uses one common system font stack without remote decorative font loading', async () => {
  const [globals, layout, tailwind] = await Promise.all([
    read('app/globals.css'),
    read('app/layout.tsx'),
    read('tailwind.config.ts'),
  ]);

  assert.doesNotMatch(globals, /fonts\.googleapis\.com|Pacifico|Instrument Serif|DM Sans|Prompt/);
  assert.match(globals, /system-ui/);
  assert.match(globals, /-apple-system/);
  assert.match(globals, /BlinkMacSystemFont/);
  assert.match(globals, /Segoe UI/);
  assert.doesNotMatch(layout, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(tailwind, /Pacifico|Instrument Serif|DM Sans|Prompt/);
  assert.match(tailwind, /system-ui/);
});

test('HexWorld overlays expose coordinated collision states instead of independent fixed layers', async () => {
  const [globals, overlay, hud, editToolbar, undo] = await Promise.all([
    read('app/globals.css'),
    read('components/hex-world/HexGameplayOverlay.tsx'),
    read('components/hex-world/HexLivingHUD.tsx'),
    read('components/hex-world/HexBuildingContextToolbar.tsx'),
    read('components/hex-world/HexUndoToast.tsx'),
  ]);

  assert.match(overlay, /data-hex-overlay-state/);
  assert.match(hud, /data-hex-hud-panel/);
  assert.match(hud, /data-hex-hud-notice-stack/);
  assert.match(editToolbar, /data-hex-edit-toolbar/);
  assert.match(undo, /data-hex-undo-toast/);
  assert.match(globals, /body:has\(\[data-hex-hud-panel\]\).*data-hex-edit-toolbar/s);
  assert.match(globals, /data-hex-overlay-state="hud".*data-hex-undo-toast/s);
  assert.match(globals, /data-hex-overlay-state="details".*100dvh/s);
});

test('bottom navigation and gameplay controls stay inside narrow safe-area viewports', async () => {
  const [toolbar, garden] = await Promise.all([
    read('components/hex-world/HexWorldToolbar.tsx'),
    read('app/garden/_components/GardenAcceptedContent.tsx'),
  ]);

  assert.match(toolbar, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(toolbar, /min-w-\[56px\]/);
  assert.match(toolbar, /sm:min-w-\[68px\]/);
  assert.match(garden, /safe-area-inset-bottom/);
  assert.match(garden, /max-w-\[calc\(100vw-1rem\)\]/);
});

test('small-screen gameplay overlays share a reserved region and do not cover controls', async () => {
  const [globals, catalog, inventory, quick, details, explore, toolbar, hud] = await Promise.all([
    read('app/globals.css'),
    read('components/hex-world/HexBuildCatalog.tsx'),
    read('components/hex-world/HexInventorySheet.tsx'),
    read('components/hex-world/HexQuickActionPanel.tsx'),
    read('components/hex-world/HexLivingActionPanel.tsx'),
    read('components/hex-world/HexExploreHUD.tsx'),
    read('components/hex-world/HexWorldToolbar.tsx'),
    read('components/hex-world/HexLivingHUD.tsx'),
  ]);
  for (const sheet of [catalog, inventory, quick, details]) assert.match(sheet, /data-hex-gameplay-sheet/);
  assert.match(globals, /--hex-sheet-bottom: calc\(12\.75rem \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(globals, /\[data-hex-gameplay-sheet\][\s\S]*?max-height: min\(54dvh/);
  assert.match(globals, /max-width: 639px/);
  assert.match(globals, /data-hex-explore-status/);
  assert.match(globals, /data-hex-hud-notice-stack/);
  assert.match(explore, /data-hex-explore-actions/);
  assert.match(explore, /aria-expanded=\{mobileMoreOpen\}/);
  assert.match(explore, /sm:hidden/);
  assert.match(toolbar, /data-hex-world-toolbar/);
  assert.match(hud, /data-hex-top-hud/);
  assert.match(hud, /sm:grid-cols-/);
});
