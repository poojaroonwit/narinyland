import {
  BEDTIME_MINUTES,
  CROP_CATALOG as BASE_CROP_CATALOG,
  CROP_KEYS as BASE_CROP_KEYS,
  RECIPE_CATALOG,
  RECIPE_KEYS,
  RESOURCE_CATALOG,
  RESOURCE_KEYS,
  START_OF_DAY_MINUTES,
  FarmGameError,
  canCookRecipe,
  chickenCost,
  createInitialFamilyFarmState,
  dailyGoalsComplete,
  fishingUnlocked,
  formatFarmTime,
  getDailyGoals,
  homeUpgradeCost,
  maxChickensForHome,
  normalizeFamilyFarmState,
  performFarmAction as performBaseFarmAction,
  xpToNextLevel,
  type DailyGoal,
  type FamilyFarmState as BaseFamilyFarmState,
  type FarmAction as BaseFarmAction,
  type FarmDaySummary as BaseFarmDaySummary,
  type FarmPlot as BaseFarmPlot,
  type FarmWeather,
  type RecipeKey,
  type ResourceKey,
} from './family-farm-game';

export type FarmSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export const PROGRESSION_CROP_KEYS = [
  'carrot',
  'lettuce',
  'tomato',
  'strawberry',
  'corn',
  'pumpkin',
  'potato',
  'cabbage',
] as const;

export type ProgressionCropKey = (typeof PROGRESSION_CROP_KEYS)[number];

export type ProgressionCropDefinition = {
  key: ProgressionCropKey;
  name: string;
  emoji: string;
  sproutEmoji: string;
  seedCost: number;
  sellPrice: number;
  growDays: number;
  yield: number;
  xp: number;
  minLevel: number;
  seasons: FarmSeason[];
  bonusSeason: FarmSeason;
};

export const PROGRESSION_CROP_CATALOG: Record<ProgressionCropKey, ProgressionCropDefinition> = {
  carrot: { ...BASE_CROP_CATALOG.carrot, minLevel: 1, seasons: ['spring', 'summer', 'autumn', 'winter'], bonusSeason: 'spring' },
  lettuce: { ...BASE_CROP_CATALOG.lettuce, minLevel: 1, seasons: ['spring', 'summer'], bonusSeason: 'spring' },
  tomato: { ...BASE_CROP_CATALOG.tomato, minLevel: 2, seasons: ['spring', 'summer', 'autumn'], bonusSeason: 'summer' },
  strawberry: { ...BASE_CROP_CATALOG.strawberry, minLevel: 3, seasons: ['spring', 'summer'], bonusSeason: 'summer' },
  corn: { key: 'corn', name: 'Corn', emoji: '🌽', sproutEmoji: '🌱', seedCost: 18, sellPrice: 42, growDays: 4, yield: 3, xp: 15, minLevel: 3, seasons: ['summer', 'autumn'], bonusSeason: 'autumn' },
  pumpkin: { key: 'pumpkin', name: 'Pumpkin', emoji: '🎃', sproutEmoji: '🌱', seedCost: 28, sellPrice: 72, growDays: 5, yield: 2, xp: 22, minLevel: 4, seasons: ['autumn'], bonusSeason: 'autumn' },
  potato: { key: 'potato', name: 'Potato', emoji: '🥔', sproutEmoji: '🌱', seedCost: 22, sellPrice: 52, growDays: 4, yield: 3, xp: 18, minLevel: 4, seasons: ['autumn', 'winter'], bonusSeason: 'winter' },
  cabbage: { key: 'cabbage', name: 'Cabbage', emoji: '🥬', sproutEmoji: '🌿', seedCost: 26, sellPrice: 64, growDays: 5, yield: 2, xp: 21, minLevel: 5, seasons: ['winter', 'spring'], bonusSeason: 'winter' },
};

export const WORKSHOP_UPGRADE_KEYS = ['sturdy_watering_can', 'market_crate', 'cozy_basket'] as const;
export type WorkshopUpgradeKey = (typeof WORKSHOP_UPGRADE_KEYS)[number];

export type WorkshopUpgradeDefinition = {
  key: WorkshopUpgradeKey;
  name: string;
  emoji: string;
  description: string;
  resources: Partial<Record<ResourceKey, number>>;
};

export const WORKSHOP_UPGRADES: Record<WorkshopUpgradeKey, WorkshopUpgradeDefinition> = {
  sturdy_watering_can: {
    key: 'sturdy_watering_can',
    name: 'Sturdy Watering Can',
    emoji: '💧',
    description: 'Watering takes 5 minutes instead of 10.',
    resources: { wood: 8, mushroom: 2 },
  },
  market_crate: {
    key: 'market_crate',
    name: 'Market Crate',
    emoji: '🧺',
    description: 'Produce and resources sell for 10% more.',
    resources: { wood: 10, berries: 2 },
  },
  cozy_basket: {
    key: 'cozy_basket',
    name: 'Cozy Basket',
    emoji: '💛',
    description: 'Family Time grants one extra Heart.',
    resources: { wood: 6, berries: 2 },
  },
};

