import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getCameraRelativeMoveVector,
  getHexPlayerSpawn,
  resolveWalkablePlayerPosition,
} from '@/lib/hex-world/player-exploration';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import type { HexTileDTO } from '@/lib/hex-world/types';

const tile = (q: number, r: number, height = 0, unlocked = true): HexTileDTO => ({
  q,
  r,
  terrainType: 'grass',
  height,
  unlocked,
});

test('safe spawn prefers an unlocked home anchor', () => {
  const tiles = [tile(0, 0), tile(2, -1, 0.35)];
  const spawn = getHexPlayerSpawn({
    tiles,
    buildings: [{ buildingKey: 'home', anchorQ: 2, anchorR: -1 }],
  });
  const world = axialToWorld({ q: 2, r: -1 }, 1, 0.35 + 0.08);
  assert.deepEqual(spawn, { ...world, coord: { q: 2, r: -1 } });
});

test('safe spawn falls back to unlocked tile nearest island center', () => {
  const tiles = [tile(-5, 0), tile(0, 0, 0.1), tile(5, 0)];
  const spawn = getHexPlayerSpawn({ tiles, buildings: [] });
  assert.deepEqual(spawn.coord, { q: 0, r: 0 });
  assert.equal(spawn.y, 0.18);
});

test('safe spawn uses first unlocked tile when center selection has no candidate and origin when land is empty', () => {
  const locked = tile(0, 0, 0, false);
  const first = tile(4, -2, 0.2, true);
  assert.deepEqual(getHexPlayerSpawn({ tiles: [locked, first], buildings: [] }).coord, { q: 4, r: -2 });
  assert.deepEqual(getHexPlayerSpawn({ tiles: [locked], buildings: [] }), { x: 0, y: 0.08, z: 0, coord: { q: 0, r: 0 } });
});

test('camera-relative movement maps forward and right on the horizontal plane', () => {
  assert.deepEqual(getCameraRelativeMoveVector({ forward: 1, right: 0 }, { x: 0, z: -1 }), { x: 0, z: -1 });
  assert.deepEqual(getCameraRelativeMoveVector({ forward: 0, right: 1 }, { x: 0, z: -1 }), { x: 1, z: 0 });
});

test('camera-relative diagonal movement is normalized', () => {
  const movement = getCameraRelativeMoveVector({ forward: 1, right: 1 }, { x: 0, z: -1 });
  assert.ok(Math.abs(Math.hypot(movement.x, movement.z) - 1) < 1e-9);
  assert.ok(movement.x > 0);
  assert.ok(movement.z < 0);
});

test('walkable movement accepts unlocked tile positions and resolves their height', () => {
  const tiles = [tile(0, 0), tile(1, 0, 0.4)];
  const currentWorld = axialToWorld({ q: 0, r: 0 }, 1, 0.08);
  const current = { ...currentWorld, coord: { q: 0, r: 0 } };
  const target = axialToWorld({ q: 1, r: 0 });
  const next = resolveWalkablePlayerPosition({ current, proposed: { x: target.x, z: target.z }, tiles });
  assert.deepEqual(next.coord, { q: 1, r: 0 });
  assert.ok(Math.abs(next.y - 0.48) < 1e-9);
});

test('walkable movement rejects locked or missing tile positions', () => {
  const tiles = [tile(0, 0), tile(1, 0, 0, false)];
  const currentWorld = axialToWorld({ q: 0, r: 0 }, 1, 0.08);
  const current = { ...currentWorld, coord: { q: 0, r: 0 } };
  const locked = axialToWorld({ q: 1, r: 0 });
  const missing = axialToWorld({ q: 5, r: 5 });
  assert.deepEqual(resolveWalkablePlayerPosition({ current, proposed: { x: locked.x, z: locked.z }, tiles }), current);
  assert.deepEqual(resolveWalkablePlayerPosition({ current, proposed: { x: missing.x, z: missing.z }, tiles }), current);
});
