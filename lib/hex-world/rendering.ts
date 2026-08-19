import { axialToWorld } from './hex-grid';
import type { HexRotation, HexTerrainType, HexTileDTO } from './types';

export const HEX_TILE_DEPTH = 0.72;

export const HEX_TERRAIN_COLORS: Record<HexTerrainType, string> = {
  grass: '#8fae6f',
  soil: '#b98b63',
  stone: '#a9a79d',
  water: '#71c9c2',
};

export function getHexTileTransform(tile: Pick<HexTileDTO, 'q' | 'r' | 'height'>) {
  return {
    position: axialToWorld({ q: tile.q, r: tile.r }, 1, tile.height),
    scale: { x: 0.98, y: 1, z: 0.98 },
  };
}

export function hexRotationToRadians(rotation: HexRotation): number {
  return rotation * (Math.PI / 3);
}
