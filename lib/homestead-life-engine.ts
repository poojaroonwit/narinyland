import { BEDTIME_MINUTES, FarmGameError } from './family-farm-game';
import {
  normalizeProgressionFarmState,
  performProgressionFarmAction,
  seasonForDay,
  type ProgressionFamilyFarmState,
  type ProgressionFarmAction,
} from './family-farm-progression';
import {
  canUpgradeBuilding,
  getBuildingUpgradeCost,
  type BuildingTier,
  type ProgressionBuildingKey,
} from './building-progression';
import {
  canCompleteGrowingTogether,
  canWelcomeChild,
} from './family-life';
import {
  advanceHomesteadAnimalsForNewDay,
  isPetKind,
  normalizeHomesteadAnimalsState,
  type HomesteadAnimalsState,
  type PetKind,
} from './homestead-animals';
import {
  createCurrentHomesteadEvent,
  getHomesteadEventDefinition,
  normalizeHomesteadEventState,
  seasonalOccurrenceKey,
  selectHomesteadEvent,
  type HomesteadEventResourceKey,
  type HomesteadEventState,
} from './homestead-events';

export type HomesteadLifeState = Omit<ProgressionFamilyFarmState, 'inventory'> & {
  animals: HomesteadAnimalsState;
  events: HomesteadEventState;
  inventory: Omit<ProgressionFamilyFarmState['inventory'], 'resources'> & {
    resources: ProgressionFamilyFarmState['inventory']['resources'] & {
      milk: number;
      wool: number;
    };
  };
};

export type HomesteadLifeAction =
  | ProgressionFarmAction
  | { type: 'upgrade_building'; buildingKey: ProgressionBuildingKey }
  | { type: 'buy_cow' }
  | { type: 'feed_cow' }
  | { type: 'collect_milk' }
  | { type: 'buy_sheep' }
  | { type: 'care_sheep' }
  | { type: 'collect_wool' }
  | { type: 'choose_pet'; petKind: PetKind }
  | { type: 'pet_time' }
  | { type: 'resolve_event'; choiceKey: string };

export type HomesteadLifeActionResult = {
  state: HomesteadLifeState;
  message: string;
};

const COW_COST = 300;
const SHEEP_COST = 250;
const PET_HEARTS_REQUIRED = 50;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function normalizeHomesteadLifeState(raw: unknown): HomesteadLifeState {
  const base = normalizeProgressionFarmState(raw);
  const source = asRecord(raw);
  const inventory = asRecord(source.inventory);
  const resources = asRecord(inventory.resources);

  return {
    ...base,
    inventory: {
      ...base.inventory,
      resources: {
        ...base.inventory.resources,
        milk: safeCount(resources.milk),
        wool: safeCount(resources.wool),
      },
    },
    animals: normalizeHomesteadAnimalsState(source.animals),
    events: normalizeHomesteadEventState(source.events),
  };
}

function finish(state: HomesteadLifeState, message: string): HomesteadLifeActionResult {
  state.lastMessage = message;
  return { state, message };
}

function preserveHomesteadState(
  result: { state: ProgressionFamilyFarmState; message: string },
  previous: HomesteadLifeState,
  animals = previous.animals,
  events = previous.events,
): HomesteadLifeActionResult {
  return {
    message: result.message,
    state: normalizeHomesteadLifeState({
      ...result.state,
      inventory: {
        ...result.state.inventory,
        resources: {
          ...result.state.inventory.resources,
          milk: previous.inventory.resources.milk,
          wool: previous.inventory.resources.wool,
        },
      },
      animals,
      events,
    }),
  };
}

function spendHomesteadAction(state: HomesteadLifeState, energy: number, minutes: number) {
  if (state.energy < energy) {
    throw new FarmGameError('You are out of energy. Go home and sleep to start a new day.');
  }
  if (state.timeMinutes + minutes > BEDTIME_MINUTES) {
    throw new FarmGameError('It is too late for that today. Go home and sleep.');
  }
  state.energy -= energy;
  state.timeMinutes += minutes;
}

