import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('cozy style system centralizes warm colors and keyboard focus states', async () => {
  const css = await source('app/globals.css');
  for (const token of [
    '--cozy-paper', '--cozy-ink', '--cozy-border', '--cozy-sage',
    '.cozy-float', '.cozy-nav', '.cozy-nav-item', '.cozy-quest',
    '.cozy-button-primary', '.cozy-field', ':focus-visible',
  ]) assert.ok(css.includes(token), token);
  assert.match(css, /prefers-reduced-motion/);
});

test('the cozy dock preserves safe areas, active state, and all existing game destinations', async () => {
  const garden = await source('app/garden/_components/GardenAcceptedContent.tsx');
  assert.match(garden, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(garden, /safe-area-inset-bottom/);
  assert.match(garden, /cozy-nav/);
  assert.match(garden, /aria-current=/);
  for (const label of ['Home', 'Adventures', 'Timeline', 'Coupons', 'Letters'])
    assert.ok(garden.includes('>' + label + '</span>'), label);
});

test('couple adventures remain private and actions stay wired after the visual refresh', async () => {
  const adventures = await source('components/couple-world/CoupleWorldAdventure.tsx');
  assert.match(adventures, /cozy-journal/);
  assert.match(adventures, /cozy-quest/);
  assert.match(adventures, /requestWorld\(activeCircleId/);
  assert.match(adventures, /void submit\(quest\.key\)/);
  assert.match(adventures, /quest\.revealed/);
  assert.match(adventures, /narinyland:couple-stories-updated/);
  assert.match(adventures, /maxLength=\{240\}/);
});

test('world controls and landing retain gameplay and mobility interactions', async () => {
  const [toolbar, explore, landing, menu] = await Promise.all([
    source('components/hex-world/HexWorldToolbar.tsx'),
    source('components/hex-world/HexExploreHUD.tsx'),
    source('components/landing/LandingWorldExperience.tsx'),
    source('app/garden/_components/GardenTopControls.tsx'),
  ]);
  assert.match(toolbar, /cozy-nav/);
  assert.match(explore, /HexExploreTouchControls/);
  assert.match(explore, /movementInputRef/);
  assert.match(landing, /HexWorld3D/);
  assert.match(landing, /onClick=\{enterWorld\}/);
  assert.match(menu, /handleCreateWorld/);
  assert.match(menu, /handleCreateLand/);
  assert.match(menu, /activeTab === 'home'/);
});
