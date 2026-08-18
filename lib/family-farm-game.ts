export const CROP_KEYS = ['carrot', 'lettuce', 'tomato', 'strawberry'] as const;

export type CropKey = (typeof CROP_KEYS)[number];
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
};

export type FarmStats = {
  planted: number;
  watered: number;
  harvested: number;
  sold: number;
  earned: number;
};

export type FarmMilestones = {
  plantedThree: boolean;
  wateredThree: boolean;
  firstHarvest: boolean;
};

export type FamilyFarmState = {
  schemaVersion: 1;
  day: number;
  season: 'spring';
  weather: FarmWeather;
  coins: number;
  energy: number;
  maxEnergy: number;
  level: number;
  xp: number;
  familyName: string;
  homeLevel: number;
  hearts: number;
  plots: FarmPlot[];
  inventory: FarmInventory;
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
  | { type: 'end_day' }
  | { type: 'upgrade_home' }
  | { type: 'rename_family'; name: string };

export type FarmActionResult = {
  state: FamilyFarmState;
  message: string;
};

export class FarmGameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FarmGameError';
  }
}

const DEFAULT_PLOT_COUNT = 20;
const MAX_HOME_LEVEL = 4;

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

export function weatherForDay(day: number): FarmWeather {
  const cycle: FarmWeather[] = ['sunny', 'sunny', 'cloudy', 'breezy', 'rainy', 'sunny'];
  return cycle[Math.abs(day - 1) % cycle.length];
}

