export type HexCoord = { q: number; r: number };
export type HexRotation = 0 | 1 | 2 | 3 | 4 | 5;
export type HexTerrainType = 'grass' | 'soil' | 'stone' | 'water';

export type HexWorldErrorCode =
  | 'tile_locked'
  | 'tile_occupied'
  | 'invalid_terrain'
  | 'invalid_building'
  | 'invalid_rotation'
  | 'building_not_found'
  | 'home_locked'
  | 'expansion_not_available'
  | 'not_enough_points'
  | 'land_access_denied';

export type HexTileDTO = HexCoord & {
  id?: string;
  worldId?: string;
  terrainType: HexTerrainType;
  height: number;
  unlocked: boolean;
  metadata?: Record<string, unknown>;
};

export type HexBuildingDTO = {
  id: string;
  worldId?: string;
  buildingKey: string;
  anchorQ: number;
  anchorR: number;
  rotation: HexRotation;
  modelUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type HexExpansionDTO = {
  expansionKey: string;
  tier: 1 | 2 | 3;
  pointCost: 100 | 250 | 500;
  tiles: HexCoord[];
  eligible: boolean;
};

export type HexWorldMetadata = {
  id: string;
  landId: string;
  schemaVersion: number;
  generatorVersion: number;
  seed: string;
  expansionLevel: number;
};

export type HexWorldSnapshot = {
  world: HexWorldMetadata;
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  expansions: HexExpansionDTO[];
  points: number;
};

export type HexPlacementInput = {
  buildingKey: string;
  anchorQ: number;
  anchorR: number;
  rotation: HexRotation;
};

export type HexPlacementResult =
  | { ok: true; occupied: HexCoord[] }
  | { ok: false; code: HexWorldErrorCode };
