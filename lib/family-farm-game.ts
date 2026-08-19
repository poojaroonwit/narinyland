export const CROP_KEYS = ['carrot', 'lettuce', 'tomato', 'strawberry'] as const;
export const RESOURCE_KEYS = ['egg', 'berries', 'mushroom', 'wood'] as const;

export type CropKey = (typeof CROP_KEYS)[number];
export type ResourceKey = (typeof RESOURCE_KEYS)[number];
export type ForageResourceKey = Exclude<ResourceKey, 'egg'>;
export type FarmWeather = 'sunny' | 'cloudy' | 'rainy' | 'breezy';

export type CropDefinition = {
  key: CropKey;
  name: string;
  emoji: string;
  sproutEmoji: string;
  seedCost: number;
  sellPrice: number;
  growDays: number;
  yield: number;
  xp: number;
};

export type ResourceDefinition = {
  key: ResourceKey;
  name: string;
  emoji: string;
  sellPrice: number;
};

export const CROP_CATALOG: Record<CropKey, CropDefinition> = {
  carrot: {
    key: 'carrot',
    name: 'Carrot',
    emoji: '🥕',
    sproutEmoji: '🌱',
    seedCost: 6,
    sellPrice: 14,
    growDays: 2,
    yield: 2,
    xp: 6,
  },
  lettuce: {
    key: 'lettuce',
    name: 'Lettuce',
    emoji: '🥬',
    sproutEmoji: '🌿',
    seedCost: 9,
    sellPrice: 20,
    growDays: 3,
    yield: 2,
    xp: 9,
  },
  tomato: {
    key: 'tomato',
    name: 'Tomato',
    emoji: '🍅',
    sproutEmoji: '🌱',
    seedCost: 14,
    sellPrice: 34,
    growDays: 4,
    yield: 2,
    xp: 13,
  },
  strawberry: {
    key: 'strawberry',
    name: 'Strawberry',
    emoji: '🍓',
    sproutEmoji: '🌿',
    seedCost: 20,
    sellPrice: 50,
    growDays: 5,
    yield: 2,
    xp: 18,
  },
};

export const RESOURCE_CATALOG: Record<ResourceKey, ResourceDefinition> = {
  egg: { key: 'egg', name: 'Egg', emoji: '🥚', sellPrice: 18 },
  berries: { key: 'berries', name: 'Wild Berries', emoji: '🫐', sellPrice: 12 },
  mushroom: { key: 'mushroom', name: 'Mushroom', emoji: '🍄', sellPrice: 22 },
  wood: { key: 'wood', name: 'Wood', emoji: '🪵', sellPrice: 8 },
};

export type FarmPlot = {
  id: string;
  cropKey: CropKey | null;
  growthDays: number;
  watered: boolean;
  plantedDay: number | null;
};

export type FarmInventory = {
  seeds: Record<CropKey, number>;
  produce: Record<CropKey, number>;
  resources: Record<ResourceKey, number>;
};

export type FarmStats = {
  planted: number;
  watered: number;
  harvested: number;
  sold: number;
  earned: number;
  eggsCollected: number;
  foraged: number;
  familyMoments: number;
  dailyRewards: number;
};

export type FarmMilestones = {
  plantedThree: boolean;
  wateredThree: boolean;
  firstHarvest: boolean;
  firstEgg: boolean;
  forageFive: boolean;
};

export type FarmLivestock = {
  chickens: number;
  fedToday: boolean;
  eggsAvailable: number;
};

export type FarmDailyState = {
  watered: number;
  harvested: number;
  foraged: number;
  familyTime: boolean;
  rewardClaimed: boolean;
  forageCharges: number;
};

export type FamilyFarmState = {
  schemaVersion: 2;
  day: number;
  season: 'spring';
  weather: FarmWeather;
  timeMinutes: number;
  coins: number;
  energy: number;
  maxEnergy: number;
  level: number;
  xp: number;
  familyName: string;
  homeLevel: number;
  hearts: number;
  dailyStreak: number;
  plots: FarmPlot[];
  inventory: FarmInventory;
  livestock: FarmLivestock;
  daily: FarmDailyState;
  stats: FarmStats;
  milestones: FarmMilestones;
  lastMessage: string;
};

