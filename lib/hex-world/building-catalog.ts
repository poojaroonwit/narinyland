import { rotateHexOffset } from './hex-grid';
import type { HexCoord, HexRotation, HexTerrainType } from './types';

export type HexBuildingCategory = 'main' | 'utility' | 'nature' | 'decor';

export type HexBuildingDefinition = {
  key: string;
  name: string;
  category: HexBuildingCategory;
  footprint: HexCoord[];
  allowedTerrain: HexTerrainType[];
  allowedRotations: HexRotation[];
  removable: boolean;
  duplicates: boolean;
  visual: string;
};

const ALL_ROTATIONS: HexRotation[] = [0, 1, 2, 3, 4, 5];
const GRASSY: HexTerrainType[] = ['grass', 'soil'];

export const BUILDING_CATALOG = {
  home: {
    key: 'home',
    name: 'Home',
    category: 'main',
    footprint: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: -1 }],
    allowedTerrain: GRASSY,
    allowedRotations: ALL_ROTATIONS,
    removable: false,
    duplicates: false,
    visual: 'home',
  },
  storage: {
    key: 'storage', name: 'Storage', category: 'main',
    footprint: [{ q: 0, r: 0 }, { q: 1, r: 0 }], allowedTerrain: GRASSY,
    allowedRotations: ALL_ROTATIONS, removable: true, duplicates: false, visual: 'storage',
  },
  workshop: {
    key: 'workshop', name: 'Workshop', category: 'main',
    footprint: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }], allowedTerrain: GRASSY,
    allowedRotations: ALL_ROTATIONS, removable: true, duplicates: false, visual: 'workshop',
  },
  barn: {
    key: 'barn', name: 'Barn', category: 'main',
    footprint: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }], allowedTerrain: GRASSY,
    allowedRotations: ALL_ROTATIONS, removable: true, duplicates: false, visual: 'barn',
  },
  tree: {
    key: 'tree', name: 'Tree', category: 'nature', footprint: [{ q: 0, r: 0 }],
    allowedTerrain: GRASSY, allowedRotations: ALL_ROTATIONS, removable: true, duplicates: true, visual: 'tree',
  },
  flower_patch: {
    key: 'flower_patch', name: 'Flower Patch', category: 'nature', footprint: [{ q: 0, r: 0 }],
    allowedTerrain: GRASSY, allowedRotations: ALL_ROTATIONS, removable: true, duplicates: true, visual: 'flower_patch',
  },
  pond: {
    key: 'pond', name: 'Pond', category: 'nature',
    footprint: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }],
    allowedTerrain: GRASSY, allowedRotations: ALL_ROTATIONS, removable: true, duplicates: true, visual: 'pond',
  },
  bench: {
    key: 'bench', name: 'Bench', category: 'decor', footprint: [{ q: 0, r: 0 }],
    allowedTerrain: ['grass', 'soil', 'stone'], allowedRotations: ALL_ROTATIONS, removable: true, duplicates: true, visual: 'bench',
  },
  lamp: {
    key: 'lamp', name: 'Lamp', category: 'decor', footprint: [{ q: 0, r: 0 }],
    allowedTerrain: ['grass', 'soil', 'stone'], allowedRotations: ALL_ROTATIONS, removable: true, duplicates: true, visual: 'lamp',
  },
  fence: {
    key: 'fence', name: 'Fence', category: 'decor', footprint: [{ q: 0, r: 0 }],
    allowedTerrain: ['grass', 'soil', 'stone'], allowedRotations: ALL_ROTATIONS, removable: true, duplicates: true, visual: 'fence',
  },
  stone_path: {
    key: 'stone_path', name: 'Stone Path', category: 'decor', footprint: [{ q: 0, r: 0 }],
    allowedTerrain: ['grass', 'soil', 'stone'], allowedRotations: ALL_ROTATIONS, removable: true, duplicates: true, visual: 'stone_path',
  },
  garden_patch: {
    key: 'garden_patch', name: 'Garden Patch', category: 'utility', footprint: [{ q: 0, r: 0 }],
    allowedTerrain: GRASSY, allowedRotations: ALL_ROTATIONS, removable: true, duplicates: true, visual: 'garden_patch',
  },
} as const satisfies Record<string, HexBuildingDefinition>;

export type HexBuildingKey = keyof typeof BUILDING_CATALOG;

export function getBuildingDefinition(buildingKey: string): HexBuildingDefinition | null {
  return (BUILDING_CATALOG as Record<string, HexBuildingDefinition>)[buildingKey] ?? null;
}

export function getBuildingFootprint(buildingKey: string, anchor: HexCoord, rotation: HexRotation): HexCoord[] {
  const definition = getBuildingDefinition(buildingKey);
  if (!definition) return [];
  return definition.footprint.map((offset) => {
    const rotated = rotateHexOffset(offset, rotation);
    return { q: anchor.q + rotated.q, r: anchor.r + rotated.r };
  });
}
