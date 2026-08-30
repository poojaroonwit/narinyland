export type HexTerrainPBRSurface = 'grass' | 'soil' | 'path' | 'stone';

export type HexTerrainPBRStyle = {
  repeat: readonly [number, number];
  normalScale: number;
  roughness: number;
};

const TERRAIN_PBR_STYLE: Record<HexTerrainPBRSurface, HexTerrainPBRStyle> = {
  grass: {
    repeat: [2.15, 2.15],
    normalScale: 0.48,
    roughness: 0.9,
  },
  soil: {
    repeat: [1.45, 1.45],
    normalScale: 0.66,
    roughness: 0.94,
  },
  path: {
    repeat: [1.25, 1.25],
    normalScale: 0.62,
    roughness: 0.95,
  },
  stone: {
    repeat: [1.9, 1.9],
    normalScale: 0.62,
    roughness: 0.94,
  },
};

export function getHexTerrainPBRStyle(surface: HexTerrainPBRSurface): HexTerrainPBRStyle {
  return TERRAIN_PBR_STYLE[surface];
}
