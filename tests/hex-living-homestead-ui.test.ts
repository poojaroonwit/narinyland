import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('living homestead hook uses Homestead Life typed Family Farm API and guards Land switches', async () => {
  const source = await readFile(new URL('../components/hex-world/useLivingHomestead.ts', import.meta.url), 'utf8');

  assert.match(source, /livingFamilyFarmAPI\.get\(landId\)/);
  assert.match(source, /livingFamilyFarmAPI\.act\(landId, action\)/);
  assert.match(source, /HomesteadLifeState/);
  assert.match(source, /HomesteadLifeAction/);
  assert.match(source, /activeLandRef/);
  assert.match(source, /requestNonceRef/);
  assert.match(source, /actionLockRef/);
  assert.match(source, /actionLockRef\.current\s*=\s*true/);
  assert.match(source, /actionLockRef\.current\s*=\s*false/);
  assert.match(source, /retry/);
  assert.match(source, /showToast/);
  assert.doesNotMatch(source, /fetch\(/);
});

test('living HUD exposes season progression Journey and end-of-season payoff without becoming a dashboard', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingHUD.tsx', import.meta.url), 'utf8');

  assert.match(source, /formatFarmTime/);
  assert.match(source, /getProgressionDailyGoals/);
  assert.match(source, /getNextLevelUnlock/);
  assert.match(source, /getHomesteadJourney/);
  assert.match(source, /getSeasonPresentation/);
  assert.match(source, /xpToNextLevel/);
  assert.match(source, /Day \{state\.day\}/);
  assert.match(source, /Energy/);
  assert.match(source, /Coins/);
  assert.match(source, /Hearts/);
  assert.match(source, /Points/);
  assert.match(source, /Goals/);
  assert.match(source, /Homestead Journey/);
  assert.match(source, /Next unlock/);
  assert.match(source, /Season complete/);
  assert.match(source, /setDismissedSeasonDay/);
  assert.match(source, /claim_daily_reward/);
  assert.doesNotMatch(source, /fixed inset-0.*bg-white/s);
});

test('living action panel maps buildings to progression actions and market utility', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingActionPanel.tsx', import.meta.url), 'utf8');

  for (const copy of ['Plant', 'Water', 'Harvest', 'Fish', 'Forage', 'Cook', 'Family Time', 'Care Chickens', 'Sleep', 'Inventory', 'Workshop', 'Craft', 'Tend Flowers', 'Buy seed', 'Sell all']) {
    assert.match(source, new RegExp(copy));
  }
  assert.match(source, /<TierCard label="Home"/);
  assert.match(source, /Upgrade \{label\}/);
  for (const action of ['plant', 'water', 'harvest', 'buy_seed', 'sell', 'sell_resource', 'fish', 'forage', 'cook', 'family_time', 'feed_chickens', 'collect_eggs', 'buy_chicken', 'upgrade_building', 'end_day', 'craft', 'tend_flowers']) {
    assert.match(source, new RegExp(`type: '${action}'`));
  }
  for (const crop of ['corn', 'pumpkin', 'potato', 'cabbage']) assert.match(source, new RegExp(crop));
  assert.match(source, /PROGRESSION_CROP_CATALOG/);
  assert.match(source, /PROGRESSION_CROP_KEYS/);
  assert.match(source, /WORKSHOP_UPGRADES/);
  assert.match(source, /canCookProgressionRecipe/);
  assert.match(source, /getCropAvailabilityCopy/);
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

test('HexWorld living presentation covers four seasons and remains bounded visual-only state', async () => {
  const world = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  const layer = await readFile(new URL('../components/hex-world/HexLivingWorldLayer.tsx', import.meta.url), 'utf8');

  assert.match(world, /livingState\?: HomesteadLifeState \| null/);
  assert.match(world, /HexLivingWorldLayer/);
  assert.match(layer, /HomesteadLifeState/);
  assert.match(layer, /getCropVisualSamples/);
  assert.match(layer, /SEASON_PARTICLE_COUNT/);
  for (const season of ['spring', 'summer', 'autumn', 'winter']) assert.match(layer, new RegExp(`'${season}'`));
  for (const crop of ['corn', 'pumpkin', 'potato', 'cabbage']) assert.match(layer, new RegExp(`${crop}:`));
  assert.match(layer, /Math\.min\(6, state\.livestock\.chickens\)/);
  assert.match(layer, /state\.weather === 'rainy'/);
  assert.match(layer, /reducedMotion/);
  assert.doesNotMatch(layer, /familyFarmAPI/);
  assert.doesNotMatch(layer, /hexWorldAPI/);
  assert.doesNotMatch(layer, /fetch\(/);
});
