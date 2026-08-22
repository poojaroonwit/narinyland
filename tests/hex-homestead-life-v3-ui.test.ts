import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('living building roles expose Barn as a contextual homestead surface', async () => {
  const source = await readFile(new URL('../lib/hex-world/living-homestead.ts', import.meta.url), 'utf8');
  assert.match(source, /'barn'/);
  assert.match(source, /case 'barn': return 'barn'/);
});

test('context action panel exposes Homestead Life v3 animals tiers pets and compact crafting', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingActionPanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /HomesteadLifeState/);
  assert.match(source, /HomesteadLifeAction/);
  for (const copy of ['Barn', 'Tier', 'Cow', 'Sheep', 'Milk', 'Wool', 'Cat', 'Dog', 'Workshop Tier', 'Storage Tier', 'Home Tier']) {
    assert.match(source, new RegExp(copy));
  }
  for (const action of ['upgrade_building', 'buy_cow', 'feed_cow', 'collect_milk', 'buy_sheep', 'care_sheep', 'collect_wool', 'choose_pet', 'pet_time', 'craft_homestead_item']) {
    assert.match(source, new RegExp(`type: '${action}'`));
  }
  assert.match(source, /HOMESTEAD_CRAFT_CATALOG/);
  assert.doesNotMatch(source, /fixed inset-0.*Homestead Life/s);
});

test('living HUD presents unresolved homestead events without displacing persistent Music control', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingHUD.tsx', import.meta.url), 'utf8');

  assert.match(source, /HomesteadLifeState/);
  assert.match(source, /HomesteadLifeAction/);
  assert.match(source, /getHomesteadEventDefinition/);
  assert.match(source, /state\.events\.current/);
  assert.match(source, /type: 'resolve_event'/);
  assert.match(source, /Growing Together|Homestead moment|Family moment/);
  assert.match(source, /MusicButton/);
  assert.match(source, /🔇 Music/);
  assert.match(source, /🔊 Music/);
});
