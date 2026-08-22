import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('Family Farm store persists normalized Homestead Life v5 through the existing save key and transaction', async () => {
  const source = await readFile(new URL('../lib/family-farm-store.ts', import.meta.url), 'utf8');
  assert.match(source, /homestead-life-engine/);
  assert.match(source, /normalizeHomesteadLifeState/);
  assert.match(source, /performHomesteadLifeAction/);
  assert.match(source, /FARM_SAVE_ITEM_KEY = 'family-farm-state-v1'/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
});

test('existing Family Farm API route parses every Homestead Life v3 action family', async () => {
  const source = await readFile(new URL('../app/api/family-farm/route.ts', import.meta.url), 'utf8');
  assert.match(source, /PROGRESSION_CROP_KEYS/);
  assert.match(source, /WORKSHOP_UPGRADE_KEYS/);
  assert.match(source, /HOMESTEAD_CRAFT_KEYS/);
  assert.match(source, /case 'upgrade_building'/);
  assert.match(source, /case 'buy_cow'/);
  assert.match(source, /case 'feed_cow'/);
  assert.match(source, /case 'collect_milk'/);
  assert.match(source, /case 'buy_sheep'/);
  assert.match(source, /case 'care_sheep'/);
  assert.match(source, /case 'collect_wool'/);
  assert.match(source, /case 'choose_pet'/);
  assert.match(source, /case 'pet_time'/);
  assert.match(source, /case 'resolve_event'/);
  assert.match(source, /case 'craft_homestead_item'/);
  assert.doesNotMatch(source, /app\/api\/family-farm-v2/);
});

test('Living Homestead client uses Homestead Life state/actions without changing the legacy 2D farm client', async () => {
  const hook = await readFile(new URL('../components/hex-world/useLivingHomestead.ts', import.meta.url), 'utf8');
  const api = await readFile(new URL('../services/living-family-farm-api.ts', import.meta.url), 'utf8');
  const legacyApi = await readFile(new URL('../services/family-farm-api.ts', import.meta.url), 'utf8');
  assert.match(hook, /HomesteadLifeState/);
  assert.match(hook, /HomesteadLifeAction/);
  assert.match(api, /HomesteadLifeState/);
  assert.match(api, /HomesteadLifeAction/);
  assert.doesNotMatch(legacyApi, /homestead-life-engine/);
});