export type FarmAction =
  | { type: 'plant'; plotId: string; cropKey: CropKey }
  | { type: 'water'; plotId: string }
  | { type: 'harvest'; plotId: string }
  | { type: 'buy_seed'; cropKey: CropKey; quantity?: number }
  | { type: 'sell'; cropKey: CropKey; quantity?: number | 'all' }
  | { type: 'feed_chickens' }
  | { type: 'collect_eggs' }
  | { type: 'buy_chicken' }
  | { type: 'forage' }
  | { type: 'sell_resource'; resourceKey: ResourceKey; quantity?: number | 'all' }
  | { type: 'family_time' }
  | { type: 'claim_daily_reward' }
  | { type: 'end_day' }
  | { type: 'upgrade_home' }
  | { type: 'rename_family'; name: string };

export type FarmActionResult = {
  state: FamilyFarmState;
  message: string;
};

export type DailyGoal = {
  key: 'water' | 'harvest' | 'forage' | 'family';
  label: string;
  emoji: string;
  progress: number;
  target: number;
  complete: boolean;
};

export class FarmGameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FarmGameError';
  }
}

const DEFAULT_PLOT_COUNT = 20;
const MAX_HOME_LEVEL = 4;
export const START_OF_DAY_MINUTES = 6 * 60;
export const BEDTIME_MINUTES = 22 * 60;

function blankInventory(): FarmInventory {
  return {
    seeds: {
      carrot: 6,
      lettuce: 4,
      tomato: 2,
      strawberry: 1,
    },
    produce: {
      carrot: 0,
      lettuce: 0,
      tomato: 0,
      strawberry: 0,
    },
    resources: {
      egg: 0,
      berries: 0,
      mushroom: 0,
      wood: 0,
    },
  };
}

function createPlots(count = DEFAULT_PLOT_COUNT): FarmPlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `plot-${index + 1}`,
    cropKey: null,
    growthDays: 0,
    watered: false,
    plantedDay: null,
  }));
}

function createDailyState(): FarmDailyState {
  return {
    watered: 0,
    harvested: 0,
    foraged: 0,
    familyTime: false,
    rewardClaimed: false,
    forageCharges: 3,
  };
}

export function weatherForDay(day: number): FarmWeather {
  const cycle: FarmWeather[] = ['sunny', 'sunny', 'cloudy', 'breezy', 'rainy', 'sunny'];
  return cycle[Math.abs(day - 1) % cycle.length];
}

export function formatFarmTime(minutes: number): string {
  const safe = Math.min(BEDTIME_MINUTES, Math.max(0, Math.floor(minutes)));
  const hour24 = Math.floor(safe / 60);
  const minute = safe % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function createInitialFamilyFarmState(familyName = 'Our Family Farm'): FamilyFarmState {
  return {
    schemaVersion: 2,
    day: 1,
    season: 'spring',
    weather: weatherForDay(1),
    timeMinutes: START_OF_DAY_MINUTES,
    coins: 120,
    energy: 20,
    maxEnergy: 20,
    level: 1,
    xp: 0,
    familyName: sanitizeFamilyName(familyName),
    homeLevel: 1,
    hearts: 20,
    dailyStreak: 0,
    plots: createPlots(),
    inventory: blankInventory(),
    livestock: {
      chickens: 2,
      fedToday: false,
      eggsAvailable: 0,
    },
    daily: createDailyState(),
    stats: {
      planted: 0,
      watered: 0,
      harvested: 0,
      sold: 0,
      earned: 0,
      eggsCollected: 0,
      foraged: 0,
      familyMoments: 0,
      dailyRewards: 0,
    },
    milestones: {
      plantedThree: false,
      wateredThree: false,
      firstHarvest: false,
      firstEgg: false,
      forageFive: false,
    },
    lastMessage: 'Welcome home. Walk around, tend the garden, and build your family life 🌱',
  };
}

function sanitizeFamilyName(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, 32);
  return cleaned || 'Our Family Farm';
}

function safeInt(value: unknown, fallback: number, min = 0, max = 999999): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function isCropKey(value: unknown): value is CropKey {
  return typeof value === 'string' && CROP_KEYS.includes(value as CropKey);
}

