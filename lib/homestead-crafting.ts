import type { ResourceKey } from './family-farm-progression';
import type { BuildingTier } from './building-progression';

export const HOMESTEAD_CRAFT_KEYS = [
  'fence_bundle',
  'bench_kit',
  'lamp_kit',
  'stone_path_kit',
  'flower_planter',
  'animal_trough',
  'picnic_table',
  'flower_box',
  'wool_cushion',
] as const;

export type HomesteadCraftKey = (typeof HOMESTEAD_CRAFT_KEYS)[number];
export type HomesteadCraftResourceKey = ResourceKey | 'milk' | 'wool';
export type HomesteadCraftingState = Record<HomesteadCraftKey, number>;

export type HomesteadCraftDefinition = {
  key: HomesteadCraftKey;
  name: string;
  emoji: string;
  minWorkshopTier: BuildingTier;
  resources: Partial<Record<HomesteadCraftResourceKey, number>>;
  maxCount?: number;
  familyBonus?: number;
};

export const HOMESTEAD_CRAFT_CATALOG: Record<HomesteadCraftKey, HomesteadCraftDefinition> = {
  fence_bundle: {
    key: 'fence_bundle', name: 'Fence Bundle', emoji: '🪵', minWorkshopTier: 1,
    resources: { wood: 4 }, maxCount: 99,
  },
  bench_kit: {
    key: 'bench_kit', name: 'Bench Kit', emoji: '🪑', minWorkshopTier: 1,
    resources: { wood: 6 }, maxCount: 20,
  },
  lamp_kit: {
    key: 'lamp_kit', name: 'Garden Lamp Kit', emoji: '🏮', minWorkshopTier: 2,
    resources: { wood: 5, mushroom: 1 }, maxCount: 20,
  },
  stone_path_kit: {
    key: 'stone_path_kit', name: 'Path Kit', emoji: '🪨', minWorkshopTier: 1,
    resources: { wood: 3 }, maxCount: 99,
  },
  flower_planter: {
    key: 'flower_planter', name: 'Flower Planter', emoji: '🌷', minWorkshopTier: 2,
    resources: { wood: 4, berries: 2 }, maxCount: 20, familyBonus: 1,
  },
  animal_trough: {
    key: 'animal_trough', name: 'Animal Trough', emoji: '🪣', minWorkshopTier: 2,
    resources: { wood: 8 }, maxCount: 5,
  },
  picnic_table: {
    key: 'picnic_table', name: 'Picnic Table', emoji: '🧺', minWorkshopTier: 2,
    resources: { wood: 10, berries: 2 }, maxCount: 5, familyBonus: 2,
  },
  flower_box: {
    key: 'flower_box', name: 'Flower Box', emoji: '🌼', minWorkshopTier: 2,
    resources: { wood: 5, berries: 3 }, maxCount: 10, familyBonus: 1,
  },
  wool_cushion: {
    key: 'wool_cushion', name: 'Wool Cushion', emoji: '🧶', minWorkshopTier: 3,
    resources: { wood: 2, wool: 2 }, maxCount: 10, familyBonus: 1,
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function isHomesteadCraftKey(value: unknown): value is HomesteadCraftKey {
  return typeof value === 'string' && HOMESTEAD_CRAFT_KEYS.includes(value as HomesteadCraftKey);
}

export function createInitialHomesteadCraftingState(): HomesteadCraftingState {
  return HOMESTEAD_CRAFT_KEYS.reduce((state, key) => {
    state[key] = 0;
    return state;
  }, {} as HomesteadCraftingState);
}

export function normalizeHomesteadCraftingState(raw: unknown): HomesteadCraftingState {
  const source = asRecord(raw);
  return HOMESTEAD_CRAFT_KEYS.reduce((state, key) => {
    state[key] = safeCount(source[key]);
    return state;
  }, {} as HomesteadCraftingState);
}
