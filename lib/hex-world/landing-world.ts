import { generateStarterWorld } from './generator';
import { hexDistance, hexKey } from './hex-grid';
import type { HexBuildingDTO, HexExpansionDTO, HexTileDTO, HexWorldSnapshot } from './types';

const LANDING_SEED = 'narinyland-landing';
const LANDING_WORLD_ID = 'landing-preview-world';
const LANDING_LAND_ID = 'landing-preview-land';
const LANDING_EXPANSION_KEY = 'landing-expansion-east';

function withWorldId(building: Omit<HexBuildingDTO, 'id' | 'worldId'>, index: number): HexBuildingDTO {
  return {
    ...building,
    id: `landing-starter-${index}`,
    worldId: LANDING_WORLD_ID,
  };
}

function createShowcaseBuildings(starter: HexBuildingDTO[]): HexBuildingDTO[] {
  return [
    ...starter,
    { id: 'landing-storage', worldId: LANDING_WORLD_ID, buildingKey: 'storage', anchorQ: -3, anchorR: 0, rotation: 1 },
    { id: 'landing-workshop', worldId: LANDING_WORLD_ID, buildingKey: 'workshop', anchorQ: 3, anchorR: 1, rotation: 5 },
    { id: 'landing-garden', worldId: LANDING_WORLD_ID, buildingKey: 'garden_patch', anchorQ: -3, anchorR: 2, rotation: 0 },
    { id: 'landing-tree', worldId: LANDING_WORLD_ID, buildingKey: 'tree', anchorQ: -2, anchorR: 4, rotation: 0 },
    { id: 'landing-flowers', worldId: LANDING_WORLD_ID, buildingKey: 'flower_patch', anchorQ: 2, anchorR: -4, rotation: 0 },
    { id: 'landing-bench', worldId: LANDING_WORLD_ID, buildingKey: 'bench', anchorQ: -1, anchorR: -3, rotation: 2 },
    { id: 'landing-lamp', worldId: LANDING_WORLD_ID, buildingKey: 'lamp', anchorQ: 2, anchorR: 3, rotation: 0 },
  ];
}

function nearestTiles(tiles: HexTileDTO[], count: number): HexTileDTO[] {
  return [...tiles]
    .sort((a, b) => {
      const distance = hexDistance({ q: 0, r: 0 }, a) - hexDistance({ q: 0, r: 0 }, b);
      return distance || a.q - b.q || a.r - b.r;
    })
    .slice(0, Math.min(count, tiles.length));
}

function snapshot({
  tiles,
  buildings,
  points,
  revision,
  expansionLevel = 0,
  expansions = [],
}: {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  points: number;
  revision: number;
  expansionLevel?: number;
  expansions?: HexExpansionDTO[];
}): HexWorldSnapshot {
  return {
    world: {
      id: LANDING_WORLD_ID,
      landId: LANDING_LAND_ID,
      schemaVersion: 1,
      generatorVersion: 1,
      seed: LANDING_SEED,
      expansionLevel,
      revision,
    },
    tiles,
    buildings,
    expansions,
    points,
  };
}

export function createLandingGameplaySnapshots(): HexWorldSnapshot[] {
  const generated = generateStarterWorld(LANDING_SEED);
  const starterBuildings = generated.buildings.map(withWorldId);
  const showcaseBuildings = createShowcaseBuildings(starterBuildings);

  const arriveTiles = nearestTiles(generated.tiles, 150);
  const buildTiles = nearestTiles(generated.tiles, 190);
  const growTiles = nearestTiles(generated.tiles, 228);
  const editTiles = nearestTiles(generated.tiles, 235);
  const expandBaseTiles = nearestTiles(generated.tiles, 242);
  const expandBaseKeys = new Set(expandBaseTiles.map(hexKey));
  const expansionTiles = generated.tiles
    .filter((tile) => !expandBaseKeys.has(hexKey(tile)))
    .sort((a, b) => b.q - a.q || a.r - b.r)
    .slice(0, 7);
  const expansion: HexExpansionDTO = {
    expansionKey: LANDING_EXPANSION_KEY,
    tier: 1,
    pointCost: 100,
    tiles: expansionTiles.map(({ q, r }) => ({ q, r })),
    eligible: true,
  };

  const editBuildings = showcaseBuildings.slice(0, 7).map((building) =>
    building.id === 'landing-bench'
      ? { ...building, anchorQ: 0, anchorR: -4, rotation: 3 as const }
      : building,
  );
  const completedTiles = [...expandBaseTiles, ...expansionTiles];

  return [
    snapshot({ tiles: arriveTiles, buildings: starterBuildings, points: 120, revision: 1 }),
    snapshot({ tiles: buildTiles, buildings: showcaseBuildings.slice(0, 2), points: 120, revision: 2 }),
    snapshot({ tiles: growTiles, buildings: showcaseBuildings.slice(0, 7), points: 165, revision: 3 }),
    snapshot({ tiles: editTiles, buildings: editBuildings, points: 165, revision: 4 }),
    snapshot({ tiles: expandBaseTiles, buildings: editBuildings, points: 165, revision: 5, expansions: [expansion] }),
    snapshot({ tiles: completedTiles, buildings: showcaseBuildings, points: 65, revision: 6, expansionLevel: 1 }),
  ];
}

export function createLandingHexWorldSnapshot(): HexWorldSnapshot {
  const snapshots = createLandingGameplaySnapshots();
  return snapshots[snapshots.length - 1];
}
