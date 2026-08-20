import { getBuildingDefinition, getBuildingFootprint } from './building-catalog';
import { hexKey } from './hex-grid';
import type { HexBuildingDTO, HexCoord, HexPlacementResult, HexRotation, HexTileDTO } from './types';

export type PlacementValidationInput = {
  buildingKey: string;
  anchor: HexCoord;
  rotation: number;
  tiles: Array<Pick<HexTileDTO, 'q' | 'r' | 'terrainType' | 'unlocked'>>;
  buildings: Array<Pick<HexBuildingDTO, 'id' | 'buildingKey' | 'anchorQ' | 'anchorR' | 'rotation'>>;
  ignoreBuildingId?: string;
};

export function buildOccupancyMap(
  buildings: PlacementValidationInput['buildings'],
  ignoreBuildingId?: string,
): Map<string, string> {
  const occupancy = new Map<string, string>();
  for (const building of buildings) {
    if (building.id === ignoreBuildingId) continue;
    const cells = getBuildingFootprint(
      building.buildingKey,
      { q: building.anchorQ, r: building.anchorR },
      building.rotation,
    );
    for (const cell of cells) occupancy.set(hexKey(cell), building.id);
  }
  return occupancy;
}

export function validatePlacement(input: PlacementValidationInput): HexPlacementResult {
  const definition = getBuildingDefinition(input.buildingKey);
  if (!definition) return { ok: false, code: 'invalid_building' };
  if (!Number.isInteger(input.rotation) || input.rotation < 0 || input.rotation > 5) {
    return { ok: false, code: 'invalid_rotation' };
  }

  const rotation = input.rotation as HexRotation;
  if (!definition.allowedRotations.includes(rotation)) return { ok: false, code: 'invalid_rotation' };

  const footprint = getBuildingFootprint(input.buildingKey, input.anchor, rotation);
  const tileMap = new Map(input.tiles.map((tile) => [hexKey(tile), tile]));
  const occupancy = buildOccupancyMap(input.buildings, input.ignoreBuildingId);

  for (const cell of footprint) {
    const tile = tileMap.get(hexKey(cell));
    if (!tile || !tile.unlocked) return { ok: false, code: 'tile_locked' };
    if (!definition.allowedTerrain.includes(tile.terrainType)) return { ok: false, code: 'invalid_terrain' };
    if (occupancy.has(hexKey(cell))) return { ok: false, code: 'tile_occupied' };
  }

  return { ok: true, occupied: footprint };
}
