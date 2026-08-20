import { hexDistance, hexKey, hexNeighbors } from './hex-grid';
import type { HexBuildingDTO, HexCoord, HexTerrainType, HexTileDTO } from './types';

export type GeneratedHexWorld = {
  candidates: HexCoord[];
  tiles: HexTileDTO[];
  buildings: Array<Omit<HexBuildingDTO, 'id' | 'worldId'>>;
};

const STARTER_PATH = new Set(['-1:1', '-2:1', '2:-1', '3:-2']);
const STARTER_TREES = new Set(['-4:-1', '-4:0', '-4:1', '-5:0']);
const STARTER_ROCKS = new Set(['5:0', '5:-1', '4:1']);
const STARTER_FLOWERS = new Set(['-1:5', '0:5', '1:4']);

export function hashSeed(seed: string): number {
  let value = 2166136261;
  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededRatio(seed: string, key: string): number {
  const value = hashSeed(`${seed}:${key}`);
  return value / 0xffffffff;
}

export function generateStarterEnvelope(): HexCoord[] {
  const coords: HexCoord[] = [];
  for (let q = -10; q <= 9; q += 1) {
    for (let r = -10; r <= 9; r += 1) coords.push({ q, r });
  }
  return coords;
}

function terrainFor(seed: string, coord: HexCoord): { terrainType: HexTerrainType; height: number; metadata?: Record<string, unknown> } {
  const key = hexKey(coord);
  const distance = hexDistance({ q: 0, r: 0 }, coord);

  const pond = new Set(['4:-3', '5:-3', '4:-2']);
  if (pond.has(key)) return { terrainType: 'water', height: -0.22, metadata: { feature: 'pond' } };

  const garden = new Set(['-3:2', '-2:2', '-3:3', '-2:3']);
  if (garden.has(key)) return { terrainType: 'soil', height: 0.03, metadata: { feature: 'garden' } };

  if (STARTER_PATH.has(key)) return { terrainType: 'grass', height: 0.01, metadata: { feature: 'path' } };
  if (STARTER_TREES.has(key)) return { terrainType: 'grass', height: 0.04, metadata: { decor: 'tree', feature: 'tree_grove' } };
  if (STARTER_ROCKS.has(key)) return { terrainType: 'grass', height: 0.06, metadata: { decor: 'rock', feature: 'rock_cluster' } };
  if (STARTER_FLOWERS.has(key)) return { terrainType: 'grass', height: 0.02, metadata: { decor: 'flower', feature: 'flower_cluster' } };

  const noise = seededRatio(seed, key);
  if (distance >= 8 && noise > 0.68) return { terrainType: 'stone', height: 0.08 + noise * 0.12, metadata: { edgeAccent: true } };

  const height = Math.round((seededRatio(seed, `h:${key}`) * 0.24 - 0.04) * 100) / 100;
  const metadata: Record<string, unknown> = {};
  const decor = seededRatio(seed, `decor:${key}`);
  if (distance > 5 && decor > 0.9) metadata.decor = decor > 0.965 ? 'flower' : 'rock';
  if (qTreeGrove(coord) && decor > 0.68) metadata.decor = 'tree';
  return { terrainType: 'grass', height, ...(Object.keys(metadata).length ? { metadata } : {}) };
}

function qTreeGrove(coord: HexCoord): boolean {
  return coord.q <= -4 && coord.r <= 1 && coord.r >= -5;
}

export function generateStarterWorld(seed: string): GeneratedHexWorld {
  const candidates = generateStarterEnvelope();
  const allowed = new Set(candidates.map(hexKey));
  const targetCount = 280 + (hashSeed(seed) % 61);
  const selected = new Map<string, HexCoord>();
  const frontier = new Map<string, HexCoord>();
  const origin = { q: 0, r: 0 };
  selected.set(hexKey(origin), origin);

  const addFrontier = (coord: HexCoord) => {
    for (const neighbor of hexNeighbors(coord)) {
      const key = hexKey(neighbor);
      if (allowed.has(key) && !selected.has(key)) frontier.set(key, neighbor);
    }
  };
  addFrontier(origin);

  while (selected.size < targetCount && frontier.size > 0) {
    const ranked = [...frontier.values()].sort((a, b) => {
      const scoreA = hexDistance(origin, a) * 10 + seededRatio(seed, `shape:${hexKey(a)}`) * 9 + Math.abs(a.q + a.r) * 0.08;
      const scoreB = hexDistance(origin, b) * 10 + seededRatio(seed, `shape:${hexKey(b)}`) * 9 + Math.abs(b.q + b.r) * 0.08;
      return scoreA - scoreB || a.q - b.q || a.r - b.r;
    });
    const next = ranked[0];
    frontier.delete(hexKey(next));
    selected.set(hexKey(next), next);
    addFrontier(next);
  }

  const tiles = [...selected.values()]
    .sort((a, b) => a.q - b.q || a.r - b.r)
    .map((coord) => ({ ...coord, ...terrainFor(seed, coord), unlocked: true }));

  return {
    candidates,
    tiles,
    buildings: [
      { buildingKey: 'home', anchorQ: 0, anchorR: 0, rotation: 0, metadata: { starter: true } },
    ],
  };
}