function isResourceKey(value: unknown): value is ResourceKey {
  return typeof value === 'string' && RESOURCE_KEYS.includes(value as ResourceKey);
}

function cloneState(state: FamilyFarmState): FamilyFarmState {
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
  };
}

function findPlot(state: FamilyFarmState, plotId: string): FarmPlot {
  const plot = state.plots.find((candidate) => candidate.id === plotId);
  if (!plot) throw new FarmGameError('That garden plot does not exist.');
  return plot;
}

function spendAction(state: FamilyFarmState, energy: number, minutes: number) {
  if (state.energy < energy) {
    throw new FarmGameError('You are out of energy. Go home and sleep to start a new day.');
  }
  if (state.timeMinutes + minutes > BEDTIME_MINUTES) {
    throw new FarmGameError('It is too late for that today. Go home and sleep.');
  }
  state.energy -= energy;
  state.timeMinutes += minutes;
}

export function xpToNextLevel(level: number): number {
  return 40 + Math.max(0, level - 1) * 25;
}

function addXp(state: FamilyFarmState, amount: number) {
  state.xp += Math.max(0, amount);

  while (state.xp >= xpToNextLevel(state.level)) {
    state.xp -= xpToNextLevel(state.level);
    state.level += 1;
    state.maxEnergy = Math.min(32, state.maxEnergy + 2);
    state.energy = Math.min(state.maxEnergy, state.energy + 2);
  }
}

export function isPlotReady(plot: FarmPlot): boolean {
  if (!plot.cropKey) return false;
  return plot.growthDays >= CROP_CATALOG[plot.cropKey].growDays;
}

export function getPlotProgress(plot: FarmPlot): number {
  if (!plot.cropKey) return 0;
  return Math.min(1, plot.growthDays / CROP_CATALOG[plot.cropKey].growDays);
}

export function homeUpgradeCost(homeLevel: number): number {
  return 350 + Math.max(0, homeLevel - 1) * 300;
}

export function chickenCost(chickensOwned: number): number {
  return 180 + Math.max(0, chickensOwned - 2) * 90;
}

export function maxChickensForHome(homeLevel: number): number {
  return 2 + Math.max(1, homeLevel) * 2;
}

export function getDailyGoals(state: FamilyFarmState): DailyGoal[] {
  return [
    {
      key: 'water',
      label: 'Water 3 crops',
      emoji: '💧',
      progress: Math.min(3, state.daily.watered),
      target: 3,
      complete: state.daily.watered >= 3,
    },
    {
      key: 'harvest',
      label: 'Harvest 2 produce',
      emoji: '🧺',
      progress: Math.min(2, state.daily.harvested),
      target: 2,
      complete: state.daily.harvested >= 2,
    },
    {
      key: 'forage',
      label: 'Forage twice',
      emoji: '🌲',
      progress: Math.min(2, state.daily.foraged),
      target: 2,
      complete: state.daily.foraged >= 2,
    },
    {
      key: 'family',
      label: 'Spend family time',
      emoji: '💛',
      progress: state.daily.familyTime ? 1 : 0,
      target: 1,
      complete: state.daily.familyTime,
    },
  ];
}

export function dailyGoalsComplete(state: FamilyFarmState): boolean {
  return getDailyGoals(state).every((goal) => goal.complete);
}

function grantMilestones(state: FamilyFarmState): string[] {
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

  return rewards;
}

function withRewards(state: FamilyFarmState, baseMessage: string): FarmActionResult {
  const rewards = grantMilestones(state);
  const message = rewards.length ? `${baseMessage} · ${rewards.join(' · ')}` : baseMessage;
  state.lastMessage = message;
  return { state, message };
}

function claimDailyRewardInto(state: FamilyFarmState): string {
  if (state.daily.rewardClaimed) throw new FarmGameError('Today’s family reward is already claimed.');
  if (!dailyGoalsComplete(state)) throw new FarmGameError('Finish all daily family goals before claiming the reward.');

  const coins = 50 + Math.min(30, state.day * 2);
  state.daily.rewardClaimed = true;
  state.dailyStreak += 1;
  state.stats.dailyRewards += 1;
  state.coins += coins;
  state.inventory.seeds.strawberry += 1;
  state.hearts = Math.min(100, state.hearts + 4);
  addXp(state, 12);
  return `Daily family goals complete: +${coins} coins, +1 strawberry seed, +4 hearts`;
}

