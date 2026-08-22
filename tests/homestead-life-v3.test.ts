import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createInitialProgressionFarmState,
  normalizeProgressionFarmState,
  type ProgressionFamilyFarmState,
} from '../lib/family-farm-progression';
import { normalizeHomesteadLifeState, performHomesteadLifeAction } from '../lib/homestead-life-engine';

type V5FamilyShape = {
  schemaVersion: number;
  homeLevel: number;
  hearts: number;
  coins: number;
  family?: {
    stage?: 'partners' | 'child';
    milestones?: { growingTogether?: boolean };
  };
  buildingTiers?: {
    home?: number;
    barn?: number;
    workshop?: number;
    storage?: number;
  };
};

type AnimalStateShape = ProgressionFamilyFarmState & {
  animals?: {
    cow: { owned: boolean; fedDay: number | null; milkReady: boolean; milkCollectedDay: number | null };
    sheep: { owned: boolean; caredDay: number | null; caredProgress: number; woolReady: boolean };
    pet: { kind: 'cat' | 'dog' | null; interactedDay: number | null };
  };
  inventory: ProgressionFamilyFarmState['inventory'] & {
    resources: ProgressionFamilyFarmState['inventory']['resources'] & { milk?: number; wool?: number };
  };
};

function animalState(state: ProgressionFamilyFarmState): AnimalStateShape {
  return state as AnimalStateShape;
}

test('Homestead Life v3 starts with two partners and deterministic building tier defaults', () => {
  const state = createInitialProgressionFarmState() as unknown as V5FamilyShape;

  assert.equal(state.schemaVersion, 5);
  assert.equal(state.family?.stage, 'partners');
  assert.equal(state.family?.milestones?.growingTogether, false);
  assert.deepEqual(state.buildingTiers, { home: 1, barn: 1, workshop: 1, storage: 1 });
});

test('v4 normalization preserves Home and Hearts while adding v5 family state', () => {
  const state = normalizeProgressionFarmState({
    schemaVersion: 4,
    day: 12,
    homeLevel: 2,
    hearts: 75,
    coins: 333,
    inventory: {
      seeds: { carrot: 2, lettuce: 1, tomato: 1, strawberry: 0, corn: 3, pumpkin: 0, potato: 0, cabbage: 0 },
      produce: { carrot: 4, lettuce: 0, tomato: 0, strawberry: 0, corn: 1, pumpkin: 0, potato: 0, cabbage: 0 },
      resources: { egg: 1, berries: 2, mushroom: 1, wood: 8, fish: 0 },
    },
  }) as unknown as V5FamilyShape;

  assert.equal(state.schemaVersion, 5);
  assert.equal(state.homeLevel, 2);
  assert.equal(state.hearts, 75);
  assert.equal(state.family?.stage, 'partners');
  assert.equal(state.family?.milestones?.growingTogether, false);
  assert.deepEqual(state.buildingTiers, { home: 2, barn: 1, workshop: 1, storage: 1 });
});

test('building upgrades charge Coins, advance one tier, and cap at Tier 3', () => {
  let state = { ...createInitialProgressionFarmState(), coins: 5000 };
  const beforeCoins = state.coins;

  state = performHomesteadLifeAction(state, { type: 'upgrade_building', buildingKey: 'barn' }).state;
  assert.equal(state.buildingTiers.barn, 2);
  assert.ok(state.coins < beforeCoins, 'upgrading must cost Coins');

  state = performHomesteadLifeAction(state, { type: 'upgrade_building', buildingKey: 'barn' }).state;
  assert.equal(state.buildingTiers.barn, 3);
  assert.throws(
    () => performHomesteadLifeAction(state, { type: 'upgrade_building', buildingKey: 'barn' }),
    /tier 3|maximum|max/i,
  );
});

test('Home building upgrade keeps legacy homeLevel synchronized', () => {
  const state = { ...createInitialProgressionFarmState(), coins: 5000 };
  const result = performHomesteadLifeAction(state, { type: 'upgrade_building', buildingKey: 'home' });

  assert.equal(result.state.homeLevel, 2);
  assert.equal(result.state.buildingTiers.home, 2);
});