export type ProgressionFarmPlot = Omit<BaseFarmPlot, 'cropKey'> & {
  cropKey: ProgressionCropKey | null;
};

export type ProgressionFarmInventory = {
  seeds: Record<ProgressionCropKey, number>;
  produce: Record<ProgressionCropKey, number>;
  resources: Record<ResourceKey, number>;
};

export type ProgressionFarmDailyState = BaseFamilyFarmState['daily'] & {
  flowersTended: boolean;
};

export type ProgressionFarmStats = BaseFamilyFarmState['stats'] & {
  crafted: number;
  flowersTended: number;
  seasonsCompleted: number;
};

export type WorkshopUpgradeState = Record<WorkshopUpgradeKey, boolean>;

export const HOMESTEAD_JOURNEY_KEYS = ['harvest_10', 'home_level_2', 'first_craft', 'first_season', 'hearts_50'] as const;
export type HomesteadJourneyKey = (typeof HOMESTEAD_JOURNEY_KEYS)[number];
export type HomesteadJourneyState = Record<HomesteadJourneyKey, boolean>;

export type ProgressionFarmDaySummary = BaseFarmDaySummary & {
  completedSeason?: FarmSeason;
  nextSeason?: FarmSeason;
  seasonRewardCoins?: number;
  seasonRewardHearts?: number;
};

export type ProgressionFamilyFarmState = Omit<
  BaseFamilyFarmState,
  'schemaVersion' | 'season' | 'plots' | 'inventory' | 'daily' | 'stats' | 'lastDaySummary'
> & {
  schemaVersion: 4;
  season: FarmSeason;
  plots: ProgressionFarmPlot[];
  inventory: ProgressionFarmInventory;
  daily: ProgressionFarmDailyState;
  stats: ProgressionFarmStats;
  workshopUpgrades: WorkshopUpgradeState;
  journey: HomesteadJourneyState;
  lastDaySummary: ProgressionFarmDaySummary | null;
};

export type ProgressionFarmAction =
  | { type: 'plant'; plotId: string; cropKey: ProgressionCropKey }
  | { type: 'water'; plotId: string }
  | { type: 'harvest'; plotId: string }
  | { type: 'buy_seed'; cropKey: ProgressionCropKey; quantity?: number }
  | { type: 'sell'; cropKey: ProgressionCropKey; quantity?: number | 'all' }
  | { type: 'feed_chickens' }
  | { type: 'collect_eggs' }
  | { type: 'buy_chicken' }
  | { type: 'forage' }
  | { type: 'fish' }
  | { type: 'cook'; recipeKey: RecipeKey }
  | { type: 'sell_resource'; resourceKey: ResourceKey; quantity?: number | 'all' }
  | { type: 'family_time' }
  | { type: 'claim_daily_reward' }
  | { type: 'end_day' }
  | { type: 'upgrade_home' }
  | { type: 'rename_family'; name: string }
  | { type: 'craft'; upgradeKey: WorkshopUpgradeKey }
  | { type: 'tend_flowers' };

export type ProgressionFarmActionResult = {
  state: ProgressionFamilyFarmState;
  message: string;
};

export type CropAvailability = {
  available: boolean;
  reason: string | null;
};

export type HomesteadJourneyEntry = {
  key: HomesteadJourneyKey;
  label: string;
  emoji: string;
  progress: number;
  target: number;
  complete: boolean;
  rewardLabel: string;
};

export type NextLevelUnlock = {
  level: number;
  label: string;
};

const JOURNEY_REWARDS: Record<HomesteadJourneyKey, string> = {
  harvest_10: '+80 coins · +2 corn seeds · +10 XP',
  home_level_2: '+60 coins · +5 Hearts',
  first_craft: '+40 coins · +10 XP',
  first_season: '+100 coins · +2 pumpkin seeds · +5 Hearts',
  hearts_50: '+50 coins · +10 XP',
};

const SEASON_META: Record<FarmSeason, { label: string; emoji: string }> = {
  spring: { label: 'Spring', emoji: '🌸' },
  summer: { label: 'Summer', emoji: '☀️' },
  autumn: { label: 'Autumn', emoji: '🍂' },
  winter: { label: 'Winter', emoji: '❄️' },
};

function safeInt(value: unknown, fallback: number, min = 0, max = 999999): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function isProgressionCropKey(value: unknown): value is ProgressionCropKey {
  return typeof value === 'string' && PROGRESSION_CROP_KEYS.includes(value as ProgressionCropKey);
}

