import { axialToWorld, hexKey, hexNeighbors } from './hex-grid';
import type { HexTerrainType, HexTileDTO } from './types';
import { getTerrainPresentation } from './visual-theme';

export type NaturalTerrainBoundaryEdge = {
  tileKey: string;
  start: [number, number, number];
  end: [number, number, number];
  outward: [number, number];
  terrainType: HexTerrainType;
};

export type NaturalTerrainMeshData = {
  positions: number[];
  indices: number[];
  colors: number[];
  boundaryEdges: NaturalTerrainBoundaryEdge[];
  tileCenters: Record<string, [number, number, number]>;
};

type CornerSample = {
  x: number;
  z: number;
  heights: number[];
};

const CORNER_EDGE_BY_NEIGHBOR = [
  [0, 1],
  [5, 0],
  [4, 5],
  [3, 4],
  [2, 3],
  [1, 2],
] as const;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicRatio(key: string): number {
  return stableHash(key) / 0xffffffff;
}

function quantizedXZKey(x: number, z: number): string {
  return `${Math.round(x * 100000)}:${Math.round(z * 100000)}`;
}

function hexCornerXZ(centerX: number, centerZ: number, corner: number): [number, number] {
  const angle = (Math.PI / 180) * (60 * corner - 30);
  return [centerX + Math.cos(angle), centerZ + Math.sin(angle)];
}

function resolveCornerHeight(sample: CornerSample, seed: string, key: string): number {
  const mean = sample.heights.reduce((sum, value) => sum + value, 0) / Math.max(1, sample.heights.length);
  const microVariation = (deterministicRatio(`${seed}:terrain-corner:${key}`) * 2 - 1) * 0.018;
  return mean + microVariation;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((part) => `${part}${part}`).join('')
    : normalized, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function terrainColor(terrainType: HexTerrainType, seed: string, tileKey: string): [number, number, number] {
  const base = hexToRgb(getTerrainPresentation(terrainType).base);
  const variation = (deterministicRatio(`${seed}:terrain-color:${tileKey}`) * 2 - 1) * 0.035;
  return base.map((component) => Math.max(0, Math.min(1, component + variation))) as [number, number, number];
}

export function buildNaturalTerrainMesh(tiles: HexTileDTO[], seed: string): NaturalTerrainMeshData {
  const unlocked = tiles.filter((tile) => tile.unlocked);
  const unlockedKeys = new Set(unlocked.map((tile) => hexKey(tile)));
  const cornerSamples = new Map<string, CornerSample>();

  for (const tile of unlocked) {
    const center = axialToWorld(tile, 1, tile.height);
    for (let corner = 0; corner < 6; corner += 1) {
      const [x, z] = hexCornerXZ(center.x, center.z, corner);
      const key = quantizedXZKey(x, z);
      const existing = cornerSamples.get(key);
      if (existing) existing.heights.push(tile.height);
      else cornerSamples.set(key, { x, z, heights: [tile.height] });
    }
  }

  const cornerHeights = new Map<string, number>();
  for (const [key, sample] of cornerSamples) {
    cornerHeights.set(key, resolveCornerHeight(sample, seed, key));
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const boundaryEdges: NaturalTerrainBoundaryEdge[] = [];
  const tileCenters: Record<string, [number, number, number]> = {};

  for (const tile of unlocked) {
    const tileKey = hexKey(tile);
    const center = axialToWorld(tile, 1, tile.height);
    tileCenters[tileKey] = [center.x, tile.height, center.z];
    const color = terrainColor(tile.terrainType, seed, tileKey);
    const baseIndex = positions.length / 3;

    positions.push(center.x, tile.height, center.z);
    colors.push(...color);

    const corners: Array<[number, number, number]> = [];
    for (let corner = 0; corner < 6; corner += 1) {
      const [x, z] = hexCornerXZ(center.x, center.z, corner);
      const key = quantizedXZKey(x, z);
      const y = cornerHeights.get(key) ?? tile.height;
      const position: [number, number, number] = [x, y, z];
      corners.push(position);
      positions.push(...position);
      colors.push(...color);
    }

    for (let corner = 0; corner < 6; corner += 1) {
      const current = baseIndex + 1 + corner;
      const next = baseIndex + 1 + ((corner + 1) % 6);
      indices.push(baseIndex, current, next);
    }

    const neighbors = hexNeighbors(tile);
    for (let direction = 0; direction < 6; direction += 1) {
      if (unlockedKeys.has(hexKey(neighbors[direction]))) continue;
      const [startCorner, endCorner] = CORNER_EDGE_BY_NEIGHBOR[direction];
      const start = corners[startCorner];
      const end = corners[endCorner];
      const midpointX = (start[0] + end[0]) * 0.5;
      const midpointZ = (start[2] + end[2]) * 0.5;
      const dx = midpointX - center.x;
      const dz = midpointZ - center.z;
      const length = Math.hypot(dx, dz) || 1;
      boundaryEdges.push({
        tileKey,
        start: [...start],
        end: [...end],
        outward: [dx / length, dz / length],
        terrainType: tile.terrainType,
      });
    }
  }

  return { positions, indices, colors, boundaryEdges, tileCenters };
}
