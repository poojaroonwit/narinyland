import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('living homestead hook uses the existing Family Farm API and guards Land switches', async () => {
  const source = await readFile(new URL('../components/hex-world/useLivingHomestead.ts', import.meta.url), 'utf8');

  assert.match(source, /familyFarmAPI\.get\(landId\)/);
  assert.match(source, /familyFarmAPI\.act\(landId, action\)/);
  assert.match(source, /activeLandRef/);
  assert.match(source, /requestNonceRef/);
  assert.match(source, /retry/);
  assert.match(source, /showToast/);
  assert.doesNotMatch(source, /fetch\(/);
});

test('living HUD shows the authoritative daily loop without becoming a full-screen dashboard', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingHUD.tsx', import.meta.url), 'utf8');

  assert.match(source, /formatFarmTime/);
  assert.match(source, /getDailyGoals/);
  assert.match(source, /xpToNextLevel/);
  assert.match(source, /Day \{state\.day\}/);
  assert.match(source, /Energy/);
  assert.match(source, /Coins/);
  assert.match(source, /Hearts/);
  assert.match(source, /Points/);
  assert.match(source, /Goals/);
  assert.match(source, /claim_daily_reward/);
  assert.doesNotMatch(source, /fixed inset-0.*bg-white/s);
});

test('living action panel maps real buildings to existing Family Farm actions', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingActionPanel.tsx', import.meta.url), 'utf8');

  for (const copy of ['Plant', 'Water', 'Harvest', 'Fish', 'Forage', 'Cook', 'Family Time', 'Care Chickens', 'Upgrade Home', 'Sleep', 'Inventory']) {
    assert.match(source, new RegExp(copy));
  }
  for (const action of ['plant', 'water', 'harvest', 'fish', 'forage', 'cook', 'family_time', 'feed_chickens', 'collect_eggs', 'buy_chicken', 'upgrade_home', 'end_day']) {
    assert.match(source, new RegExp(`type: '${action}'`));
  }
  assert.match(source, /CROP_CATALOG/);
  assert.match(source, /RECIPE_CATALOG/);
  assert.match(source, /canCookRecipe/);
  assert.match(source, /getGardenActionTarget/);
});

test('HexBuildController integrates Living Homestead without replacing builder controls', async () => {
  const source = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');

  assert.match(source, /useLivingHomestead/);
  assert.match(source, /HexLivingHUD/);
  assert.match(source, /HexLivingActionPanel/);
  assert.match(source, /livingState=\{living\.state\}/);
  assert.match(source, /HexWorldToolbar/);
  assert.match(source, /HexBuildingContextToolbar/);
  assert.match(source, /HexExpansionController/);
});

test('HexWorld living presentation is bounded visual-only state', async () => {
  const world = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  const layer = await readFile(new URL('../components/hex-world/HexLivingWorldLayer.tsx', import.meta.url), 'utf8');

  assert.match(world, /livingState\?: FamilyFarmState \| null/);
  assert.match(world, /HexLivingWorldLayer/);
  assert.match(layer, /getCropVisualSamples/);
  assert.match(layer, /Math\.min\(6, state\.livestock\.chickens\)/);
  assert.match(layer, /state\.weather === 'rainy'/);
  assert.match(layer, /useReducedHexMotion/);
  assert.doesNotMatch(layer, /familyFarmAPI/);
  assert.doesNotMatch(layer, /hexWorldAPI/);
  assert.doesNotMatch(layer, /fetch\(/);
});
