import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import * as setDressing from '@/lib/hex-world/set-dressing';

const tiles: HexTileDTO[] = [];
for (let q = -3; q <= 3; q += 1) {
  for (let r = -3; r <= 3; r += 1) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) > 3) continue;
    tiles.push({
      q,
      r,
      height: 0,
      unlocked: true,
      terrainType: q === 2 && r === -1 ? 'water' : q === 0 && r === 1 ? 'soil' : 'grass',
      metadata: q === 1 && r === 0 ? { feature: 'path' } : undefined,
    });
  }
}

const buildings: HexBuildingDTO[] = [
  {
    id: 'home-1',
    worldId: 'world-1',
    buildingKey: 'home',
    anchorQ: 0,
    anchorR: 0,
    rotation: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

test('set dressing is deterministic and creates multiple authored pocket types', () => {
  const build = (setDressing as typeof setDressing & {
    buildHexWorldSetDressing?: typeof setDressing.buildHexWorldSetDressing;
  }).buildHexWorldSetDressing;
  assert.equal(typeof build, 'function');
  if (!build) return;

  const profile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1600 });
  const first = build({ tiles, buildings, seed: 'narinyland-richness', profile, presentation: 'person' });
  const second = build({ tiles, buildings, seed: 'narinyland-richness', profile, presentation: 'person' });
  assert.deepEqual(first, second);
  assert.ok(first.length > 0);

  const kinds = new Set(first.map((item) => item.kind));
  assert.ok(kinds.size >= 4, 'the world should include several recognizable set-dressing motifs');
  assert.ok(first.some((item) => item.zone === 'homestead'), 'home surroundings should receive authored dressing');
  assert.ok(first.some((item) => item.zone === 'wild'), 'open land should receive natural dressing');
});

test('set dressing protects gameplay footprints and path tiles', () => {
  const profile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1600 });
  const result = setDressing.buildHexWorldSetDressing({
    tiles,
    buildings,
    seed: 'protected-space',
    profile,
    presentation: 'person',
  });

  assert.equal(result.some((item) => item.tileKey === '0:0'), false, 'building footprint must stay clear');
  assert.equal(result.some((item) => item.tileKey === '1:0'), false, 'path tiles must stay clear');
  assert.equal(result.some((item) => item.tileKey === '2:-1'), false, 'water tiles must not receive dry-land props');
});

test('person presentation is richer than overview while both stay quality bounded', () => {
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1600 });
  const mobile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 390 });
  const person = setDressing.buildHexWorldSetDressing({ tiles, buildings, seed: 'density', profile: high, presentation: 'person' });
  const world = setDressing.buildHexWorldSetDressing({ tiles, buildings, seed: 'density', profile: high, presentation: 'world' });
  const mobilePerson = setDressing.buildHexWorldSetDressing({ tiles, buildings, seed: 'density', profile: mobile, presentation: 'person' });

  assert.ok(person.length > world.length);
  assert.ok(mobilePerson.length < person.length);
  assert.ok(person.length <= 72);
  assert.ok(world.length <= 40);
  assert.ok(mobilePerson.length <= 24);
});
