import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  getExpansionPlacementTiles,
  validateExpansionPlacement,
} from '../lib/hex-world/expansions';
import type { HexTileDTO } from '../lib/hex-world/types';

function tile(q: number, r: number, expansionKey?: string, unlocked = true): HexTileDTO {
  return {
    q,
    r,
    terrainType: 'grass',
    height: 0,
    unlocked,
    metadata: expansionKey ? { expansionKey } : {},
  };
}

test('expansion placement shapes are translated discs with stable 7/19/37 sizes', () => {
  assert.equal(getExpansionPlacementTiles(1, { q: 10, r: -4 }).length, 7);
  assert.equal(getExpansionPlacementTiles(2, { q: 10, r: -4 }).length, 19);
  assert.equal(getExpansionPlacementTiles(3, { q: 10, r: -4 }).length, 37);
  assert.ok(getExpansionPlacementTiles(1, { q: 10, r: -4 }).some((coord) => coord.q === 10 && coord.r === -4));
});

test('free expansion placement must touch unlocked land and cannot overlap it', () => {
  const world = [tile(0, 0), tile(1, 0), tile(0, 1)];
  const touching = getExpansionPlacementTiles(1, { q: 3, r: 0 });
  const farAway = getExpansionPlacementTiles(1, { q: 20, r: 20 });
  const overlapping = getExpansionPlacementTiles(1, { q: 1, r: 0 });

  assert.equal(validateExpansionPlacement(touching, world).ok, true);
  assert.deepEqual(validateExpansionPlacement(farAway, world), { ok: false, code: 'expansion_disconnected' });
  assert.deepEqual(validateExpansionPlacement(overlapping, world), { ok: false, code: 'expansion_overlap' });
});

test('placement cannot overlap persisted locked starter-envelope coordinates', () => {
  const world = [tile(0, 0), tile(2, 0, undefined, false)];
  const candidate = getExpansionPlacementTiles(1, { q: 2, r: 0 });

  assert.deepEqual(validateExpansionPlacement(candidate, world), { ok: false, code: 'expansion_overlap' });
});

test('moving purchased land validates against the island with its own old cells removed', () => {
  const world = [
    tile(0, 0), tile(1, 0), tile(0, 1),
    ...getExpansionPlacementTiles(1, { q: 3, r: 0 }).map((coord) => tile(coord.q, coord.r, '1:0:0')),
  ];
  const candidate = getExpansionPlacementTiles(1, { q: -2, r: 1 });

  assert.equal(validateExpansionPlacement(candidate, world, { ignoreExpansionKey: '1:0:0' }).ok, true);
});

test('moving a bridge cluster cannot strand other unlocked land', () => {
  const world = [
    tile(0, 0),
    tile(1, 0, 'bridge'),
    tile(2, 0, 'downstream'),
  ];
  const candidate = getExpansionPlacementTiles(1, { q: -2, r: 0 });

  assert.deepEqual(
    validateExpansionPlacement(candidate, world, { ignoreExpansionKey: 'bridge' }),
    { ok: false, code: 'expansion_disconnects_island' },
  );
});

test('server expansion authority accepts exact placement and supports moving only purchased empty clusters', async () => {
  const service = await readFile(new URL('../lib/hex-world/service.ts', import.meta.url), 'utf8');
  const route = await readFile(new URL('../app/api/hex-world/expand/route.ts', import.meta.url), 'utf8');
  const api = await readFile(new URL('../services/hex-world-api.ts', import.meta.url), 'utf8');

  assert.match(service, /expandHexWorld\([\s\S]*anchorQ[\s\S]*anchorR/);
  assert.match(service, /moveHexExpansion/);
  assert.match(service, /expansion_has_buildings/);
  assert.match(service, /metadata\?\.expansionKey/);
  assert.match(route, /anchorQ/);
  assert.match(route, /anchorR/);
  assert.match(route, /export async function PATCH/);
  assert.match(api, /expand:\s*\(landId: string, expansionKey: string, anchor/);
  assert.match(api, /moveExpansion/);
});

test('Expand Land is a ghost placement flow and purchased land exposes Move Land', async () => {
  const builder = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  const controller = await readFile(new URL('../components/hex-world/HexExpansionController.tsx', import.meta.url), 'utf8');
  const world = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');

  assert.match(builder, /expansionPlacementPreview/);
  assert.match(builder, /onHoverTile/);
  assert.match(controller, /Choose where to place/);
  assert.match(controller, /Move Land/);
  assert.match(controller, /moveExpansion/);
  assert.match(world, /expansionPlacementPreview/);
  assert.match(world, /valid.*expansion/i);
});

test('game music is real Web Audio, gesture-gated, persistently mutable, and the HUD exposes mute', async () => {
  const audio = await readFile(new URL('../components/hex-world/useGardenMusic.ts', import.meta.url), 'utf8');
  const hud = await readFile(new URL('../components/hex-world/HexLivingHUD.tsx', import.meta.url), 'utf8');
  const builder = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');

  assert.match(audio, /narinyland:music-muted/);
  assert.match(audio, /AudioContext|webkitAudioContext/);
  assert.match(audio, /pointerdown/);
  assert.match(audio, /localStorage/);
  assert.match(audio, /muted/);
  assert.match(hud, /Music/);
  assert.match(hud, /musicMuted/);
  assert.match(builder, /useGardenMusic/);
});