export function isWorkshopUpgradeKey(value: unknown): value is WorkshopUpgradeKey {
  return typeof value === 'string' && WORKSHOP_UPGRADE_KEYS.includes(value as WorkshopUpgradeKey);
}

function isBaseCropKey(value: ProgressionCropKey): value is (typeof BASE_CROP_KEYS)[number] {
  return BASE_CROP_KEYS.includes(value as (typeof BASE_CROP_KEYS)[number]);
}

export function seasonForDay(day: number): FarmSeason {
  const normalizedDay = Math.max(1, Math.floor(Number.isFinite(day) ? day : 1));
  const dayInYear = (normalizedDay - 1) % 28;
  if (dayInYear < 7) return 'spring';
  if (dayInYear < 14) return 'summer';
  if (dayInYear < 21) return 'autumn';
  return 'winter';
}

export function weatherForProgressionDay(day: number): FarmWeather {
  const season = seasonForDay(day);
  const normalizedDay = Math.max(1, Math.floor(Number.isFinite(day) ? day : 1));
  const index = (normalizedDay - 1) % 7;
  const cycles: Record<FarmSeason, FarmWeather[]> = {
    spring: ['sunny', 'cloudy', 'breezy', 'rainy', 'sunny', 'rainy', 'sunny'],
    summer: ['sunny', 'sunny', 'breezy', 'sunny', 'cloudy', 'sunny', 'rainy'],
    autumn: ['cloudy', 'breezy', 'rainy', 'cloudy', 'sunny', 'breezy', 'rainy'],
    winter: ['cloudy', 'breezy', 'cloudy', 'sunny', 'breezy', 'cloudy', 'sunny'],
  };
  return cycles[season][index];
}

export function getSeasonPresentation(season: FarmSeason) {
  return SEASON_META[season];
}

function expandedCropCounts(
  raw: unknown,
  base: Partial<Record<ProgressionCropKey, number>>,
): Record<ProgressionCropKey, number> {
  const record = asRecord(raw);
  return PROGRESSION_CROP_KEYS.reduce((counts, key) => {
    counts[key] = safeInt(record[key], base[key] ?? 0);
    return counts;
  }, {} as Record<ProgressionCropKey, number>);
}

function normalizeWorkshopUpgrades(raw: unknown): WorkshopUpgradeState {
  const record = asRecord(raw);
  return {
    sturdy_watering_can: record.sturdy_watering_can === true,
    market_crate: record.market_crate === true,
    cozy_basket: record.cozy_basket === true,
  };
}

function normalizeJourney(raw: unknown): HomesteadJourneyState {
  const record = asRecord(raw);
  return {
    harvest_10: record.harvest_10 === true,
    home_level_2: record.home_level_2 === true,
    first_craft: record.first_craft === true,
    first_season: record.first_season === true,
    hearts_50: record.hearts_50 === true,
  };
}

function normalizeProgressionPlots(raw: unknown, base: BaseFamilyFarmState): ProgressionFarmPlot[] {
  const rawPlots = Array.isArray(raw) ? raw : [];
  return base.plots.map((basePlot, index) => {
    const candidate = asRecord(rawPlots[index]);
    const cropKey = isProgressionCropKey(candidate.cropKey)
      ? candidate.cropKey
      : (basePlot.cropKey as ProgressionCropKey | null);
    return {
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : basePlot.id,
      cropKey,
      growthDays: safeInt(candidate.growthDays, basePlot.growthDays, 0, 999),
      watered: typeof candidate.watered === 'boolean' ? candidate.watered : basePlot.watered,
      plantedDay: candidate.plantedDay === null
        ? null
        : safeInt(candidate.plantedDay, basePlot.plantedDay ?? 0, 0, 999999) || null,
    };
  });
}

function normalizeProgressionSummary(raw: unknown, base: BaseFarmDaySummary | null): ProgressionFarmDaySummary | null {
  if (!base) return null;
  const record = asRecord(raw);
  const completedSeason = typeof record.completedSeason === 'string' && ['spring', 'summer', 'autumn', 'winter'].includes(record.completedSeason)
    ? record.completedSeason as FarmSeason
    : undefined;
  const nextSeason = typeof record.nextSeason === 'string' && ['spring', 'summer', 'autumn', 'winter'].includes(record.nextSeason)
    ? record.nextSeason as FarmSeason
    : undefined;
  return {
    ...base,
    ...(completedSeason ? { completedSeason } : {}),
    ...(nextSeason ? { nextSeason } : {}),
    ...(typeof record.seasonRewardCoins === 'number' ? { seasonRewardCoins: safeInt(record.seasonRewardCoins, 0) } : {}),
    ...(typeof record.seasonRewardHearts === 'number' ? { seasonRewardHearts: safeInt(record.seasonRewardHearts, 0, 0, 100) } : {}),
  };
}

