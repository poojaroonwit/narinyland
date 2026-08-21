import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('Family Farm store persists normalized progression v4 through the existing save key and transaction', async () => {
  const source = await readFile(new URL('../lib/family-farm-store.ts', import.meta.url), 'utf8');
  assert.match(source, /family-farm-progression/);
  assert.match(source, /createInitialProgressionFarmState/);
  assert.match(source, /normalizeProgressionFarmState/);
  assert.match(source, /performProgressionFarmAction/);
  assert.match(source, /FARM_SAVE_ITEM_KEY = 'family-farm-state-v1'/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
});

test('existing Family Farm API route parses progression crops, Workshop craft, and Flower Patch tending', async () => {
  const source = await readFile(new URL('../app/api/family-farm/route.ts', import.meta.url), 'utf8');
  assert.match(source, /PROGRESSION_CROP_KEYS/);
  assert.match(source, /WORKSHOP_UPGRADE_KEYS/);
  assert.match(source, /case 'craft'/);
  assert.match(source, /upgradeKey/);
  assert.match(source, /case 'tend_flowers'/);
  assert.doesNotMatch(source, /app\/api\/family-farm-v2/);
});

test('Living Homestead client uses progression types without changing the legacy 2D farm client', async () => {
  const hook = await readFile(new URL('../components/hex-world/useLivingHomestead.ts', import.meta.url), 'utf8');
  const legacyApi = await readFile(new URL('../services/family-farm-api.ts', import.meta.url), 'utf8');
  assert.match(hook, /living-family-farm-api/);
  assert.match(hook, /ProgressionFamilyFarmState/);
  assert.match(hook, /ProgressionFarmAction/);
  assert.doesNotMatch(legacyApi, /family-farm-progression/);
});
