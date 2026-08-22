import { BEDTIME_MINUTES, FarmGameError } from './family-farm-game';
import {
  normalizeProgressionFarmState,
  performProgressionFarmAction,
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
  advanceHomesteadAnimalsForNewDay,
  isPetKind,
  normalizeHomesteadAnimalsState,
  type HomesteadAnimalsState,
  type PetKind,
} from './homestead-animals';

export type HomesteadLifeState = Omit<ProgressionFamilyFarmState, 'inventory'> & {
  animals: HomesteadAnimalsState;
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
  | { type: 'pet_time' };

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
    case 'end_day': {
      const result = performProgressionFarmAction(state, action);
      const animals = advanceHomesteadAnimalsForNewDay(state.animals, state.day);
      return preserveHomesteadState(result, state, animals);
    }
    default: {
      const result = performProgressionFarmAction(state, action as ProgressionFarmAction);
      return preserveHomesteadState(result, state);
    }
  }
}