function forageResult(state: FamilyFarmState): { key: ForageResourceKey; quantity: number } {
  const sequence: ForageResourceKey[] = ['berries', 'wood', 'mushroom', 'berries', 'wood'];
  const key = sequence[(state.day + state.daily.foraged) % sequence.length];
  return {
    key,
    quantity: key === 'mushroom' ? 1 : 2,
  };
}

export function performFarmAction(current: FamilyFarmState, action: FarmAction): FarmActionResult {
  const state = cloneState(current);

  switch (action.type) {
    case 'plant': {
      const plot = findPlot(state, action.plotId);
      if (plot.cropKey) throw new FarmGameError('This plot is already planted.');
      if (!isCropKey(action.cropKey)) throw new FarmGameError('Unknown crop.');
      if (state.inventory.seeds[action.cropKey] <= 0) {
        throw new FarmGameError(`You do not have any ${CROP_CATALOG[action.cropKey].name} seeds.`);
      }

      spendAction(state, 1, 20);
      state.inventory.seeds[action.cropKey] -= 1;
      plot.cropKey = action.cropKey;
      plot.growthDays = 0;
      plot.watered = false;
      plot.plantedDay = state.day;
      state.stats.planted += 1;
      addXp(state, 2);
      return withRewards(state, `Planted ${CROP_CATALOG[action.cropKey].name}. Give it some water 💧`);
    }

    case 'water': {
      const plot = findPlot(state, action.plotId);
      if (!plot.cropKey) throw new FarmGameError('Plant something here before watering.');
      if (isPlotReady(plot)) throw new FarmGameError('This crop is ready to harvest.');
      if (plot.watered) throw new FarmGameError('This crop is already watered today.');

      spendAction(state, 1, 10);
      plot.watered = true;
      state.stats.watered += 1;
      state.daily.watered += 1;
      addXp(state, 1);
      return withRewards(state, 'Watered. It will grow when the day ends 💧');
    }

    case 'harvest': {
      const plot = findPlot(state, action.plotId);
      if (!plot.cropKey) throw new FarmGameError('There is nothing to harvest here.');
      if (!isPlotReady(plot)) throw new FarmGameError('This crop still needs more growing days.');

      spendAction(state, 2, 15);
      const crop = CROP_CATALOG[plot.cropKey];
      state.inventory.produce[crop.key] += crop.yield;
      state.stats.harvested += crop.yield;
      state.daily.harvested += crop.yield;
      addXp(state, crop.xp);
      plot.cropKey = null;
      plot.growthDays = 0;
      plot.watered = false;
      plot.plantedDay = null;
      return withRewards(state, `Harvested ${crop.yield} ${crop.name}${crop.yield > 1 ? 's' : ''} ${crop.emoji}`);
    }

    case 'buy_seed': {
      if (!isCropKey(action.cropKey)) throw new FarmGameError('Unknown crop.');
      const quantity = safeInt(action.quantity, 1, 1, 20);
      const crop = CROP_CATALOG[action.cropKey];
      const total = crop.seedCost * quantity;
      if (state.coins < total) throw new FarmGameError('Not enough coins for those seeds.');

      state.coins -= total;
      state.inventory.seeds[crop.key] += quantity;
      return withRewards(state, `Bought ${quantity} ${crop.name} seed${quantity > 1 ? 's' : ''}.`);
    }

    case 'sell': {
      if (!isCropKey(action.cropKey)) throw new FarmGameError('Unknown crop.');
      const crop = CROP_CATALOG[action.cropKey];
      const owned = state.inventory.produce[crop.key];
      if (owned <= 0) throw new FarmGameError(`You do not have any ${crop.name} to sell.`);
      const quantity = action.quantity === 'all'
        ? owned
        : Math.min(owned, safeInt(action.quantity, 1, 1, 99));
      const total = crop.sellPrice * quantity;

      state.inventory.produce[crop.key] -= quantity;
      state.coins += total;
      state.stats.sold += quantity;
      state.stats.earned += total;
      state.hearts = Math.min(100, state.hearts + Math.max(1, Math.floor(quantity / 3)));
      addXp(state, Math.max(1, quantity));
      return withRewards(state, `Sold ${quantity} ${crop.name}${quantity > 1 ? 's' : ''} for ${total} coins 🪙`);
    }

    case 'feed_chickens': {
      if (state.livestock.fedToday) throw new FarmGameError('The chickens have already been fed today.');
      spendAction(state, 1, 15);
      state.livestock.fedToday = true;
      state.hearts = Math.min(100, state.hearts + 1);
      addXp(state, 2);
      return withRewards(state, `Fed ${state.livestock.chickens} chicken${state.livestock.chickens === 1 ? '' : 's'} 🐔`);
    }

    case 'collect_eggs': {
      if (state.livestock.eggsAvailable <= 0) throw new FarmGameError('There are no eggs to collect yet. Feed the chickens and sleep first.');
      spendAction(state, 0, 10);
      const eggs = state.livestock.eggsAvailable;
      state.livestock.eggsAvailable = 0;
      state.inventory.resources.egg += eggs;
      state.stats.eggsCollected += eggs;
      addXp(state, eggs * 2);
      return withRewards(state, `Collected ${eggs} egg${eggs === 1 ? '' : 's'} 🥚`);
    }

    case 'buy_chicken': {
      const maxChickens = maxChickensForHome(state.homeLevel);
      if (state.livestock.chickens >= maxChickens) {
        throw new FarmGameError(`Upgrade your home before keeping more than ${maxChickens} chickens.`);
      }
      const cost = chickenCost(state.livestock.chickens);
      if (state.coins < cost) throw new FarmGameError(`You need ${cost} coins to adopt another chicken.`);
      spendAction(state, 0, 20);
      state.coins -= cost;
      state.livestock.chickens += 1;
      state.hearts = Math.min(100, state.hearts + 2);
      addXp(state, 10);
      return withRewards(state, `A new chicken joined the family coop 🐥 (${state.livestock.chickens}/${maxChickens})`);
    }

    case 'forage': {
      if (state.daily.forageCharges <= 0) throw new FarmGameError('You have explored everything nearby today. Try again tomorrow.');
      spendAction(state, 2, 30);
      const reward = forageResult(state);
      state.daily.forageCharges -= 1;
      state.daily.foraged += 1;
      state.inventory.resources[reward.key] += reward.quantity;
      state.stats.foraged += reward.quantity;
      addXp(state, 4);
      const resource = RESOURCE_CATALOG[reward.key];
      return withRewards(state, `Foraged ${reward.quantity} ${resource.name} ${resource.emoji}`);
    }

    case 'sell_resource': {
      if (!isResourceKey(action.resourceKey)) throw new FarmGameError('Unknown resource.');
      const resource = RESOURCE_CATALOG[action.resourceKey];
      const owned = state.inventory.resources[resource.key];
      if (owned <= 0) throw new FarmGameError(`You do not have any ${resource.name} to sell.`);
      const quantity = action.quantity === 'all'
        ? owned
        : Math.min(owned, safeInt(action.quantity, 1, 1, 99));
      const total = resource.sellPrice * quantity;
      state.inventory.resources[resource.key] -= quantity;
      state.coins += total;
      state.stats.sold += quantity;
      state.stats.earned += total;
      addXp(state, Math.max(1, quantity));
      return withRewards(state, `Sold ${quantity} ${resource.name} for ${total} coins 🪙`);
    }

    case 'family_time': {
      if (state.daily.familyTime) throw new FarmGameError('You already spent quality family time together today.');
      spendAction(state, 1, 45);
      state.daily.familyTime = true;
      state.stats.familyMoments += 1;
      state.hearts = Math.min(100, state.hearts + 4);
      addXp(state, 5);
      return withRewards(state, 'You shared a quiet family moment together 💛');
    }

    case 'claim_daily_reward': {
      const reward = claimDailyRewardInto(state);
      return withRewards(state, reward);
    }

    case 'end_day': {
      let grew = 0;
      const rainBonus = state.weather === 'rainy';
      let dailyRewardNote = '';

      if (dailyGoalsComplete(state) && !state.daily.rewardClaimed) {
        dailyRewardNote = ` ${claimDailyRewardInto(state)}.`;
      } else if (!dailyGoalsComplete(state) && !state.daily.rewardClaimed) {
        state.dailyStreak = 0;
      }

      for (const plot of state.plots) {
        if (!plot.cropKey || isPlotReady(plot)) {
          plot.watered = false;
          continue;
        }

        if (plot.watered || rainBonus) {
          plot.growthDays += 1;
          grew += 1;
        }
        plot.watered = false;
      }

      const newEggs = state.livestock.fedToday ? state.livestock.chickens : 0;
      state.livestock.eggsAvailable = Math.min(99, state.livestock.eggsAvailable + newEggs);
      state.livestock.fedToday = false;

      state.day += 1;
      state.weather = weatherForDay(state.day);
      state.timeMinutes = START_OF_DAY_MINUTES;
      state.energy = state.maxEnergy;
      state.hearts = Math.min(100, state.hearts + 1);
      state.daily = createDailyState();

      const weatherNote = rainBonus ? ' Rain helped every planted crop.' : '';
      const eggNote = newEggs > 0 ? ` The coop produced ${newEggs} egg${newEggs === 1 ? '' : 's'}.` : '';
      return withRewards(state, `Day ${state.day} begins. ${grew} crop${grew === 1 ? '' : 's'} grew.${weatherNote}${eggNote}${dailyRewardNote}`);
    }

    case 'upgrade_home': {
      if (state.homeLevel >= MAX_HOME_LEVEL) throw new FarmGameError('Your starter home is fully upgraded for this version.');
      const cost = homeUpgradeCost(state.homeLevel);
      if (state.coins < cost) throw new FarmGameError(`You need ${cost} coins to upgrade the home.`);

      state.coins -= cost;
      state.homeLevel += 1;
      state.hearts = Math.min(100, state.hearts + 8);
      addXp(state, 20);
      return withRewards(state, `Home upgraded to level ${state.homeLevel}. You can keep up to ${maxChickensForHome(state.homeLevel)} chickens 🏡`);
    }

    case 'rename_family': {
      state.familyName = sanitizeFamilyName(action.name);
      return withRewards(state, `Welcome to ${state.familyName} 💛`);
    }

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function normalizeCropCounts(raw: unknown, defaults: Record<CropKey, number>): Record<CropKey, number> {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    carrot: safeInt(record.carrot, defaults.carrot),
    lettuce: safeInt(record.lettuce, defaults.lettuce),
    tomato: safeInt(record.tomato, defaults.tomato),
    strawberry: safeInt(record.strawberry, defaults.strawberry),
  };
}

function normalizeResourceCounts(raw: unknown): Record<ResourceKey, number> {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    egg: safeInt(record.egg, 0),
    berries: safeInt(record.berries, 0),
    mushroom: safeInt(record.mushroom, 0),
    wood: safeInt(record.wood, 0),
  };
}

