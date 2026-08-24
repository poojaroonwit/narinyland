import { axialToWorld } from './hex-grid';
import type { HexQualityProfile } from './quality';
import type { HexTerrainType, HexTileDTO } from './types';
import { deterministicVisualRatio } from './visual-theme';

export type ExploreDecorationKind = 'turf' | 'flower' | 'shrub' | 'rock' | 'path' | 'reed';

export type ExploreDecorationSample = {
  kind: ExploreDecorationKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  tone: number;
};

function offsetFor(seed: string, tile: HexTileDTO, salt: string, radius: number) {
  const angle = deterministicVisualRatio(seed, tile.q, tile.r, `${salt}:angle`) * Math.PI * 2;
  const distance = (0.16 + deterministicVisualRatio(seed, tile.q, tile.r, `${salt}:radius`) * 0.84) * radius;
  return {
    x: Math.cos(angle) * distance,
    z: Math.sin(angle) * distance,
  };
}

function groundKind(terrain: HexTerrainType): ExploreDecorationKind | null {
  if (terrain === 'grass') return 'turf';
  if (terrain === 'soil' || terrain === 'stone') return 'path';
  return null;
}

function decorKind(seed: string, tile: HexTileDTO, index: number): ExploreDecorationKind {
  if (tile.terrainType === 'water') return 'reed';
  const ratio = deterministicVisualRatio(seed, tile.q, tile.r, `decor:${index}:kind`);
  if (tile.terrainType === 'stone') return ratio > 0.56 ? 'shrub' : 'rock';
  if (tile.terrainType === 'soil') return ratio > 0.78 ? 'flower' : ratio > 0.44 ? 'shrub' : 'rock';
  return ratio > 0.68 ? 'flower' : ratio > 0.28 ? 'shrub' : 'rock';
}

function makeSample(input: {
  seed: string;
  tile: HexTileDTO;
  index: number;
  salt: 'ground' | 'decor';
  kind: ExploreDecorationKind;
}): ExploreDecorationSample {
  const { seed, tile, index, salt, kind } = input;
  const center = axialToWorld({ q: tile.q, r: tile.r }, 1, tile.height + 0.09);
  const offset = offsetFor(seed, tile, `${salt}:${index}`, salt === 'ground' ? 0.7 : 0.62);
  const tone = deterministicVisualRatio(seed, tile.q, tile.r, `${salt}:${index}:tone`);
  const scale = 0.76 + deterministicVisualRatio(seed, tile.q, tile.r, `${salt}:${index}:scale`) * 0.5;
  const rotation = deterministicVisualRatio(seed, tile.q, tile.r, `${salt}:${index}:rotation`) * Math.PI * 2;
  return {
    kind,
    x: center.x + offset.x,
    y: center.y + (kind === 'rock' || kind === 'path' ? 0.012 : 0.02),
    z: center.z + offset.z,
    scale,
    rotation,
    tone,
  };
}

export function getExploreDecorationSamples({
  seed,
  tiles,
  profile,
}: {
  seed: string;
  tiles: HexTileDTO[];
  profile: HexQualityProfile;
}): ExploreDecorationSample[] {
  const samples: ExploreDecorationSample[] = [];

  for (const tile of tiles) {
    if (!tile.unlocked) continue;
    const baseKind = groundKind(tile.terrainType);
    if (baseKind) {
      for (let index = 0; index < profile.exploreGroundPerTile; index += 1) {
        samples.push(makeSample({ seed, tile, index, salt: 'ground', kind: baseKind }));
      }
    }
    for (let index = 0; index < profile.exploreDecorPerTile; index += 1) {
      samples.push(makeSample({ seed, tile, index, salt: 'decor', kind: decorKind(seed, tile, index) }));
    }
  }

  return samples;
}