export function createInitialFamilyFarmState(familyName = 'Our Family Farm'): FamilyFarmState {
  return {
    schemaVersion: 1,
    day: 1,
    season: 'spring',
    weather: weatherForDay(1),
    coins: 120,
    energy: 20,
    maxEnergy: 20,
    level: 1,
    xp: 0,
    familyName: sanitizeFamilyName(familyName),
    homeLevel: 1,
    hearts: 20,
    plots: createPlots(),
    inventory: blankInventory(),
    stats: {
      planted: 0,
      watered: 0,
      harvested: 0,
      sold: 0,
      earned: 0,
    },
    milestones: {
      plantedThree: false,
      wateredThree: false,
      firstHarvest: false,
    },
    lastMessage: 'Welcome home. Plant your first vegetable 🌱',
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

function cloneState(state: FamilyFarmState): FamilyFarmState {
  return {
    ...state,
    plots: state.plots.map((plot) => ({ ...plot })),
    inventory: {
      seeds: { ...state.inventory.seeds },
      produce: { ...state.inventory.produce },
    },
    stats: { ...state.stats },
    milestones: { ...state.milestones },
  };
}

function findPlot(state: FamilyFarmState, plotId: string): FarmPlot {
  const plot = state.plots.find((candidate) => candidate.id === plotId);
  if (!plot) throw new FarmGameError('That garden plot does not exist.');
  return plot;
}

function spendEnergy(state: FamilyFarmState, amount: number) {
  if (state.energy < amount) {
    throw new FarmGameError('You are out of energy. End the day to rest.');
  }
  state.energy -= amount;
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

function grantMilestones(state: FamilyFarmState): string[] {
  const rewards: string[] = [];

  if (!state.milestones.plantedThree && state.stats.planted >= 3) {
    state.milestones.plantedThree = true;
    state.coins += 30;
    state.inventory.seeds.tomato += 2;
    rewards.push('Starter planter complete: +30 coins and 2 tomato seeds');
  }

  if (!state.milestones.wateredThree && state.stats.watered >= 3) {
    state.milestones.wateredThree = true;
    state.coins += 25;
    state.inventory.seeds.strawberry += 1;
    rewards.push('Watering routine complete: +25 coins and 1 strawberry seed');
  }

  if (!state.milestones.firstHarvest && state.stats.harvested >= 1) {
    state.milestones.firstHarvest = true;
    state.coins += 60;
    state.hearts = Math.min(100, state.hearts + 3);
    rewards.push('First harvest complete: +60 coins and +3 family hearts');
  }

  return rewards;
}

function withRewards(state: FamilyFarmState, baseMessage: string): FarmActionResult {
  const rewards = grantMilestones(state);
  const message = rewards.length ? `${baseMessage} · ${rewards.join(' · ')}` : baseMessage;
  state.lastMessage = message;
  return { state, message };
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

      spendEnergy(state, 1);
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

      spendEnergy(state, 1);
      plot.watered = true;
      state.stats.watered += 1;
      addXp(state, 1);
      return withRewards(state, 'Watered. It will grow when the day ends 💧');
    }

    case 'harvest': {
      const plot = findPlot(state, action.plotId);
      if (!plot.cropKey) throw new FarmGameError('There is nothing to harvest here.');
      if (!isPlotReady(plot)) throw new FarmGameError('This crop still needs more growing days.');

      spendEnergy(state, 2);
      const crop = CROP_CATALOG[plot.cropKey];
      state.inventory.produce[crop.key] += crop.yield;
      state.stats.harvested += crop.yield;
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

    case 'end_day': {
      let grew = 0;
      const rainBonus = state.weather === 'rainy';

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

      state.day += 1;
      state.weather = weatherForDay(state.day);
      state.energy = state.maxEnergy;
      state.hearts = Math.min(100, state.hearts + 1);
      const weatherNote = rainBonus ? ' Rain helped every planted crop.' : '';
      return withRewards(state, `Day ${state.day} begins. ${grew} crop${grew === 1 ? '' : 's'} grew.${weatherNote}`);
    }

    case 'upgrade_home': {
      if (state.homeLevel >= MAX_HOME_LEVEL) throw new FarmGameError('Your starter home is fully upgraded for this version.');
      const cost = homeUpgradeCost(state.homeLevel);
      if (state.coins < cost) throw new FarmGameError(`You need ${cost} coins to upgrade the home.`);

      state.coins -= cost;
      state.homeLevel += 1;
      state.hearts = Math.min(100, state.hearts + 8);
      addXp(state, 20);
      return withRewards(state, `Home upgraded to level ${state.homeLevel}. Your family feels closer 🏡`);
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
  const defaults = blankInventory();
  const maxEnergy = safeInt(source.maxEnergy, fallback.maxEnergy, 10, 32);

  return {
    schemaVersion: 1,
    day: safeInt(source.day, fallback.day, 1, 999999),
    season: 'spring',
    weather: ['sunny', 'cloudy', 'rainy', 'breezy'].includes(String(source.weather))
      ? source.weather as FarmWeather
      : weatherForDay(safeInt(source.day, fallback.day, 1, 999999)),
    coins: safeInt(source.coins, fallback.coins),
    energy: safeInt(source.energy, fallback.energy, 0, maxEnergy),
    maxEnergy,
    level: safeInt(source.level, fallback.level, 1, 999),
    xp: safeInt(source.xp, fallback.xp, 0, 999999),
    familyName: sanitizeFamilyName(typeof source.familyName === 'string' ? source.familyName : fallbackFamilyName),
    homeLevel: safeInt(source.homeLevel, fallback.homeLevel, 1, MAX_HOME_LEVEL),
    hearts: safeInt(source.hearts, fallback.hearts, 0, 100),
    plots,
    inventory: {
      seeds: normalizeCropCounts(sourceInventory.seeds, defaults.seeds),
      produce: normalizeCropCounts(sourceInventory.produce, defaults.produce),
    },
    stats: {
      planted: safeInt(rawStats.planted, 0),
      watered: safeInt(rawStats.watered, 0),
      harvested: safeInt(rawStats.harvested, 0),
      sold: safeInt(rawStats.sold, 0),
      earned: safeInt(rawStats.earned, 0),
    },
    milestones: {
      plantedThree: rawMilestones.plantedThree === true,
      wateredThree: rawMilestones.wateredThree === true,
      firstHarvest: rawMilestones.firstHarvest === true,
    },
    lastMessage: typeof source.lastMessage === 'string' && source.lastMessage.trim()
      ? source.lastMessage.slice(0, 240)
      : fallback.lastMessage,
  };
}
