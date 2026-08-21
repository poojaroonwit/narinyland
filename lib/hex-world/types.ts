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
  | 'expansion_not_found'
  | 'expansion_overlap'
  | 'expansion_disconnected'
  | 'expansion_disconnects_island'
  | 'expansion_has_buildings'
  | 'not_enough_points'
  | 'land_access_denied'
  | 'undo_unavailable'
  | 'undo_conflict';

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

export type HexPurchasedExpansionDTO = {
  expansionKey: string;
  tier: 1 | 2 | 3;
  pointCost: number;
  tiles: HexCoord[];
  hasBuildings: boolean;
  movable: boolean;
};

export type HexExpansionPlacementPreview = {
  expansionKey: string;
  tier: 1 | 2 | 3;
  tiles: HexCoord[];
  valid: boolean;
  mode: 'purchase' | 'move';
};

export type HexWorldMetadata = {
  id: string;
  landId: string;
  schemaVersion: number;
  generatorVersion: number;
  seed: string;
  expansionLevel: number;
  revision: number;
};

export type HexWorldSnapshot = {
  world: HexWorldMetadata;
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  expansions: HexExpansionDTO[];
  purchasedExpansions?: HexPurchasedExpansionDTO[];
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
