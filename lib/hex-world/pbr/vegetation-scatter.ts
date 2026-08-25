import { getBuildingFootprint } from '../building-catalog';
import { axialToWorld, hexKey, hexNeighbors } from '../hex-grid';
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

type ScatterInput = {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  seed: string;
  profile: HexQualityProfile;
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

function baseScale(kind: HexPBRVegetationKind): number {
  if (kind === 'tree') return 1.2;
  if (kind === 'rockSet') return 0.42;
  if (kind === 'stump') return 0.48;
  if (kind === 'grassTuft') return 0.46;
  return 0.62;
}

export function buildPBRVegetationScatter({
  tiles,
  buildings,
  seed,
  profile,
}: ScatterInput): HexPBRVegetationPlacement[] {
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
      const scaleVariation = 0.86 + deterministicVisualRatio(seed, tile.q, tile.r, `pbr-scale:${sample}`) * 0.3;
      placements.push({
        kind,
        tileKey,
        x: world.x + Math.cos(angle) * radius,
        y: world.y + 0.025,
        z: world.z + Math.sin(angle) * radius,
        rotation: deterministicVisualRatio(seed, tile.q, tile.r, `pbr-rotation:${sample}`) * Math.PI * 2,
        scale: baseScale(kind) * scaleVariation,
        windPhase: deterministicVisualRatio(seed, tile.q, tile.r, `pbr-wind:${sample}`) * Math.PI * 2,
      });
    }
  }

  return placements;
}

function exploreKindForTile(
  tile: HexTileDTO,
  seed: string,
  sample: number,
  edge: boolean,
): HexPBRVegetationKind {
  if (tile.metadata?.decor === 'tree') return 'tree';
  if (tile.metadata?.decor === 'rock') return 'rockSet';
  const ratio = deterministicVisualRatio(seed, tile.q, tile.r, `explore-pbr-kind:${edge ? 'edge' : 'interior'}:${sample}`);
  if (edge) {
    if (ratio < 0.3) return 'tree';
    if (ratio < 0.59) return 'shrub';
    if (ratio < 0.82) return 'fern';
    if (ratio < 0.91) return 'rockSet';
    return 'grassTuft';
  }
  if (ratio < 0.05) return 'tree';
  if (ratio < 0.16) return 'shrub';
  if (ratio < 0.3) return 'fern';
  if (ratio < 0.8) return 'grassTuft';
  if (ratio < 0.91) return 'rockSet';
  return 'stump';
}

function exploreDensity(profile: HexQualityProfile, edge: boolean): number {
  if (profile.name === 'high') return edge ? 0.94 : 0.66;
  if (profile.name === 'medium') return edge ? 0.78 : 0.5;
  return edge ? 0.52 : 0.28;
}

function exploreSamplesPerTile(profile: HexQualityProfile): number {
  return profile.name === 'high' ? 5 : profile.name === 'medium' ? 3 : 2;
}

/**
 * Person-scale Explore uses the same scanned local asset library as World, but
 * composes it like a place rather than a uniform scatter: wooded island edges,
 * clustered understory, and quieter interior clearings around gameplay space.
 */
export function buildExplorePBRVegetationScatter({
  tiles,
  buildings,
  seed,
  profile,
}: ScatterInput): HexPBRVegetationPlacement[] {
  const occupied = occupiedTileKeys(buildings);
  const landKeys = new Set(
    tiles.filter((tile) => tile.unlocked && tile.terrainType !== 'water').map(hexKey),
  );
  const eligible = [...tiles]
    .filter((tile) => tile.unlocked && tile.terrainType !== 'water')
    .filter((tile) => !occupied.has(hexKey(tile)) && tile.metadata?.feature !== 'path')
    .sort((a, b) => a.q - b.q || a.r - b.r);
  const edgeTiles: HexTileDTO[] = [];
  const interiorTiles: HexTileDTO[] = [];
  for (const tile of eligible) {
    const edge = hexNeighbors(tile).some((neighbor) => !landKeys.has(hexKey(neighbor)));
    (edge ? edgeTiles : interiorTiles).push(tile);
  }

  const placements: HexPBRVegetationPlacement[] = [];
  const samplesPerTile = exploreSamplesPerTile(profile);
  const edgeBudget = Math.max(1, Math.floor(profile.pbrGroundPropBudget * 0.66));

  const emit = (sourceTiles: HexTileDTO[], edge: boolean, phaseLimit: number) => {
    for (const tile of sourceTiles) {
      if (placements.length >= phaseLimit || placements.length >= profile.pbrGroundPropBudget) break;
      const tileKey = hexKey(tile);
      const world = axialToWorld(tile, 1, tile.height);
      const density = Math.min(1, exploreDensity(profile, edge) * Math.max(0.72, profile.pbrVegetationScale));
      const clusterAngle = deterministicVisualRatio(seed, tile.q, tile.r, `explore-cluster-angle:${edge ? 'edge' : 'interior'}`) * Math.PI * 2;
      const clusterRadius = 0.13 + deterministicVisualRatio(seed, tile.q, tile.r, 'explore-cluster-radius') * 0.19;
      const clusterX = world.x + Math.cos(clusterAngle) * clusterRadius;
      const clusterZ = world.z + Math.sin(clusterAngle) * clusterRadius;

      for (let sample = 0; sample < samplesPerTile && placements.length < phaseLimit && placements.length < profile.pbrGroundPropBudget; sample += 1) {
        const presence = deterministicVisualRatio(seed, tile.q, tile.r, `explore-pbr-presence:${sample}`);
        if (sample > 0 && presence > density) continue;
        const angle = deterministicVisualRatio(seed, tile.q, tile.r, `explore-pbr-angle:${sample}`) * Math.PI * 2;
        const radius = 0.07 + deterministicVisualRatio(seed, tile.q, tile.r, `explore-pbr-radius:${sample}`) * (edge ? 0.3 : 0.35);
        const kind = exploreKindForTile(tile, seed, sample, edge);
        const scaleVariation = 0.82 + deterministicVisualRatio(seed, tile.q, tile.r, `explore-pbr-scale:${sample}`) * 0.4;
        const zoneScale = edge && kind === 'tree' ? 1.08 : edge && (kind === 'shrub' || kind === 'fern') ? 1.04 : 1;
        placements.push({
          kind,
          tileKey,
          x: clusterX + Math.cos(angle) * radius,
          y: world.y + 0.025,
          z: clusterZ + Math.sin(angle) * radius,
          rotation: deterministicVisualRatio(seed, tile.q, tile.r, `explore-pbr-rotation:${sample}`) * Math.PI * 2,
          scale: baseScale(kind) * scaleVariation * zoneScale,
          windPhase: deterministicVisualRatio(seed, tile.q, tile.r, `explore-pbr-wind:${sample}`) * Math.PI * 2,
        });
      }
    }
  };

  emit(edgeTiles, true, edgeBudget);
  emit(interiorTiles, false, profile.pbrGroundPropBudget);
  return placements;
}