export function normalizeProgressionFarmState(raw: unknown, fallbackName = 'Our Family Farm'): ProgressionFamilyFarmState {
  const source = asRecord(raw);
  const base = normalizeFamilyFarmState(raw, fallbackName);
  const inventory = asRecord(source.inventory);
  const daily = asRecord(source.daily);
  const stats = asRecord(source.stats);
  const day = base.day;

  return {
    ...base,
    schemaVersion: 4,
    day,
    season: seasonForDay(day),
    weather: weatherForProgressionDay(day),
    plots: normalizeProgressionPlots(source.plots, base),
    inventory: {
      seeds: expandedCropCounts(inventory.seeds, base.inventory.seeds),
      produce: expandedCropCounts(inventory.produce, base.inventory.produce),
      resources: { ...base.inventory.resources },
    },
    daily: {
      ...base.daily,
      flowersTended: daily.flowersTended === true,
    },
    stats: {
      ...base.stats,
      crafted: safeInt(stats.crafted, 0),
      flowersTended: safeInt(stats.flowersTended, 0),
      seasonsCompleted: safeInt(stats.seasonsCompleted, 0),
    },
    workshopUpgrades: normalizeWorkshopUpgrades(source.workshopUpgrades),
    journey: normalizeJourney(source.journey),
    lastDaySummary: normalizeProgressionSummary(source.lastDaySummary, base.lastDaySummary),
  };
}

export function createInitialProgressionFarmState(familyName = 'Our Family Farm'): ProgressionFamilyFarmState {
  return normalizeProgressionFarmState(createInitialFamilyFarmState(familyName), familyName);
}

function cloneProgressionState(state: ProgressionFamilyFarmState): ProgressionFamilyFarmState {
  return {
    ...state,
    plots: state.plots.map((plot) => ({ ...plot })),
    inventory: {
      seeds: { ...state.inventory.seeds },
      produce: { ...state.inventory.produce },
      resources: { ...state.inventory.resources },
    },
    livestock: { ...state.livestock },
    daily: { ...state.daily },
    stats: { ...state.stats },
    milestones: { ...state.milestones },
    workshopUpgrades: { ...state.workshopUpgrades },
    journey: { ...state.journey },
    lastDaySummary: state.lastDaySummary ? { ...state.lastDaySummary } : null,
  };
}

function addProgressionXp(state: ProgressionFamilyFarmState, amount: number) {
  state.xp += Math.max(0, amount);
  while (state.xp >= xpToNextLevel(state.level)) {
    state.xp -= xpToNextLevel(state.level);
    state.level += 1;
    state.maxEnergy = Math.min(32, state.maxEnergy + 2);
    state.energy = Math.min(state.maxEnergy, state.energy + 2);
  }
}

function spendAction(state: ProgressionFamilyFarmState, energy: number, minutes: number) {
  if (state.energy < energy) throw new FarmGameError('You are out of energy. Go home and sleep to start a new day.');
  if (state.timeMinutes + minutes > BEDTIME_MINUTES) throw new FarmGameError('It is too late for that today. Go home and sleep.');
  state.energy -= energy;
  state.timeMinutes += minutes;
}

function findProgressionPlot(state: ProgressionFamilyFarmState, plotId: string): ProgressionFarmPlot {
  const plot = state.plots.find((candidate) => candidate.id === plotId);
  if (!plot) throw new FarmGameError('That garden plot does not exist.');
  return plot;
}

export function isProgressionPlotReady(plot: ProgressionFarmPlot): boolean {
  return !!plot.cropKey && plot.growthDays >= PROGRESSION_CROP_CATALOG[plot.cropKey].growDays;
}

export function getProgressionPlotProgress(plot: ProgressionFarmPlot): number {
  if (!plot.cropKey) return 0;
  return Math.min(1, plot.growthDays / PROGRESSION_CROP_CATALOG[plot.cropKey].growDays);
}

export function getCropAvailability(state: Pick<ProgressionFamilyFarmState, 'level' | 'season'>, cropKey: ProgressionCropKey): CropAvailability {
  const crop = PROGRESSION_CROP_CATALOG[cropKey];
  if (state.level < crop.minLevel) return { available: false, reason: `Reach level ${crop.minLevel}` };
  if (!crop.seasons.includes(state.season)) return { available: false, reason: `${crop.name} is not in season` };
  return { available: true, reason: null };
}

function requireCropAvailable(state: ProgressionFamilyFarmState, cropKey: ProgressionCropKey) {
  const availability = getCropAvailability(state, cropKey);
  if (!availability.available) throw new FarmGameError(availability.reason || 'That crop is not available right now.');
}

