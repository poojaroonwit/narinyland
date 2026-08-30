export type HexTerrainPBRSurface = 'grass' | 'soil' | 'path' | 'stone';

export type HexTerrainPBRStyle = {
  repeat: readonly [number, number];
  normalScale: number;
  roughness: number;
  albedoContrast: number;
  albedoSaturation: number;
};

const TERRAIN_PBR_STYLE: Record<HexTerrainPBRSurface, HexTerrainPBRStyle> = {
  grass: {
    repeat: [2.15, 2.15],
    normalScale: 0.52,
    roughness: 0.85,
    albedoContrast: 1.2,
    albedoSaturation: 1.1,
  },
  soil: {
    repeat: [1.45, 1.45],
    normalScale: 0.72,
    roughness: 0.88,
    albedoContrast: 1.36,
    albedoSaturation: 1.1,
  },
  path: {
    repeat: [1.25, 1.25],
    normalScale: 0.68,
    roughness: 0.9,
    albedoContrast: 1.3,
    albedoSaturation: 1.06,
  },
  stone: {
    repeat: [1.9, 1.9],
    normalScale: 0.66,
    roughness: 0.88,
    albedoContrast: 1.18,
    albedoSaturation: 1.03,
  },
};

export function getHexTerrainPBRStyle(surface: HexTerrainPBRSurface): HexTerrainPBRStyle {
  return TERRAIN_PBR_STYLE[surface];
}
