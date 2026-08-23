import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('HexWorld projects Homestead Life v3 state into the visual-only living layer', async () => {
  const world = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  const layer = await readFile(new URL('../components/hex-world/HexLivingWorldLayer.tsx', import.meta.url), 'utf8');

  assert.match(world, /HomesteadLifeState/);
  assert.match(world, /livingState\?: HomesteadLifeState \| null/);
  assert.match(layer, /HomesteadLifeState/);
  assert.match(layer, /FamilyMemberVisual/);
  assert.match(layer, /state\.family\.stage/);
  assert.match(layer, /partner-1|partner1/);
  assert.match(layer, /partner-2|partner2/);
  assert.match(layer, /child/);
  assert.match(layer, /CowVisual/);
  assert.match(layer, /state\.animals\.cow\.owned/);
  assert.match(layer, /SheepVisual/);
  assert.match(layer, /state\.animals\.sheep\.owned/);
  assert.match(layer, /PetVisual/);
  assert.match(layer, /state\.animals\.pet\.kind/);
  assert.match(layer, /BuildingTierAccents/);
  assert.match(layer, /state\.buildingTiers/);
  assert.match(layer, /reducedMotion/);
  assert.doesNotMatch(layer, /fetch\(/);
  assert.doesNotMatch(layer, /familyFarmAPI|livingFamilyFarmAPI|hexWorldAPI/);
  assert.doesNotMatch(layer, /keydown|\bKeyW\b|\bKeyA\b|\bKeyS\b|\bKeyD\b|navmesh/i);
});

test('Homestead presence routes are deterministic bounded and use building anchors instead of persisted NPC positions', async () => {
  const source = await readFile(new URL('../lib/hex-world/homestead-presence.ts', import.meta.url), 'utf8');
  assert.match(source, /getHomesteadPresencePosition/);
  assert.match(source, /home/);
  assert.match(source, /garden/);
  assert.match(source, /pond/);
  assert.match(source, /workshop/);
  assert.match(source, /bench/);
  assert.match(source, /barn/);
  assert.match(source, /reducedMotion/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /localStorage|fetch\(|Prisma/);
});

test('Barn has a local structure model and no remote model dependency', async () => {
  const dispatcher = await readFile(new URL('../components/hex-world/HexBuildingModels.tsx', import.meta.url), 'utf8');
  const structures = await readFile(new URL('../components/hex-world/models/HexStructureModels.tsx', import.meta.url), 'utf8');
  assert.match(dispatcher, /buildingKey === 'barn'/);
  assert.match(structures, /case 'barn'/);
  assert.doesNotMatch(structures, /https?:\/\//);
});
