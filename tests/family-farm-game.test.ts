import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BEDTIME_MINUTES,
  START_OF_DAY_MINUTES,
  createInitialFamilyFarmState,
  dailyGoalsComplete,
  formatFarmTime,
  getDailyGoals,
  isPlotReady,
  normalizeFamilyFarmState,
  performFarmAction,
} from '../lib/family-farm-game';

test('carrot can be planted, watered, grown, harvested and sold', () => {
  let state = createInitialFamilyFarmState('Test Family');

  state = performFarmAction(state, { type: 'plant', plotId: 'plot-1', cropKey: 'carrot' }).state;
  assert.equal(state.inventory.seeds.carrot, 5);
  assert.equal(state.energy, 19);
  assert.equal(state.timeMinutes, START_OF_DAY_MINUTES + 20);

  state = performFarmAction(state, { type: 'water', plotId: 'plot-1' }).state;
  state = performFarmAction(state, { type: 'end_day' }).state;
  assert.equal(state.plots[0].growthDays, 1);
  assert.equal(state.day, 2);
  assert.equal(state.energy, state.maxEnergy);
  assert.equal(state.timeMinutes, START_OF_DAY_MINUTES);

  state = performFarmAction(state, { type: 'water', plotId: 'plot-1' }).state;
  state = performFarmAction(state, { type: 'end_day' }).state;
  assert.equal(isPlotReady(state.plots[0]), true);

  const beforeHarvestCoins = state.coins;
  state = performFarmAction(state, { type: 'harvest', plotId: 'plot-1' }).state;
  assert.equal(state.inventory.produce.carrot, 2);
  assert.equal(state.plots[0].cropKey, null);
  assert.equal(state.milestones.firstHarvest, true);
  assert.ok(state.coins > beforeHarvestCoins, 'first-harvest milestone should reward coins');

  const coinsBeforeSale = state.coins;
  state = performFarmAction(state, { type: 'sell', cropKey: 'carrot', quantity: 'all' }).state;
  assert.equal(state.inventory.produce.carrot, 0);
  assert.equal(state.coins, coinsBeforeSale + 28);
  assert.equal(state.stats.sold, 2);
});

test('a sunny unwatered crop does not grow when the day ends', () => {
  let state = createInitialFamilyFarmState();
  assert.equal(state.weather, 'sunny');

  state = performFarmAction(state, { type: 'plant', plotId: 'plot-1', cropKey: 'lettuce' }).state;
  state = performFarmAction(state, { type: 'end_day' }).state;

  assert.equal(state.plots[0].growthDays, 0);
});

test('starter milestones pay once even after later actions', () => {
  let state = createInitialFamilyFarmState();

  for (const plotId of ['plot-1', 'plot-2', 'plot-3']) {
    state = performFarmAction(state, { type: 'plant', plotId, cropKey: 'carrot' }).state;
  }

  assert.equal(state.milestones.plantedThree, true);
  assert.equal(state.inventory.seeds.tomato, 4);
  const coinsAfterReward = state.coins;

  state = performFarmAction(state, { type: 'plant', plotId: 'plot-4', cropKey: 'carrot' }).state;
  assert.equal(state.coins, coinsAfterReward);
  assert.equal(state.inventory.seeds.tomato, 4);
});

test('buying seeds validates coins and selling validates inventory', () => {
  let state = createInitialFamilyFarmState();
  const coinsBefore = state.coins;

  state = performFarmAction(state, { type: 'buy_seed', cropKey: 'tomato', quantity: 2 }).state;
  assert.equal(state.inventory.seeds.tomato, 4);
  assert.equal(state.coins, coinsBefore - 28);

  assert.throws(
    () => performFarmAction(state, { type: 'sell', cropKey: 'strawberry', quantity: 'all' }),
    /do not have any Strawberry/i
  );
});

test('farm clock advances with chores and blocks actions after bedtime', () => {
  let state = createInitialFamilyFarmState();
  assert.equal(formatFarmTime(state.timeMinutes), '6:00 AM');

  state = performFarmAction(state, { type: 'plant', plotId: 'plot-1', cropKey: 'carrot' }).state;
  state = performFarmAction(state, { type: 'water', plotId: 'plot-1' }).state;
  assert.equal(formatFarmTime(state.timeMinutes), '6:30 AM');

  state.timeMinutes = BEDTIME_MINUTES - 10;
  assert.throws(
    () => performFarmAction(state, { type: 'plant', plotId: 'plot-2', cropKey: 'carrot' }),
    /too late/i
  );

  state = performFarmAction(state, { type: 'end_day' }).state;
  assert.equal(state.timeMinutes, START_OF_DAY_MINUTES);
});

test('fed chickens produce eggs overnight and eggs can be collected and sold', () => {
  let state = createInitialFamilyFarmState();

  state = performFarmAction(state, { type: 'feed_chickens' }).state;
  assert.equal(state.livestock.fedToday, true);
  assert.equal(state.energy, 19);

  state = performFarmAction(state, { type: 'end_day' }).state;
  assert.equal(state.livestock.fedToday, false);
  assert.equal(state.livestock.eggsAvailable, 2);

  const beforeCollectionCoins = state.coins;
  state = performFarmAction(state, { type: 'collect_eggs' }).state;
  assert.equal(state.livestock.eggsAvailable, 0);
  assert.equal(state.inventory.resources.egg, 2);
  assert.equal(state.stats.eggsCollected, 2);
  assert.equal(state.milestones.firstEgg, true);
  assert.ok(state.coins > beforeCollectionCoins, 'first egg milestone should award coins');

  const coinsBeforeSale = state.coins;
  state = performFarmAction(state, { type: 'sell_resource', resourceKey: 'egg', quantity: 'all' }).state;
  assert.equal(state.inventory.resources.egg, 0);
  assert.equal(state.coins, coinsBeforeSale + 36);
});

