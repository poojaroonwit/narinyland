import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('living HUD keeps the persistent layer compact and moves secondary stats behind utilities', async () => {
  const hud = await source('components/hex-world/HexLivingHUD.tsx');
  for (const copy of ['Energy', 'Coins', 'Wallet', 'Goals']) assert.match(hud, new RegExp(copy));
  assert.match(hud, /aria-label=\{musicMuted \? 'Unmute music' : 'Mute music'\}/i);
  assert.match(hud, /panel.*wallet|wallet.*panel/s);
  assert.match(hud, /Homestead Journey/);
  assert.match(hud, /claim_daily_reward/);
  assert.doesNotMatch(hud, /w-\[min\(96vw,860px\)\]/);
});

test('gameplay toolbar prioritizes Farm Build Bag and Goals while reset is a utility action', async () => {
  const toolbar = await source('components/hex-world/HexWorldToolbar.tsx');
  for (const label of ['Farm', 'Build', 'Bag', 'Goals']) assert.match(toolbar, new RegExp(`>${label}<|${label}`));
  assert.match(toolbar, /aria-label="Reset view"/i);
  assert.match(toolbar, /safe-area-inset-bottom/);
  assert.doesNotMatch(toolbar, />[^<]*Reset View[^<]*</);
});

test('controller keeps primary gameplay navigation stable and coordinates mutually exclusive sheets', async () => {
  const controller = await source('components/hex-world/HexBuildController.tsx');
  assert.match(controller, /HexInventorySheet/);
  assert.match(controller, /HexQuickActionPanel/);
  assert.match(controller, /handleFarm/);
  assert.match(controller, /hudPanel/);
  assert.match(controller, /inventoryOpen/);
  assert.match(controller, /onFarm=/);
  assert.match(controller, /onBag=/);
  assert.match(controller, /onGoals=/);
  assert.match(controller, /buildingKey === 'garden_patch'/);
});

test('bag uses the existing homestead inventory without introducing a new economy', async () => {
  const bag = await source('components/hex-world/HexInventorySheet.tsx');
  assert.match(bag, /HomesteadLifeState/);
  assert.match(bag, /inventory\.seeds/);
  assert.match(bag, /inventory\.produce/);
  assert.match(bag, /inventory\.resources/);
  assert.match(bag, /PROGRESSION_CROP_CATALOG/);
  assert.match(bag, /RESOURCE_CATALOG/);
});

test('living building actions use a quick layer before the existing full details layer', async () => {
  const quick = await source('components/hex-world/HexQuickActionPanel.tsx');
  assert.match(quick, />More</);
  for (const label of ['Plant', 'Water', 'Harvest', 'Fish', 'Forage', 'Family Time']) assert.match(quick, new RegExp(label));
  assert.match(quick, /max-w-\[|w-\[min/);
  const controller = await source('components/hex-world/HexBuildController.tsx');
  assert.match(controller, /detailsOpen/);
  assert.match(controller, /HexLivingActionPanel/);
});

test('build and expansion surfaces use purpose-led cozy-game presentation', async () => {
  const catalog = await source('components/hex-world/HexBuildCatalog.tsx');
  const expansion = await source('components/hex-world/HexExpansionController.tsx');
  assert.match(catalog, /BUILDING_PURPOSES/);
  assert.match(catalog, /Grow crops/);
  assert.match(catalog, /Craft and improve/);
  for (const name of ['Small Grove', 'Garden Wing', 'Homestead Field']) assert.match(expansion, new RegExp(name));
  assert.match(expansion, /Grow your island|Grow the homestead/);
});
