// Progression v3 contracts intentionally land before production implementation.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PROGRESSION_CROP_CATALOG,
  createInitialProgressionFarmState,
  getHomesteadJourney,
  getNextLevelUnlock,
  normalizeProgressionFarmState,
  performProgressionFarmAction,
  seasonForDay,
  weatherForProgressionDay,
  type ProgressionFamilyFarmState,
} from '../lib/family-farm-progression';

test('four-season year uses stable seven-day seasons and repeats every 28 days', () => {
  assert.equal(seasonForDay(1), 'spring');
  assert.equal(seasonForDay(7), 'spring');
  assert.equal(seasonForDay(8), 'summer');
  assert.equal(seasonForDay(14), 'summer');
  assert.equal(seasonForDay(15), 'autumn');
  assert.equal(seasonForDay(21), 'autumn');
  assert.equal(seasonForDay(22), 'winter');
  assert.equal(seasonForDay(28), 'winter');
  assert.equal(seasonForDay(29), 'spring');
  assert.notEqual(weatherForProgressionDay(1), undefined);
  assert.notEqual(weatherForProgressionDay(8), undefined);
});

test('v3 saves normalize into schema v5 without losing valid progress', () => {
  const migrated = normalizeProgressionFarmState({
    schemaVersion: 3,
    day: 9,
    season: 'spring',
    coins: 777,
    energy: 13,
    maxEnergy: 24,
    level: 4,
    xp: 23,
    familyName: 'Mango Home',
    homeLevel: 2,
    hearts: 44,
    dailyStreak: 3,
    inventory: {
      seeds: { carrot: 3, lettuce: 2, tomato: 1, strawberry: 0 },
      produce: { carrot: 5, lettuce: 0, tomato: 2, strawberry: 0 },
      resources: { egg: 1, berries: 2, mushroom: 3, wood: 11, fish: 1 },
    },
  });
  const v5 = migrated as unknown as {
    schemaVersion: number;
    family?: { stage?: string; milestones?: { growingTogether?: boolean } };
    buildingTiers?: { home?: number; barn?: number; workshop?: number; storage?: number };
  };

  assert.equal(v5.schemaVersion, 5);
  assert.equal(migrated.day, 9);
  assert.equal(migrated.season, 'summer');
  assert.equal(migrated.coins, 777);
  assert.equal(migrated.familyName, 'Mango Home');
  assert.equal(migrated.inventory.seeds.carrot, 3);
  assert.equal(migrated.inventory.seeds.corn, 0);
  assert.equal(migrated.workshopUpgrades.market_crate, false);
  assert.equal(migrated.stats.seasonsCompleted, 0);
  assert.equal(v5.family?.stage, 'partners');
  assert.equal(v5.family?.milestones?.growingTogether, false);
  assert.deepEqual(v5.buildingTiers, { home: 2, barn: 1, workshop: 1, storage: 1 });
});

test('v4 saves migrate to v5 with deterministic family defaults and preserve v4 progression', () => {
  const migrated = normalizeProgressionFarmState({
    schemaVersion: 4,
    day: 18,
    coins: 640,
    hearts: 76,
    homeLevel: 2,
    level: 5,
    inventory: {
      seeds: { carrot: 1, lettuce: 2, tomato: 3, strawberry: 4, corn: 5, pumpkin: 6, potato: 7, cabbage: 8 },
      produce: { carrot: 8, lettuce: 7, tomato: 6, strawberry: 5, corn: 4, pumpkin: 3, potato: 2, cabbage: 1 },
      resources: { egg: 2, berries: 3, mushroom: 4, wood: 20, fish: 5 },
    },
    workshopUpgrades: { sturdy_watering_can: true, market_crate: true, cozy_basket: false },
    journey: { harvest_10: true, home_level_2: true, first_craft: true, first_season: false, hearts_50: true },
  });
  const v5 = migrated as unknown as {
    schemaVersion: number;
    family?: { stage?: string; milestones?: { growingTogether?: boolean } };
    buildingTiers?: { home?: number; barn?: number; workshop?: number; storage?: number };
  };

  assert.equal(v5.schemaVersion, 5);
  assert.equal(migrated.day, 18);
  assert.equal(migrated.coins, 640);
  assert.equal(migrated.hearts, 76);
  assert.equal(migrated.inventory.seeds.pumpkin, 6);
  assert.equal(migrated.inventory.produce.cabbage, 1);
  assert.equal(migrated.inventory.resources.wood, 20);
  assert.equal(migrated.workshopUpgrades.market_crate, true);
  assert.equal(migrated.journey.first_craft, true);
  assert.equal(v5.family?.stage, 'partners');
  assert.equal(v5.family?.milestones?.growingTogether, false);
  assert.deepEqual(v5.buildingTiers, { home: 2, barn: 1, workshop: 1, storage: 1 });
});

test('initial progression state starts with two partners in schema v5', () => {
  const initial = createInitialProgressionFarmState() as unknown as {
    schemaVersion: number;
    family?: { stage?: string; milestones?: { growingTogether?: boolean } };
  };

  assert.equal(initial.schemaVersion, 5);
  assert.equal(initial.family?.stage, 'partners');
  assert.equal(initial.family?.milestones?.growingTogether, false);
});