function selectEventForCurrentDay(state: HomesteadLifeState) {
  if (state.events.current && !state.events.current.resolved) return;

  const definition = selectHomesteadEvent({
    day: state.day,
    season: state.season,
    weather: state.weather,
    hasPet: !!state.animals.pet.kind,
    hasChild: state.family.stage === 'child',
    growingTogetherEligible: canCompleteGrowingTogether({
      hearts: state.hearts,
      homeTier: state.buildingTiers.home,
      family: state.family,
    }),
    resolvedDailyDays: state.events.resolvedDailyDays,
    seasonalOccurrences: state.events.seasonalOccurrences,
  });

  state.events.current = definition ? createCurrentHomesteadEvent(state.day, definition) : null;
}

function applyEventReward(
  state: HomesteadLifeState,
  reward: {
    hearts?: number;
    coins?: number;
    energy?: number;
    resources?: Partial<Record<HomesteadEventResourceKey, number>>;
  },
) {
  if (reward.hearts) state.hearts = Math.min(100, state.hearts + Math.max(0, reward.hearts));
  if (reward.coins) state.coins += Math.max(0, reward.coins);
  if (reward.energy) state.energy = Math.min(state.maxEnergy, state.energy + Math.max(0, reward.energy));
  if (reward.resources) {
    for (const [key, amount] of Object.entries(reward.resources) as Array<[HomesteadEventResourceKey, number]>) {
      state.inventory.resources[key] += Math.max(0, amount);
    }
  }
}

function resolveCurrentEvent(state: HomesteadLifeState, choiceKey: string): HomesteadLifeActionResult {
  const current = state.events.current;
  if (!current) throw new FarmGameError('There is no homestead event to resolve.');
  if (current.resolved) throw new FarmGameError('That homestead event is already resolved.');

  const definition = getHomesteadEventDefinition(current.key);
  if (!definition) throw new FarmGameError('That homestead event no longer exists.');
  const choice = definition.choices.find((candidate) => candidate.key === choiceKey);
  if (!choice) throw new FarmGameError('That event choice is not available.');

  applyEventReward(state, choice.reward);
  current.resolved = true;
  current.choiceKey = choice.key;

  if (current.kind === 'daily' && !state.events.resolvedDailyDays.includes(current.day)) {
    state.events.resolvedDailyDays.push(current.day);
    state.events.resolvedDailyDays.sort((a, b) => a - b);
  }

  if (current.kind === 'seasonal') {
    const season = seasonForDay(current.day);
    state.events.seasonalOccurrences[seasonalOccurrenceKey(current.day, season)] = true;
  }

  if (current.key === 'growing_together') {
    state.family.milestones.growingTogether = true;
    if (canWelcomeChild({ hearts: state.hearts, homeTier: state.buildingTiers.home, family: state.family })) {
      state.family.stage = 'child';
    }
  }

  return finish(state, `${definition.title} · ${choice.label}`);
}

