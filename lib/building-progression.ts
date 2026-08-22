export type BuildingTier = 1 | 2 | 3;
export type ProgressionBuildingKey = 'home' | 'barn' | 'workshop' | 'storage';
export type BuildingProgressionState = Record<ProgressionBuildingKey, BuildingTier>;

const UPGRADE_COSTS: Record<ProgressionBuildingKey, Record<1 | 2, number>> = {
  home: { 1: 350, 2: 650 },
  barn: { 1: 250, 2: 500 },
  workshop: { 1: 300, 2: 600 },
  storage: { 1: 220, 2: 440 },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeTier(value: unknown, fallback: BuildingTier): BuildingTier {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(3, Math.max(1, Math.floor(value))) as BuildingTier;
}

export function isProgressionBuildingKey(value: unknown): value is ProgressionBuildingKey {
  return value === 'home' || value === 'barn' || value === 'workshop' || value === 'storage';
}

export function createInitialBuildingProgression(homeLevel = 1): BuildingProgressionState {
  return {
    home: normalizeTier(homeLevel, 1),
    barn: 1,
    workshop: 1,
    storage: 1,
  };
}

export function normalizeBuildingProgression(raw: unknown, homeLevel = 1): BuildingProgressionState {
  const source = asRecord(raw);
  const initial = createInitialBuildingProgression(homeLevel);
  return {
    home: normalizeTier(source.home, initial.home),
    barn: normalizeTier(source.barn, initial.barn),
    workshop: normalizeTier(source.workshop, initial.workshop),
    storage: normalizeTier(source.storage, initial.storage),
  };
}

export function canUpgradeBuilding(_key: ProgressionBuildingKey, tier: BuildingTier): boolean {
  return tier < 3;
}

export function getBuildingUpgradeCost(key: ProgressionBuildingKey, tier: BuildingTier): number {
  if (tier >= 3) return 0;
  return UPGRADE_COSTS[key][tier];
}
