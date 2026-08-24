import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

test('explore HUD uses real homestead progression and utility actions only', async () => {
  const hud = await source('components/hex-world/HexExploreHUD.tsx');
  for (const token of ['state.level', 'state.xp', 'state.energy', 'state.maxEnergy', 'state.coins', 'state.hearts', 'points']) {
    assert.match(hud, new RegExp(token.replace('.', '\\.')));
  }
  for (const label of ['Bag', 'Goals', 'World']) assert.match(hud, new RegExp(label));
  assert.match(hud, /safe-area-inset-bottom/);
  assert.doesNotMatch(hud, /\bHP\b|\bMP\b|spell|combat skill|attack/i);
});

test('gameplay overlay uses dedicated explore HUD in person mode and preserves world HUD', async () => {
  const overlay = await source('components/hex-world/HexGameplayOverlay.tsx');
  assert.match(overlay, /HexExploreHUD/);
  assert.match(overlay, /viewMode === 'person'/);
  assert.match(overlay, /HexLivingHUD/);
  assert.match(overlay, /HexWorldToolbar/);
  assert.match(overlay, /HexInventorySheet/);
});