test('v5 animal defaults add cow sheep pet plus milk and wool without losing base resources', () => {
  const state = animalState(normalizeHomesteadLifeState({
    schemaVersion: 4,
    inventory: { resources: { egg: 2, berries: 3, mushroom: 1, wood: 9, fish: 4 } },
  }));

  assert.deepEqual(state.animals, {
    cow: { owned: false, fedDay: null, milkReady: false, milkCollectedDay: null },
    sheep: { owned: false, caredDay: null, caredProgress: 0, woolReady: false },
    pet: { kind: null, interactedDay: null },
  });
  assert.equal(state.inventory.resources.egg, 2);
  assert.equal(state.inventory.resources.wood, 9);
  assert.equal(state.inventory.resources.milk, 0);
  assert.equal(state.inventory.resources.wool, 0);
});

test('cow requires Barn Tier 2, feeds once per day, and yields one next-day milk collection', () => {
  let state = { ...createInitialProgressionFarmState(), coins: 5000 };
  assert.throws(() => performHomesteadLifeAction(state, { type: 'buy_cow' }), /barn.*tier 2|tier 2.*barn/i);

  state = { ...state, buildingTiers: { ...state.buildingTiers, barn: 2 } };
  state = performHomesteadLifeAction(state, { type: 'buy_cow' }).state;
  assert.equal(animalState(state).animals?.cow.owned, true);

  state = performHomesteadLifeAction(state, { type: 'feed_cow' }).state;
  assert.equal(animalState(state).animals?.cow.fedDay, state.day);
  assert.throws(() => performHomesteadLifeAction(state, { type: 'feed_cow' }), /already.*fed|fed.*today/i);

  state = performHomesteadLifeAction(state, { type: 'end_day' }).state;
  assert.equal(animalState(state).animals?.cow.milkReady, true);
  const beforeMilk = animalState(state).inventory.resources.milk ?? 0;
  state = performHomesteadLifeAction(state, { type: 'collect_milk' }).state;
  assert.equal(animalState(state).inventory.resources.milk, beforeMilk + 1);
  assert.throws(() => performHomesteadLifeAction(state, { type: 'collect_milk' }), /milk.*not ready|already.*milk/i);
});

test('sheep requires Barn Tier 3 and wool becomes ready after two cared-for days', () => {
  let state = {
    ...createInitialProgressionFarmState(),
    coins: 5000,
    buildingTiers: { home: 1 as const, barn: 3 as const, workshop: 1 as const, storage: 1 as const },
  };
  state = performHomesteadLifeAction(state, { type: 'buy_sheep' }).state;

  state = performHomesteadLifeAction(state, { type: 'care_sheep' }).state;
  state = performHomesteadLifeAction(state, { type: 'end_day' }).state;
  assert.equal(animalState(state).animals?.sheep.caredProgress, 1);
  assert.equal(animalState(state).animals?.sheep.woolReady, false);

  state = performHomesteadLifeAction(state, { type: 'care_sheep' }).state;
  state = performHomesteadLifeAction(state, { type: 'end_day' }).state;
  assert.equal(animalState(state).animals?.sheep.woolReady, true);

  const beforeWool = animalState(state).inventory.resources.wool ?? 0;
  state = performHomesteadLifeAction(state, { type: 'collect_wool' }).state;
  assert.equal(animalState(state).inventory.resources.wool, beforeWool + 1);
  assert.equal(animalState(state).animals?.sheep.caredProgress, 0);
  assert.equal(animalState(state).animals?.sheep.woolReady, false);
});

test('pet choice is permanent after Home Tier 2 plus 50 Hearts and pet time grants one Heart per day', () => {
  let state = {
    ...createInitialProgressionFarmState(),
    hearts: 50,
    buildingTiers: { home: 2 as const, barn: 1 as const, workshop: 1 as const, storage: 1 as const },
    homeLevel: 2,
  };
  state = performHomesteadLifeAction(state, { type: 'choose_pet', petKind: 'cat' }).state;
  assert.equal(animalState(state).animals?.pet.kind, 'cat');
  assert.throws(() => performHomesteadLifeAction(state, { type: 'choose_pet', petKind: 'dog' }), /already.*pet|permanent|chosen/i);

  const beforeHearts = state.hearts;
  state = performHomesteadLifeAction(state, { type: 'pet_time' }).state;
  assert.equal(state.hearts, Math.min(100, beforeHearts + 1));
  assert.throws(() => performHomesteadLifeAction(state, { type: 'pet_time' }), /already.*today|pet.*today/i);
});