function grantBaseMilestones(state: ProgressionFamilyFarmState): string[] {
  const rewards: string[] = [];
  if (!state.milestones.plantedThree && state.stats.planted >= 3) {
    state.milestones.plantedThree = true;
    state.coins += 30;
    state.inventory.seeds.tomato += 2;
    rewards.push('Starter planter: +30 coins and 2 tomato seeds');
  }
  if (!state.milestones.wateredThree && state.stats.watered >= 3) {
    state.milestones.wateredThree = true;
    state.coins += 25;
    state.inventory.seeds.strawberry += 1;
    rewards.push('Watering routine: +25 coins and 1 strawberry seed');
  }
  if (!state.milestones.firstHarvest && state.stats.harvested >= 1) {
    state.milestones.firstHarvest = true;
    state.coins += 60;
    state.hearts = Math.min(100, state.hearts + 3);
    rewards.push('First harvest: +60 coins and +3 family hearts');
  }
  if (!state.milestones.firstEgg && state.stats.eggsCollected >= 1) {
    state.milestones.firstEgg = true;
    state.coins += 30;
    state.hearts = Math.min(100, state.hearts + 2);
    rewards.push('First egg: +30 coins and +2 family hearts');
  }
  if (!state.milestones.forageFive && state.stats.foraged >= 5) {
    state.milestones.forageFive = true;
    state.coins += 50;
    state.inventory.seeds.strawberry += 1;
    rewards.push('Forest helper: +50 coins and 1 strawberry seed');
  }
  if (!state.milestones.firstFish && state.stats.fishCaught >= 1) {
    state.milestones.firstFish = true;
    state.coins += 40;
    state.hearts = Math.min(100, state.hearts + 2);
    rewards.push('First catch: +40 coins and +2 family hearts');
  }
  if (!state.milestones.firstMeal && state.stats.mealsCooked >= 1) {
    state.milestones.firstMeal = true;
    state.coins += 35;
    state.hearts = Math.min(100, state.hearts + 3);
    rewards.push('First family meal: +35 coins and +3 family hearts');
  }
  return rewards;
}

function grantJourneyRewards(state: ProgressionFamilyFarmState): string[] {
  const rewards: string[] = [];
  const grant = (key: HomesteadJourneyKey, condition: boolean, apply: () => void) => {
    if (state.journey[key] || !condition) return;
    state.journey[key] = true;
    apply();
    rewards.push(`${journeyLabel(key)}: ${JOURNEY_REWARDS[key]}`);
  };

  grant('harvest_10', state.stats.harvested >= 10, () => {
    state.coins += 80;
    state.inventory.seeds.corn += 2;
    addProgressionXp(state, 10);
  });
  grant('home_level_2', state.homeLevel >= 2, () => {
    state.coins += 60;
    state.hearts = Math.min(100, state.hearts + 5);
  });
  grant('first_craft', state.stats.crafted >= 1, () => {
    state.coins += 40;
    addProgressionXp(state, 10);
  });
  grant('first_season', state.stats.seasonsCompleted >= 1, () => {
    state.coins += 100;
    state.inventory.seeds.pumpkin += 2;
    state.hearts = Math.min(100, state.hearts + 5);
  });
  grant('hearts_50', state.hearts >= 50, () => {
    state.coins += 50;
    addProgressionXp(state, 10);
  });
  return rewards;
}

function journeyLabel(key: HomesteadJourneyKey): string {
  switch (key) {
    case 'harvest_10': return 'Harvest Keeper';
    case 'home_level_2': return 'A Warmer Home';
    case 'first_craft': return 'Made Together';
    case 'first_season': return 'First Season';
    case 'hearts_50': return 'Growing Closer';
  }
}

function finalizeProgression(state: ProgressionFamilyFarmState, baseMessage: string): ProgressionFarmActionResult {
  const baseRewards = grantBaseMilestones(state);
  const journeyRewards = grantJourneyRewards(state);
  const extras = [...baseRewards, ...journeyRewards];
  const message = extras.length ? `${baseMessage} · ${extras.join(' · ')}` : baseMessage;
  state.lastMessage = message;
  return { state, message };
}

function delegatedBaseAction(state: ProgressionFamilyFarmState, action: BaseFarmAction): ProgressionFarmActionResult {
  const result = performBaseFarmAction(state as unknown as BaseFamilyFarmState, action);
  const next = cloneProgressionState(result.state as unknown as ProgressionFamilyFarmState);
  if (action.type === 'family_time' && next.workshopUpgrades.cozy_basket) {
    const before = next.hearts;
    next.hearts = Math.min(100, next.hearts + 1);
    const extra = next.hearts > before ? ' · Cozy Basket +1 Heart' : '';
    return finalizeProgression(next, `${result.message}${extra}`);
  }
  return finalizeProgression(next, result.message);
}

function saleQuantity(owned: number, quantity: number | 'all' | undefined): number {
  if (quantity === 'all') return owned;
  return Math.min(owned, safeInt(quantity, 1, 1, 99));
}