test('crop progression enforces level and season while bonus season adds yield', () => {
  let state = createInitialProgressionFarmState();
  assert.equal(PROGRESSION_CROP_CATALOG.tomato.minLevel, 2);
  assert.throws(() => performProgressionFarmAction(state, { type: 'buy_seed', cropKey: 'tomato' }), /level 2/i);

  state = { ...state, level: 3, day: 8, season: 'summer', coins: 1000 };
  state = performProgressionFarmAction(state, { type: 'buy_seed', cropKey: 'tomato', quantity: 1 }).state;
  state = performProgressionFarmAction(state, { type: 'plant', plotId: 'plot-1', cropKey: 'tomato' }).state;
  assert.throws(() => performProgressionFarmAction(state, { type: 'plant', plotId: 'plot-2', cropKey: 'pumpkin' }), /level 4|autumn/i);

  const ready = structuredClone(state) as ProgressionFamilyFarmState;
  ready.plots[0].growthDays = PROGRESSION_CROP_CATALOG.tomato.growDays;
  const before = ready.inventory.produce.tomato;
  const harvested = performProgressionFarmAction(ready, { type: 'harvest', plotId: 'plot-1' }).state;
  assert.equal(harvested.inventory.produce.tomato, before + PROGRESSION_CROP_CATALOG.tomato.yield + 1);
});

test('workshop crafts persistent one-time upgrades and applies their effects', () => {
  let state = createInitialProgressionFarmState();
  state = {
    ...state,
    level: 3,
    inventory: {
      ...state.inventory,
      resources: { ...state.inventory.resources, wood: 30, mushroom: 5, berries: 5 },
    },
  };
  state = performProgressionFarmAction(state, { type: 'craft', upgradeKey: 'sturdy_watering_can' }).state;
  assert.equal(state.workshopUpgrades.sturdy_watering_can, true);
  assert.throws(() => performProgressionFarmAction(state, { type: 'craft', upgradeKey: 'sturdy_watering_can' }), /already crafted/i);

  state.inventory.seeds.carrot = 2;
  state = performProgressionFarmAction(state, { type: 'plant', plotId: 'plot-1', cropKey: 'carrot' }).state;
  const beforeMinutes = state.timeMinutes;
  state = performProgressionFarmAction(state, { type: 'water', plotId: 'plot-1' }).state;
  assert.equal(state.timeMinutes - beforeMinutes, 5);
});

test('market crate adds ten percent sale bonus and flower tending is once per day', () => {
  let state = createInitialProgressionFarmState();
  state = {
    ...state,
    level: 3,
    inventory: {
      ...state.inventory,
      produce: { ...state.inventory.produce, carrot: 10 },
      resources: { ...state.inventory.resources, wood: 20, berries: 5 },
    },
  };
  state = performProgressionFarmAction(state, { type: 'craft', upgradeKey: 'market_crate' }).state;
  const beforeCoins = state.coins;
  state = performProgressionFarmAction(state, { type: 'sell', cropKey: 'carrot', quantity: 10 }).state;
  assert.equal(state.coins - beforeCoins, Math.floor(10 * PROGRESSION_CROP_CATALOG.carrot.sellPrice * 1.1));

  const beforeHearts = state.hearts;
  state = performProgressionFarmAction(state, { type: 'tend_flowers' }).state;
  assert.equal(state.hearts, Math.min(100, beforeHearts + 1));
  assert.equal(state.daily.flowersTended, true);
  assert.throws(() => performProgressionFarmAction(state, { type: 'tend_flowers' }), /already tended/i);
});

test('Homestead Journey grants persistent one-time rewards and exposes next unlock', () => {
  let state = createInitialProgressionFarmState();
  assert.match(getNextLevelUnlock(1).label, /Fishing/i);
  assert.match(getNextLevelUnlock(3).label, /Pumpkin|Potato/i);

  state = { ...state, hearts: 49 };
  state = performProgressionFarmAction(state, { type: 'family_time' }).state;
  const firstCoins = state.coins;
  assert.equal(state.journey.hearts_50, true);
  assert.ok(getHomesteadJourney(state).some((entry) => entry.key === 'hearts_50' && entry.complete));

  state = performProgressionFarmAction(state, { type: 'rename_family', name: 'Still Together' }).state;
  assert.equal(state.coins, firstCoins);
});

test('sleeping at a season boundary grants season payoff and records the transition', () => {
  let state = createInitialProgressionFarmState();
  state = { ...state, day: 7, season: 'spring', coins: 500, hearts: 30 };
  const next = performProgressionFarmAction(state, { type: 'end_day' }).state;

  assert.equal(next.day, 8);
  assert.equal(next.season, 'summer');
  assert.equal(next.stats.seasonsCompleted, 1);
  assert.equal(next.lastDaySummary?.completedSeason, 'spring');
  assert.equal(next.lastDaySummary?.nextSeason, 'summer');
  assert.ok((next.lastDaySummary?.seasonRewardCoins ?? 0) > 0);
  assert.equal(next.journey.first_season, true);
});
