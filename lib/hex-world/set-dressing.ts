import { getBuildingFootprint } from './building-catalog';
import { axialToWorld, hexDistance, hexKey } from './hex-grid';
import type { HexQualityProfile } from './quality';
import type { HexBuildingDTO, HexTileDTO } from './types';
import type { HexViewMode } from './view-mode';
import { deterministicVisualRatio } from './visual-theme';

export type HexSetDressingKind =
  | 'fence'
  | 'lantern'
  | 'fallenLog'
  | 'mushroomCluster'
  | 'wildflowerPatch'
  | 'stoneCluster';

export type HexSetDressingZone = 'homestead' | 'wild';

export type HexSetDressingPlacement = {
  kind: HexSetDressingKind;
  zone: HexSetDressingZone;
  tileKey: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
  motionPhase: number;
};

type Input = {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  seed: string;
  profile: HexQualityProfile;
  presentation: HexViewMode;
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

function dressingBudget(profile: HexQualityProfile, presentation: HexViewMode): number {
  if (presentation === 'person') {
    if (profile.name === 'high') return 64;
    if (profile.name === 'medium') return 38;
    return 20;
  }
  if (profile.name === 'high') return 34;
  if (profile.name === 'medium') return 22;
  return 12;
}

function density(profile: HexQualityProfile, presentation: HexViewMode, zone: HexSetDressingZone): number {
  const personBoost = presentation === 'person' ? 1 : 0.72;
  const quality = profile.name === 'high' ? 0.9 : profile.name === 'medium' ? 0.68 : 0.42;
  const zoneScale = zone === 'homestead' ? 0.92 : 0.76;
  return Math.min(1, personBoost * quality * zoneScale);
}

function samplesPerTile(profile: HexQualityProfile, presentation: HexViewMode): number {
  if (presentation === 'person' && profile.name === 'high') return 2;
  return 1;
}

function zoneFor(tile: HexTileDTO, buildings: HexBuildingDTO[]): HexSetDressingZone {
  if (!buildings.length) return 'wild';
  const nearBuilding = buildings.some((building) => hexDistance(tile, { q: building.anchorQ, r: building.anchorR }) <= 2);
  return nearBuilding ? 'homestead' : 'wild';
}

function kindFor(
  tile: HexTileDTO,
  seed: string,
  zone: HexSetDressingZone,
  sample: number,
): HexSetDressingKind {
  const ratio = deterministicVisualRatio(seed, tile.q, tile.r, `set-dressing-kind:${zone}:${sample}`);
  if (zone === 'homestead') {
    if (ratio < 0.28) return 'fence';
    if (ratio < 0.45) return 'lantern';
    if (ratio < 0.72) return 'wildflowerPatch';
    return 'stoneCluster';
  }
  if (ratio < 0.23) return 'fallenLog';
  if (ratio < 0.45) return 'mushroomCluster';
  if (ratio < 0.73) return 'wildflowerPatch';
  return 'stoneCluster';
}

function makePlacement(
  tile: HexTileDTO,
  seed: string,
  zone: HexSetDressingZone,
  sample: number,
): HexSetDressingPlacement {
  const world = axialToWorld(tile, 1, tile.height + 0.07);
  const angle = deterministicVisualRatio(seed, tile.q, tile.r, `set-dressing-angle:${sample}`) * Math.PI * 2;
  const radius = 0.28 + deterministicVisualRatio(seed, tile.q, tile.r, `set-dressing-radius:${sample}`) * 0.32;
  const kind = kindFor(tile, seed, zone, sample);
  const scale = 0.82 + deterministicVisualRatio(seed, tile.q, tile.r, `set-dressing-scale:${sample}`) * 0.34;
  return {
    kind,
    zone,
    tileKey: hexKey(tile),
    x: world.x + Math.cos(angle) * radius,
    y: world.y,
    z: world.z + Math.sin(angle) * radius,
    rotation: deterministicVisualRatio(seed, tile.q, tile.r, `set-dressing-rotation:${sample}`) * Math.PI * 2,
    scale,
    motionPhase: deterministicVisualRatio(seed, tile.q, tile.r, `set-dressing-motion:${sample}`) * Math.PI * 2,
  };
}

/**
 * Presentation-only authored pockets layered on top of the PBR world. The
 * result is deterministic and never occupies water, paths, or building cells.
 */
export function buildHexWorldSetDressing({
  tiles,
  buildings,
  seed,
  profile,
  presentation,
}: Input): HexSetDressingPlacement[] {
  const occupied = occupiedTileKeys(buildings);
  const eligible = [...tiles]
    .filter((tile) => tile.unlocked && tile.terrainType !== 'water')
    .filter((tile) => tile.metadata?.feature !== 'path')
    .filter((tile) => !occupied.has(hexKey(tile)))
    .sort((a, b) => a.q - b.q || a.r - b.r);
  const homestead = eligible.filter((tile) => zoneFor(tile, buildings) === 'homestead');
  const wild = eligible.filter((tile) => zoneFor(tile, buildings) === 'wild');
  const budget = dressingBudget(profile, presentation);
  const placements: HexSetDressingPlacement[] = [];
  const homesteadBudget = Math.min(budget, Math.max(1, Math.floor(budget * 0.45)));

  const emit = (source: HexTileDTO[], zone: HexSetDressingZone, phaseLimit: number) => {
    if (!source.length) return;
    const perTile = samplesPerTile(profile, presentation);
    for (let tileIndex = 0; tileIndex < source.length; tileIndex += 1) {
      if (placements.length >= phaseLimit || placements.length >= budget) break;
      const tile = source[tileIndex];
      for (let sample = 0; sample < perTile && placements.length < phaseLimit && placements.length < budget; sample += 1) {
        const presence = deterministicVisualRatio(seed, tile.q, tile.r, `set-dressing-presence:${zone}:${sample}`);
        const forcedAnchor = tileIndex === 0 && sample === 0;
        if (!forcedAnchor && presence > density(profile, presentation, zone)) continue;
        placements.push(makePlacement(tile, seed, zone, sample));
      }
    }
  };

  emit(homestead, 'homestead', homesteadBudget);
  emit(wild, 'wild', budget);
  return placements;
}

export function getHexAmbientLifeCount(profile: HexQualityProfile, presentation: HexViewMode): number {
  if (presentation === 'person') {
    if (profile.name === 'high') return 18;
    if (profile.name === 'medium') return 12;
    return 6;
  }
  if (profile.name === 'high') return 10;
  if (profile.name === 'medium') return 6;
  return 3;
}
