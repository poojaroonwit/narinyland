import * as THREE from 'three';
import { axialToWorld } from './hex-grid';
import type { HexRotation, HexTerrainType, HexTileDTO } from './types';

export const HEX_TILE_DEPTH = 0.72;

export const HEX_TERRAIN_COLORS: Record<HexTerrainType, string> = {
  grass: '#8fae6f',
  soil: '#b98b63',
  stone: '#a9a79d',
  water: '#71c9c2',
};

const INTERACTION_COLORS = {
  hovered: '#b9d8a0',
  selected: '#f8f6ea',
  valid: '#7fcf8e',
  invalid: '#df7770',
  expansion: '#e4b45d',
} as const;

function coordinateRatio(q: number, r: number): number {
  let hash = 2166136261;
  for (const value of [q, r]) {
    hash ^= value & 0xffffffff;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

export function getTerrainDisplayColor(input: {
  terrainType: HexTerrainType;
  q: number;
  r: number;
  state: 'normal' | 'hovered' | 'selected' | 'valid' | 'invalid' | 'expansion';
  materialVariation: 'full' | 'reduced';
}): string {
  if (input.state !== 'normal') return INTERACTION_COLORS[input.state];
  const base = new THREE.Color(HEX_TERRAIN_COLORS[input.terrainType]);
  if (input.terrainType === 'water') return `#${base.getHexString()}`;
  const maxVariation = input.terrainType === 'grass' ? 0.055 : input.terrainType === 'soil' ? 0.05 : 0.04;
  const strength = input.materialVariation === 'full' ? 1 : 0.55;
  const offset = (coordinateRatio(input.q, input.r) * 2 - 1) * maxVariation * strength;
  base.offsetHSL(0, 0, offset);
  return `#${base.getHexString()}`;
}

export function getHexTileTransform(tile: Pick<HexTileDTO, 'q' | 'r' | 'height'>) {
  return {
    position: axialToWorld({ q: tile.q, r: tile.r }, 1, tile.height),
    scale: { x: 0.98, y: 1, z: 0.98 },
  };
}

export function hexRotationToRadians(rotation: HexRotation): number {
  return rotation * (Math.PI / 3);
}
