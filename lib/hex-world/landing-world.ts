import { generateStarterWorld } from './generator';
import { hexDistance } from './hex-grid';
import type { HexBuildingDTO, HexTileDTO, HexWorldSnapshot } from './types';

const LANDING_SEED = 'narinyland-landing';
const LANDING_WORLD_ID = 'landing-preview-world';
const LANDING_LAND_ID = 'landing-preview-land';

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

export function createLandingGameplaySnapshots(): HexWorldSnapshot[] {
  const generated = generateStarterWorld(LANDING_SEED);
  const starterBuildings = generated.buildings.map(withWorldId);
  const showcaseBuildings = createShowcaseBuildings(starterBuildings);

  const stageTileCounts = [150, 190, 235, generated.tiles.length, generated.tiles.length];
  const stageBuildingCounts = [starterBuildings.length, starterBuildings.length + 2, starterBuildings.length + 4, showcaseBuildings.length, showcaseBuildings.length];
  const stagePoints = [40, 90, 150, 260, 320];

  return stageTileCounts.map((tileCount, index) => ({
    world: {
      id: LANDING_WORLD_ID,
      landId: LANDING_LAND_ID,
      schemaVersion: 1,
      generatorVersion: 1,
      seed: LANDING_SEED,
      expansionLevel: index >= 3 ? 1 : 0,
      revision: index + 1,
    },
    tiles: nearestTiles(generated.tiles, tileCount),
    buildings: showcaseBuildings.slice(0, stageBuildingCounts[index]),
    expansions: [],
    points: stagePoints[index],
  }));
}

export function createLandingHexWorldSnapshot(): HexWorldSnapshot {
  const snapshots = createLandingGameplaySnapshots();
  return snapshots[snapshots.length - 1];
}
