import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('world HUD centers authoritative family identity instead of feeling like a utility dashboard', async () => {
  const hud = await source('components/hex-world/HexLivingHUD.tsx');

  assert.match(hud, /'family'/);
  assert.match(hud, /data-hex-family-strip/);
  assert.match(hud, /state\.family\.stage/);
  assert.match(hud, /state\.animals\.pet\.kind/);
  assert.match(hud, /state\.hearts/);
  assert.match(hud, /Family/);
  assert.doesNotMatch(hud, /Hunger|Hygiene|Fun meter|Social meter/i);
});

test('family panel projects existing Homestead Life state and never invents life-sim needs', async () => {
  const panel = await source('components/hex-world/HexFamilyPanel.tsx');

  assert.match(panel, /HomesteadLifeState/);
  assert.match(panel, /state\.hearts/);
  assert.match(panel, /state\.family\.stage/);
  assert.match(panel, /state\.family\.milestones\.growingTogether/);
  assert.match(panel, /state\.buildingTiers\.home/);
  assert.match(panel, /state\.animals\.pet\.kind/);
  assert.match(panel, /state\.daily\.familyTime/);
  assert.match(panel, /type: 'family_time'/);
  assert.match(panel, /state\.family\.stage === 'child'/);
  assert.match(panel, /data-hex-family-panel/);
  assert.doesNotMatch(panel, /familyName/);
  assert.doesNotMatch(panel, /Hunger|Hygiene|Fun meter|Social meter/i);
});

test('world action dock makes Family a primary game action while preserving farm build bag goals', async () => {
  const toolbar = await source('components/hex-world/HexWorldToolbar.tsx');

  assert.match(toolbar, /'family'/);
  assert.match(toolbar, /onFamily/);
  assert.match(toolbar, />Family</);
  for (const label of ['Farm', 'Build', 'Bag', 'Goals']) assert.match(toolbar, new RegExp(`>${label}<|${label}`));
  assert.ok(toolbar.indexOf('Family') < toolbar.indexOf('Farm'), 'Family should lead the life-sim action dock');
  assert.match(toolbar, /safe-area-inset-bottom/);
  assert.match(toolbar, /World/);
  assert.match(toolbar, /Explore/);
});

test('gameplay overlay owns family panel exclusivity and movement blocking', async () => {
  const overlay = await source('components/hex-world/HexGameplayOverlay.tsx');

  assert.match(overlay, /HexFamilyPanel/);
  assert.match(overlay, /toggleFamily/);
  assert.match(overlay, /current === 'family' \? null : 'family'/);
  assert.match(overlay, /onFamily=\{toggleFamily\}/);
  assert.match(overlay, /hudPanel === 'family'/);
  assert.match(overlay, /ZERO_HEX_EXPLORE_MOVEMENT/);
  assert.match(overlay, /inventoryOpen/);
  assert.match(overlay, /detailsOpen/);
});