export function normalizeFamilyFarmState(raw: unknown, fallbackFamilyName = 'Our Family Farm'): FamilyFarmState {
  const fallback = createInitialFamilyFarmState(fallbackFamilyName);
  if (!raw || typeof raw !== 'object') return fallback;

  const source = raw as Partial<FamilyFarmState> & Record<string, unknown>;
  const sourceInventory = source.inventory && typeof source.inventory === 'object'
    ? source.inventory as Partial<FarmInventory>
    : {};

  const plotSource = Array.isArray(source.plots) ? source.plots : [];
  const plots = createPlots().map((fallbackPlot, index) => {
    const rawPlot = plotSource[index];
    if (!rawPlot || typeof rawPlot !== 'object') return fallbackPlot;
    const candidate = rawPlot as Partial<FarmPlot>;
    const cropKey = isCropKey(candidate.cropKey) ? candidate.cropKey : null;
    return {
      id: fallbackPlot.id,
      cropKey,
      growthDays: cropKey ? safeInt(candidate.growthDays, 0, 0, 30) : 0,
      watered: cropKey ? candidate.watered === true : false,
      plantedDay: cropKey ? safeInt(candidate.plantedDay, 1, 1, 999999) : null,
    };
  });

  const rawStats = source.stats && typeof source.stats === 'object' ? source.stats as Partial<FarmStats> : {};
  const rawMilestones = source.milestones && typeof source.milestones === 'object'
    ? source.milestones as Partial<FarmMilestones>
    : {};
  const rawLivestock = source.livestock && typeof source.livestock === 'object'
    ? source.livestock as Partial<FarmLivestock>
    : {};
  const rawDaily = source.daily && typeof source.daily === 'object'
    ? source.daily as Partial<FarmDailyState>
    : {};
  const defaults = blankInventory();
  const maxEnergy = safeInt(source.maxEnergy, fallback.maxEnergy, 10, 32);
  const homeLevel = safeInt(source.homeLevel, fallback.homeLevel, 1, MAX_HOME_LEVEL);

  return {
    schemaVersion: 2,
    day: safeInt(source.day, fallback.day, 1, 999999),
    season: 'spring',
    weather: ['sunny', 'cloudy', 'rainy', 'breezy'].includes(String(source.weather))
      ? source.weather as FarmWeather
      : weatherForDay(safeInt(source.day, fallback.day, 1, 999999)),
    timeMinutes: safeInt(source.timeMinutes, START_OF_DAY_MINUTES, START_OF_DAY_MINUTES, BEDTIME_MINUTES),
    coins: safeInt(source.coins, fallback.coins),
    energy: safeInt(source.energy, fallback.energy, 0, maxEnergy),
    maxEnergy,
    level: safeInt(source.level, fallback.level, 1, 999),
    xp: safeInt(source.xp, fallback.xp, 0, 999999),
    familyName: sanitizeFamilyName(typeof source.familyName === 'string' ? source.familyName : fallbackFamilyName),
    homeLevel,
    hearts: safeInt(source.hearts, fallback.hearts, 0, 100),
    dailyStreak: safeInt(source.dailyStreak, 0, 0, 9999),
    plots,
    inventory: {
      seeds: normalizeCropCounts(sourceInventory.seeds, defaults.seeds),
      produce: normalizeCropCounts(sourceInventory.produce, defaults.produce),
      resources: normalizeResourceCounts(sourceInventory.resources),
    },
    livestock: {
      chickens: safeInt(rawLivestock.chickens, fallback.livestock.chickens, 1, maxChickensForHome(homeLevel)),
      fedToday: rawLivestock.fedToday === true,
      eggsAvailable: safeInt(rawLivestock.eggsAvailable, 0, 0, 99),
    },
    daily: {
      watered: safeInt(rawDaily.watered, 0, 0, 999),
      harvested: safeInt(rawDaily.harvested, 0, 0, 999),
      foraged: safeInt(rawDaily.foraged, 0, 0, 3),
      familyTime: rawDaily.familyTime === true,
      rewardClaimed: rawDaily.rewardClaimed === true,
      forageCharges: safeInt(rawDaily.forageCharges, 3, 0, 3),
    },
    stats: {
      planted: safeInt(rawStats.planted, 0),
      watered: safeInt(rawStats.watered, 0),
      harvested: safeInt(rawStats.harvested, 0),
      sold: safeInt(rawStats.sold, 0),
      earned: safeInt(rawStats.earned, 0),
      eggsCollected: safeInt(rawStats.eggsCollected, 0),
      foraged: safeInt(rawStats.foraged, 0),
      familyMoments: safeInt(rawStats.familyMoments, 0),
      dailyRewards: safeInt(rawStats.dailyRewards, 0),
    },
    milestones: {
      plantedThree: rawMilestones.plantedThree === true,
      wateredThree: rawMilestones.wateredThree === true,
      firstHarvest: rawMilestones.firstHarvest === true,
      firstEgg: rawMilestones.firstEgg === true,
      forageFive: rawMilestones.forageFive === true,
    },
    lastMessage: typeof source.lastMessage === 'string' && source.lastMessage.trim()
      ? source.lastMessage.slice(0, 240)
      : fallback.lastMessage,
  };
}