test('foraging consumes energy, time, and daily forage charges', () => {
  let state = createInitialFamilyFarmState();
  const startingEnergy = state.energy;

  state = performFarmAction(state, { type: 'forage' }).state;
  state = performFarmAction(state, { type: 'forage' }).state;
  state = performFarmAction(state, { type: 'forage' }).state;

  assert.equal(state.daily.foraged, 3);
  assert.equal(state.daily.forageCharges, 0);
  assert.equal(state.energy, startingEnergy - 6);
  assert.equal(state.timeMinutes, START_OF_DAY_MINUTES + 90);
  assert.ok(state.stats.foraged >= 3);

  assert.throws(
    () => performFarmAction(state, { type: 'forage' }),
    /explored everything nearby/i
  );

  state = performFarmAction(state, { type: 'end_day' }).state;
  assert.equal(state.daily.forageCharges, 3);
  assert.equal(state.daily.foraged, 0);
});

test('family time contributes to daily goals only once per day', () => {
  let state = createInitialFamilyFarmState();

  state = performFarmAction(state, { type: 'family_time' }).state;
  assert.equal(state.daily.familyTime, true);
  assert.equal(state.stats.familyMoments, 1);
  assert.equal(getDailyGoals(state).find((goal) => goal.key === 'family')?.complete, true);

  assert.throws(
    () => performFarmAction(state, { type: 'family_time' }),
    /already spent quality family time/i
  );
});

test('daily goals grant a one-time reward and increase the streak', () => {
  let state = createInitialFamilyFarmState();
  state.daily.watered = 3;
  state.daily.harvested = 2;
  state.daily.foraged = 2;
  state.daily.familyTime = true;

  assert.equal(dailyGoalsComplete(state), true);
  const coinsBefore = state.coins;
  state = performFarmAction(state, { type: 'claim_daily_reward' }).state;

  assert.equal(state.daily.rewardClaimed, true);
  assert.equal(state.dailyStreak, 1);
  assert.equal(state.stats.dailyRewards, 1);
  assert.ok(state.coins > coinsBefore);
  assert.ok(state.inventory.seeds.strawberry >= 2);

  assert.throws(
    () => performFarmAction(state, { type: 'claim_daily_reward' }),
    /already claimed/i
  );
});

test('completed daily goals auto-claim when the family sleeps', () => {
  let state = createInitialFamilyFarmState();
  state.daily.watered = 3;
  state.daily.harvested = 2;
  state.daily.foraged = 2;
  state.daily.familyTime = true;

  state = performFarmAction(state, { type: 'end_day' }).state;
  assert.equal(state.day, 2);
  assert.equal(state.dailyStreak, 1);
  assert.equal(state.stats.dailyRewards, 1);
  assert.equal(state.daily.rewardClaimed, false, 'new day should have a fresh unclaimed reward');
});

test('v1 farm saves migrate safely into the v2 family life schema', () => {
  const state = normalizeFamilyFarmState({
    schemaVersion: 1,
    day: 8,
    coins: 777,
    energy: 12,
    maxEnergy: 22,
    familyName: 'Old Save Family',
    homeLevel: 2,
    hearts: 54,
    plots: [],
    inventory: {
      seeds: { carrot: 3, lettuce: 2, tomato: 1, strawberry: 0 },
      produce: { carrot: 5 },
    },
    stats: { planted: 5, watered: 4, harvested: 2, sold: 1, earned: 14 },
    milestones: { plantedThree: true, wateredThree: true, firstHarvest: true },
  });

  assert.equal(state.schemaVersion, 2);
  assert.equal(state.day, 8);
  assert.equal(state.coins, 777);
  assert.equal(state.timeMinutes, START_OF_DAY_MINUTES);
  assert.equal(state.livestock.chickens, 2);
  assert.equal(state.inventory.resources.egg, 0);
  assert.equal(state.daily.forageCharges, 3);
  assert.equal(state.stats.eggsCollected, 0);
  assert.equal(state.milestones.firstEgg, false);
});

test('normalizer recovers from malformed saves without trusting impossible values', () => {
  const state = normalizeFamilyFarmState({
    day: -20,
    coins: Number.POSITIVE_INFINITY,
    energy: 9999,
    maxEnergy: 9999,
    timeMinutes: 99999,
    homeLevel: 200,
    hearts: -4,
    familyName: '   My     Family     ',
    plots: [{ id: 'evil', cropKey: 'not-a-crop', growthDays: 999 }],
    livestock: { chickens: 999, eggsAvailable: 9999 },
    daily: { forageCharges: 999 },
    inventory: {
      seeds: { carrot: -10 },
      produce: { tomato: 4.8 },
      resources: { egg: -10, wood: 7.9 },
    },
  });

  assert.equal(state.day, 1);
  assert.equal(state.maxEnergy, 32);
  assert.equal(state.energy, 32);
  assert.equal(state.timeMinutes, BEDTIME_MINUTES);
  assert.equal(state.homeLevel, 4);
  assert.equal(state.hearts, 0);
  assert.equal(state.familyName, 'My Family');
  assert.equal(state.plots[0].id, 'plot-1');
  assert.equal(state.plots[0].cropKey, null);
  assert.equal(state.inventory.seeds.carrot, 0);
  assert.equal(state.inventory.produce.tomato, 4);
  assert.equal(state.inventory.resources.egg, 0);
  assert.equal(state.inventory.resources.wood, 7);
  assert.equal(state.daily.forageCharges, 3);
  assert.equal(state.livestock.eggsAvailable, 99);
});