export function performHomesteadLifeAction(
  current: ProgressionFamilyFarmState | HomesteadLifeState,
  action: HomesteadLifeAction,
): HomesteadLifeActionResult {
  const state = normalizeHomesteadLifeState(current);

  switch (action.type) {
    case 'upgrade_building': {
      if (action.buildingKey === 'home') {
        const result = performProgressionFarmAction(state, { type: 'upgrade_home' });
        return preserveHomesteadState(result, state);
      }

      const currentTier = state.buildingTiers[action.buildingKey] as BuildingTier;
      if (!canUpgradeBuilding(action.buildingKey, currentTier)) {
        throw new FarmGameError(`${action.buildingKey} is already at the maximum Tier 3.`);
      }

      const cost = getBuildingUpgradeCost(action.buildingKey, currentTier);
      if (state.coins < cost) {
        throw new FarmGameError(`Not enough coins to upgrade ${action.buildingKey}.`);
      }

      const nextTier = (currentTier + 1) as BuildingTier;
      state.coins -= cost;
      state.buildingTiers = {
        ...state.buildingTiers,
        [action.buildingKey]: nextTier,
      };
      return finish(state, `Upgraded ${action.buildingKey} to Tier ${nextTier} for ${cost} coins.`);
    }
    case 'buy_cow': {
      if (state.buildingTiers.barn < 2) throw new FarmGameError('Upgrade the Barn to Tier 2 before welcoming a cow.');
      if (state.animals.cow.owned) throw new FarmGameError('You already have a cow.');
      if (state.coins < COW_COST) throw new FarmGameError('Not enough coins to welcome a cow.');
      state.coins -= COW_COST;
      state.animals.cow.owned = true;
      return finish(state, `A cow joined the homestead for ${COW_COST} coins 🐄`);
    }
    case 'feed_cow': {
      if (!state.animals.cow.owned) throw new FarmGameError('Welcome a cow before feeding it.');
      if (state.animals.cow.fedDay === state.day) throw new FarmGameError('The cow was already fed today.');
      spendHomesteadAction(state, 1, 10);
      state.animals.cow.fedDay = state.day;
      state.daily.animalCare = true;
      return finish(state, 'Fed the cow for the day 🐄');
    }
    case 'collect_milk': {
      if (!state.animals.cow.owned) throw new FarmGameError('There is no cow to milk.');
      if (!state.animals.cow.milkReady) throw new FarmGameError('Milk is not ready yet.');
      state.inventory.resources.milk += 1;
      state.animals.cow.milkReady = false;
      state.animals.cow.milkCollectedDay = state.day;
      return finish(state, 'Collected fresh milk 🥛');
    }
    case 'buy_sheep': {
      if (state.buildingTiers.barn < 3) throw new FarmGameError('Upgrade the Barn to Tier 3 before welcoming a sheep.');
      if (state.animals.sheep.owned) throw new FarmGameError('You already have a sheep.');
      if (state.coins < SHEEP_COST) throw new FarmGameError('Not enough coins to welcome a sheep.');
      state.coins -= SHEEP_COST;
      state.animals.sheep.owned = true;
      return finish(state, `A sheep joined the homestead for ${SHEEP_COST} coins 🐑`);
    }
    case 'care_sheep': {
      if (!state.animals.sheep.owned) throw new FarmGameError('Welcome a sheep before caring for it.');
      if (state.animals.sheep.woolReady) throw new FarmGameError('Wool is ready. Collect it before more care.');
      if (state.animals.sheep.caredDay === state.day) throw new FarmGameError('The sheep was already cared for today.');
      spendHomesteadAction(state, 1, 10);
      state.animals.sheep.caredDay = state.day;
      state.daily.animalCare = true;
      return finish(state, 'Cared for the sheep today 🐑');
    }
    case 'collect_wool': {
      if (!state.animals.sheep.owned) throw new FarmGameError('There is no sheep to shear.');
      if (!state.animals.sheep.woolReady) throw new FarmGameError('Wool is not ready yet.');
      state.inventory.resources.wool += 1;
      state.animals.sheep.woolReady = false;
      state.animals.sheep.caredProgress = 0;
      return finish(state, 'Collected soft wool 🧶');
    }
    case 'choose_pet': {
      if (state.buildingTiers.home < 2 || state.hearts < PET_HEARTS_REQUIRED) {
        throw new FarmGameError(`Reach Home Tier 2 and ${PET_HEARTS_REQUIRED} Hearts before choosing a pet.`);
      }
      if (state.animals.pet.kind) throw new FarmGameError('Your pet has already been chosen permanently.');
      if (!isPetKind(action.petKind)) throw new FarmGameError('Choose a cat or dog.');
      state.animals.pet.kind = action.petKind;
      return finish(state, `A ${action.petKind} joined the family 🐾`);
    }
    case 'pet_time': {
      if (!state.animals.pet.kind) throw new FarmGameError('Choose a family pet first.');
      if (state.animals.pet.interactedDay === state.day) throw new FarmGameError('You already spent pet time today.');
      spendHomesteadAction(state, 0, 10);
      state.animals.pet.interactedDay = state.day;
      state.hearts = Math.min(100, state.hearts + 1);
      return finish(state, `Spent time with the ${state.animals.pet.kind} · +1 Heart 🐾`);
    }
    case 'resolve_event': {
      return resolveCurrentEvent(state, action.choiceKey);
    }
    case 'end_day': {
      const result = performProgressionFarmAction(state, action);
      const animals = advanceHomesteadAnimalsForNewDay(state.animals, state.day);
      const next = preserveHomesteadState(result, state, animals).state;
      selectEventForCurrentDay(next);
      return finish(next, result.message);
    }
    default: {
      const result = performProgressionFarmAction(state, action as ProgressionFarmAction);
      return preserveHomesteadState(result, state);
    }
  }
}
