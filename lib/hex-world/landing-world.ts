import { generateStarterWorld } from './generator';
import type { HexBuildingDTO, HexWorldSnapshot } from './types';

const LANDING_SEED = 'narinyland-landing';

export function createLandingHexWorldSnapshot(): HexWorldSnapshot {
  const generated = generateStarterWorld(LANDING_SEED);
  const buildings: HexBuildingDTO[] = [
    ...generated.buildings.map((building, index) => ({
      ...building,
      id: `landing-starter-${index}`,
      worldId: 'landing-preview-world',
    })),
    { id: 'landing-storage', worldId: 'landing-preview-world', buildingKey: 'storage', anchorQ: -3, anchorR: 0, rotation: 1 },
    { id: 'landing-workshop', worldId: 'landing-preview-world', buildingKey: 'workshop', anchorQ: 3, anchorR: 1, rotation: 5 },
    { id: 'landing-tree', worldId: 'landing-preview-world', buildingKey: 'tree', anchorQ: -2, anchorR: 4, rotation: 0 },
    { id: 'landing-flowers', worldId: 'landing-preview-world', buildingKey: 'flower_patch', anchorQ: 2, anchorR: -4, rotation: 0 },
    { id: 'landing-bench', worldId: 'landing-preview-world', buildingKey: 'bench', anchorQ: -1, anchorR: -3, rotation: 2 },
    { id: 'landing-lamp', worldId: 'landing-preview-world', buildingKey: 'lamp', anchorQ: 2, anchorR: 3, rotation: 0 },
  ];

  return {
    world: {
      id: 'landing-preview-world',
      landId: 'landing-preview-land',
      schemaVersion: 1,
      generatorVersion: 1,
      seed: LANDING_SEED,
      expansionLevel: 0,
      revision: 1,
    },
    tiles: generated.tiles,
    buildings,
    expansions: [],
    points: 0,
  };
}
