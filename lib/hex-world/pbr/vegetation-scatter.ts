import { getBuildingFootprint } from '../building-catalog';
import { axialToWorld, hexKey } from '../hex-grid';
import type { HexQualityProfile } from '../quality';
import type { HexBuildingDTO, HexTileDTO } from '../types';
import { deterministicVisualRatio } from '../visual-theme';

export type HexPBRVegetationKind = 'tree' | 'shrub' | 'fern' | 'grassTuft' | 'rockSet' | 'stump';

export type HexPBRVegetationPlacement = {
  kind: HexPBRVegetationKind;
  tileKey: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
  windPhase: number;
};

function occupiedTileKeys(buildings: HexBuildingDTO[]): Set<string> {
  const occupied = new Set<string>();
  for (const building of buildings) {
    for (const coord of getBuildingFootprint(
      building.buildingKey,
      { q: building.anchorQ, r: building.anchorR },
      building.rotation,
    )) occupied.add(hexKey(coord));
  }
  return occupied;
}

function kindForTile(tile: HexTileDTO, seed: string, sample: number): HexPBRVegetationKind {
  if (tile.metadata?.decor === 'tree') return 'tree';
  if (tile.metadata?.decor === 'rock') return 'rockSet';
  const ratio = deterministicVisualRatio(seed, tile.q, tile.r, `pbr-kind:${sample}`);
  if (ratio < 0.14) return 'shrub';
  if (ratio < 0.29) return 'fern';
  if (ratio < 0.84) return 'grassTuft';
  return 'stump';
}

function densityFor(tile: HexTileDTO, profile: HexQualityProfile): number {
  if (tile.metadata?.decor === 'tree' || tile.metadata?.decor === 'rock') return 1;
  return profile.name === 'high' ? 0.72 : profile.name === 'medium' ? 0.5 : 0.3;
}

export function buildPBRVegetationScatter({
  tiles,
  buildings,
  seed,
  profile,
}: {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  seed: string;
  profile: HexQualityProfile;
}): HexPBRVegetationPlacement[] {
  const occupied = occupiedTileKeys(buildings);
  const placements: HexPBRVegetationPlacement[] = [];
  const sortedTiles = [...tiles].sort((a, b) => a.q - b.q || a.r - b.r);
  const samplesPerTile = profile.name === 'high' ? 3 : profile.name === 'medium' ? 2 : 1;

  for (const tile of sortedTiles) {
    if (placements.length >= profile.pbrGroundPropBudget) break;
    const tileKey = hexKey(tile);
    if (!tile.unlocked || tile.terrainType === 'water' || occupied.has(tileKey)) continue;
    if (tile.metadata?.feature === 'path') continue;

    const world = axialToWorld(tile, 1, tile.height);
    const density = densityFor(tile, profile) * profile.pbrVegetationScale;
    for (let sample = 0; sample < samplesPerTile && placements.length < profile.pbrGroundPropBudget; sample += 1) {
      const presence = deterministicVisualRatio(seed, tile.q, tile.r, `pbr-presence:${sample}`);
      if (presence > density) continue;
      const angle = deterministicVisualRatio(seed, tile.q, tile.r, `pbr-angle:${sample}`) * Math.PI * 2;
      const radius = 0.22 + deterministicVisualRatio(seed, tile.q, tile.r, `pbr-radius:${sample}`) * 0.47;
      const kind = kindForTile(tile, seed, sample);
      const baseScale = kind === 'tree' ? 1.2 : kind === 'rockSet' ? 0.42 : kind === 'stump' ? 0.48 : kind === 'grassTuft' ? 0.46 : 0.62;
      const scaleVariation = 0.86 + deterministicVisualRatio(seed, tile.q, tile.r, `pbr-scale:${sample}`) * 0.3;
      placements.push({
        kind,
        tileKey,
        x: world.x + Math.cos(angle) * radius,
        y: world.y + 0.025,
        z: world.z + Math.sin(angle) * radius,
        rotation: deterministicVisualRatio(seed, tile.q, tile.r, `pbr-rotation:${sample}`) * Math.PI * 2,
        scale: baseScale * scaleVariation,
        windPhase: deterministicVisualRatio(seed, tile.q, tile.r, `pbr-wind:${sample}`) * Math.PI * 2,
      });
    }
  }

  return placements;
}