function marketTotal(baseTotal: number, marketCrate: boolean): number {
  return marketCrate ? Math.floor(baseTotal * 1.1) : baseTotal;
}

function createProgressionDailyState(state: ProgressionFamilyFarmState): ProgressionFarmDailyState {
  return {
    planted: 0,
    watered: 0,
    harvested: 0,
    foraged: 0,
    fished: 0,
    animalCare: false,
    familyTime: false,
    rewardClaimed: false,
    forageCharges: 3,
    fishingCharges: 3,
    flowersTended: false,
  };
}

export function performProgressionFarmAction(
  current: ProgressionFamilyFarmState,
  action: ProgressionFarmAction,
): ProgressionFarmActionResult {
  const state = cloneProgressionState(current);

  switch (action.type) {
    case 'plant': {
      if (!isProgressionCropKey(action.cropKey)) throw new FarmGameError('Unknown crop.');
      requireCropAvailable(state, action.cropKey);
      const plot = findProgressionPlot(state, action.plotId);
      if (plot.cropKey) throw new FarmGameError('This plot is already planted.');
      const crop = PROGRESSION_CROP_CATALOG[action.cropKey];
      if (state.inventory.seeds[action.cropKey] <= 0) throw new FarmGameError(`You do not have any ${crop.name} seeds.`);
      spendAction(state, 1, 20);
      state.inventory.seeds[action.cropKey] -= 1;
      plot.cropKey = action.cropKey;
      plot.growthDays = 0;
      plot.watered = false;
      plot.plantedDay = state.day;
      state.stats.planted += 1;
      state.daily.planted += 1;
      addProgressionXp(state, 2);
      return finalizeProgression(state, `Planted ${crop.name}. Give it some water 💧`);
    }
    case 'water': {
      const plot = findProgressionPlot(state, action.plotId);
      if (!plot.cropKey) throw new FarmGameError('Plant something here before watering.');
      if (isProgressionPlotReady(plot)) throw new FarmGameError('This crop is ready to harvest.');
      if (plot.watered) throw new FarmGameError('This crop is already watered today.');
      spendAction(state, 1, state.workshopUpgrades.sturdy_watering_can ? 5 : 10);
      plot.watered = true;
      state.stats.watered += 1;
      state.daily.watered += 1;
      addProgressionXp(state, 1);
      return finalizeProgression(state, state.workshopUpgrades.sturdy_watering_can
        ? 'Watered quickly with the Sturdy Watering Can 💧'
        : 'Watered. It will grow when the day ends 💧');
    }
    case 'harvest': {
      const plot = findProgressionPlot(state, action.plotId);
      if (!plot.cropKey) throw new FarmGameError('There is nothing to harvest here.');
      if (!isProgressionPlotReady(plot)) throw new FarmGameError('This crop still needs more growing days.');
      spendAction(state, 2, 15);
      const crop = PROGRESSION_CROP_CATALOG[plot.cropKey];
      const bonus = state.season === crop.bonusSeason ? 1 : 0;
      const quantity = crop.yield + bonus;
      state.inventory.produce[crop.key] += quantity;
      state.stats.harvested += quantity;
      state.daily.harvested += quantity;
      addProgressionXp(state, crop.xp + (bonus ? 2 : 0));
      plot.cropKey = null;
      plot.growthDays = 0;
      plot.watered = false;
      plot.plantedDay = null;
      return finalizeProgression(state, `Harvested ${quantity} ${crop.name}${quantity > 1 ? 's' : ''} ${crop.emoji}${bonus ? ' · seasonal bonus +1' : ''}`);
    }
    case 'buy_seed': {
      if (!isProgressionCropKey(action.cropKey)) throw new FarmGameError('Unknown crop.');
      requireCropAvailable(state, action.cropKey);
      const crop = PROGRESSION_CROP_CATALOG[action.cropKey];
      const quantity = safeInt(action.quantity, 1, 1, 20);
      const total = crop.seedCost * quantity;
      if (state.coins < total) throw new FarmGameError('Not enough coins for those seeds.');
      state.coins -= total;
      state.inventory.seeds[crop.key] += quantity;
      return finalizeProgression(state, `Bought ${quantity} ${crop.name} seed${quantity > 1 ? 's' : ''}.`);
    }
    case 'sell': {
      if (!isProgressionCropKey(action.cropKey)) throw new FarmGameError('Unknown crop.');
      const crop = PROGRESSION_CROP_CATALOG[action.cropKey];
      const owned = state.inventory.produce[crop.key];
      if (owned <= 0) throw new FarmGameError(`You do not have any ${crop.name} to sell.`);
      const quantity = saleQuantity(owned, action.quantity);
      const baseTotal = crop.sellPrice * quantity;
      const total = marketTotal(baseTotal, state.workshopUpgrades.market_crate);
      state.inventory.produce[crop.key] -= quantity;
      state.coins += total;
      state.stats.sold += quantity;
      state.stats.earned += total;
      state.hearts = Math.min(100, state.hearts + Math.max(1, Math.floor(quantity / 3)));
      addProgressionXp(state, Math.max(1, quantity));
      return finalizeProgression(state, `Sold ${quantity} ${crop.name}${quantity > 1 ? 's' : ''} for ${total} coins 🪙${state.workshopUpgrades.market_crate ? ' · Market Crate bonus' : ''}`);
    }
    case 'sell_resource': {
      if (!RESOURCE_KEYS.includes(action.resourceKey)) throw new FarmGameError('Unknown resource.');
      const resource = RESOURCE_CATALOG[action.resourceKey];
      const owned = state.inventory.resources[action.resourceKey];
      if (owned <= 0) throw new FarmGameError(`You do not have any ${resource.name} to sell.`);
      const quantity = saleQuantity(owned, action.quantity);
      const baseTotal = resource.sellPrice * quantity;
      const total = marketTotal(baseTotal, state.workshopUpgrades.market_crate);
      state.inventory.resources[action.resourceKey] -= quantity;
      state.coins += total;
      state.stats.sold += quantity;
      state.stats.earned += total;
      addProgressionXp(state, Math.max(1, quantity));
      return finalizeProgression(state, `Sold ${quantity} ${resource.name} for ${total} coins 🪙${state.workshopUpgrades.market_crate ? ' · Market Crate bonus' : ''}`);
    }
    case 'craft': {
      if (state.level < 3) throw new FarmGameError('Reach level 3 to unlock the Workshop.');
      if (!isWorkshopUpgradeKey(action.upgradeKey)) throw new FarmGameError('Unknown workshop upgrade.');
      if (state.workshopUpgrades[action.upgradeKey]) throw new FarmGameError('That Workshop upgrade is already crafted.');
      const upgrade = WORKSHOP_UPGRADES[action.upgradeKey];
      for (const [resourceKey, amount] of Object.entries(upgrade.resources) as Array<[ResourceKey, number]>) {
        if (state.inventory.resources[resourceKey] < amount) throw new FarmGameError(`You need ${amount} ${RESOURCE_CATALOG[resourceKey].name} for ${upgrade.name}.`);
      }
      for (const [resourceKey, amount] of Object.entries(upgrade.resources) as Array<[ResourceKey, number]>) {
        state.inventory.resources[resourceKey] -= amount;
      }
      state.workshopUpgrades[action.upgradeKey] = true;
      state.stats.crafted += 1;
      addProgressionXp(state, 8);
      return finalizeProgression(state, `Crafted ${upgrade.name} ${upgrade.emoji} · ${upgrade.description}`);
    }
    case 'tend_flowers': {
      if (state.daily.flowersTended) throw new FarmGameError('The flowers were already tended today.');
      spendAction(state, 0, 10);
      state.daily.flowersTended = true;
      state.stats.flowersTended += 1;
      state.hearts = Math.min(100, state.hearts + 1);
      addProgressionXp(state, 2);
      return finalizeProgression(state, 'Tended the flowers together 🌼 · +1 Heart · +2 XP');
    }
    case 'family_time': {
      return delegatedBaseAction(state, action);
    }
    case 'end_day': {
      const completedDay = state.day;
      const completedSeason = state.season;
      const goalsCompleted = dailyGoalsComplete(state as unknown as BaseFamilyFarmState);
      let rewardEarned = state.daily.rewardClaimed;
      let dailyRewardNote = '';
      let working = state;

      if (goalsCompleted && !working.daily.rewardClaimed) {
        const claimed = performBaseFarmAction(working as unknown as BaseFamilyFarmState, { type: 'claim_daily_reward' });
        working = cloneProgressionState(claimed.state as unknown as ProgressionFamilyFarmState);
        dailyRewardNote = ` ${claimed.message}.`;
        rewardEarned = true;
      } else if (!goalsCompleted && !working.daily.rewardClaimed) {
        working.dailyStreak = 0;
      }

      let grew = 0;
      const rainBonus = working.weather === 'rainy';
      for (const plot of working.plots) {
        if (!plot.cropKey || isProgressionPlotReady(plot)) {
          plot.watered = false;
          continue;
        }
        if (plot.watered || rainBonus) {
          plot.growthDays += 1;
          grew += 1;
        }
        plot.watered = false;
      }

      const newEggs = working.livestock.fedToday ? working.livestock.chickens : 0;
      working.livestock.eggsAvailable = Math.min(99, working.livestock.eggsAvailable + newEggs);
      working.livestock.fedToday = false;
      working.day += 1;
      working.season = seasonForDay(working.day);
      working.weather = weatherForProgressionDay(working.day);
      working.timeMinutes = START_OF_DAY_MINUTES;
      working.energy = working.maxEnergy;
      working.hearts = Math.min(100, working.hearts + 1);

      const seasonChanged = completedSeason !== working.season;
      const seasonRewardCoins = seasonChanged ? 100 : 0;
      const seasonRewardHearts = seasonChanged ? 5 : 0;
      if (seasonChanged) {
        working.coins += seasonRewardCoins;
        working.hearts = Math.min(100, working.hearts + seasonRewardHearts);
        working.stats.seasonsCompleted += 1;
      }

      working.daily = createProgressionDailyState(working);
      const rainNote = rainBonus ? ' Rain helped every planted crop.' : '';
      const eggNote = newEggs > 0 ? ` The coop produced ${newEggs} egg${newEggs === 1 ? '' : 's'}.` : '';
      const seasonNote = seasonChanged ? ` ${SEASON_META[completedSeason].emoji} ${SEASON_META[completedSeason].label} complete: +${seasonRewardCoins} coins and +${seasonRewardHearts} Hearts. ${SEASON_META[working.season].emoji} ${SEASON_META[working.season].label} begins.` : '';

      const finalized = finalizeProgression(working, `Day ${working.day} begins. ${grew} crop${grew === 1 ? '' : 's'} grew.${rainNote}${eggNote}${dailyRewardNote}${seasonNote}`);
      finalized.state.lastDaySummary = {
        completedDay,
        cropsGrown: grew,
        eggsProduced: newEggs,
        goalsCompleted,
        rewardEarned,
        streakAfter: finalized.state.dailyStreak,
        coinsAfter: finalized.state.coins,
        heartsAfter: finalized.state.hearts,
        tomorrowWeather: finalized.state.weather,
        ...(seasonChanged ? {
          completedSeason,
          nextSeason: finalized.state.season,
          seasonRewardCoins,
          seasonRewardHearts,
        } : {}),
      };
      return finalized;
    }
    case 'feed_chickens':
    case 'collect_eggs':
    case 'buy_chicken':
    case 'forage':
    case 'fish':
    case 'cook':
    case 'claim_daily_reward':
    case 'upgrade_home':
    case 'rename_family': {
      return delegatedBaseAction(state, action as BaseFarmAction);
    }
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function getProgressionDailyGoals(state: ProgressionFamilyFarmState): DailyGoal[] {
  return getDailyGoals(state as unknown as BaseFamilyFarmState);
}

export function canCookProgressionRecipe(state: ProgressionFamilyFarmState, recipeKey: RecipeKey): boolean {
  return canCookRecipe(state as unknown as BaseFamilyFarmState, recipeKey);
}

export function getNextLevelUnlock(level: number): NextLevelUnlock {
  if (level < 2) return { level: 2, label: 'Fishing + Tomato' };
  if (level < 3) return { level: 3, label: 'Workshop + Strawberry + Corn' };
  if (level < 4) return { level: 4, label: 'Pumpkin + Potato' };
  if (level < 5) return { level: 5, label: 'Cabbage + advanced homestead tier' };
  return { level: Math.max(6, level + 1), label: 'Homestead mastery' };
}

export function getHomesteadJourney(state: ProgressionFamilyFarmState): HomesteadJourneyEntry[] {
  return [
    { key: 'harvest_10', label: 'Harvest 10 produce', emoji: '🌾', progress: Math.min(10, state.stats.harvested), target: 10, complete: state.journey.harvest_10, rewardLabel: JOURNEY_REWARDS.harvest_10 },
    { key: 'home_level_2', label: 'Upgrade Home to level 2', emoji: '🏡', progress: Math.min(2, state.homeLevel), target: 2, complete: state.journey.home_level_2, rewardLabel: JOURNEY_REWARDS.home_level_2 },
    { key: 'first_craft', label: 'Craft a Workshop upgrade', emoji: '🔨', progress: Math.min(1, state.stats.crafted), target: 1, complete: state.journey.first_craft, rewardLabel: JOURNEY_REWARDS.first_craft },
    { key: 'first_season', label: 'Complete a season', emoji: '🍂', progress: Math.min(1, state.stats.seasonsCompleted), target: 1, complete: state.journey.first_season, rewardLabel: JOURNEY_REWARDS.first_season },
    { key: 'hearts_50', label: 'Reach 50 Hearts', emoji: '💗', progress: Math.min(50, state.hearts), target: 50, complete: state.journey.hearts_50, rewardLabel: JOURNEY_REWARDS.hearts_50 },
  ];
}

export {
  RECIPE_CATALOG,
  RECIPE_KEYS,
  RESOURCE_CATALOG,
  RESOURCE_KEYS,
  chickenCost,
  fishingUnlocked,
  formatFarmTime,
  homeUpgradeCost,
  maxChickensForHome,
  xpToNextLevel,
};
export type { FarmWeather, RecipeKey, ResourceKey };
