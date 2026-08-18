import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialFamilyFarmState,
  isPlotReady,
  normalizeFamilyFarmState,
  performFarmAction,
} from '../lib/family-farm-game';

test('carrot can be planted, watered, grown, harvested and sold', () => {
  let state = createInitialFamilyFarmState('Test Family');

  state = performFarmAction(state, { type: 'plant', plotId: 'plot-1', cropKey: 'carrot' }).state;
  assert.equal(state.inventory.seeds.carrot, 5);
  assert.equal(state.energy, 19);

  state = performFarmAction(state, { type: 'water', plotId: 'plot-1' }).state;
  state = performFarmAction(state, { type: 'end_day' }).state;
  assert.equal(state.plots[0].growthDays, 1);
  assert.equal(state.day, 2);
  assert.equal(state.energy, state.maxEnergy);

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

test('normalizer recovers from malformed saves without trusting impossible values', () => {
  const state = normalizeFamilyFarmState({
    day: -20,
    coins: Number.POSITIVE_INFINITY,
    energy: 9999,
    maxEnergy: 9999,
    homeLevel: 200,
    hearts: -4,
    familyName: '   My     Family     ',
    plots: [{ id: 'evil', cropKey: 'not-a-crop', growthDays: 999 }],
    inventory: {
      seeds: { carrot: -10 },
      produce: { tomato: 4.8 },
    },
  });

  assert.equal(state.day, 1);
  assert.equal(state.maxEnergy, 32);
  assert.equal(state.energy, 32);
  assert.equal(state.homeLevel, 4);
  assert.equal(state.hearts, 0);
  assert.equal(state.familyName, 'My Family');
  assert.equal(state.plots[0].id, 'plot-1');
  assert.equal(state.plots[0].cropKey, null);
  assert.equal(state.inventory.seeds.carrot, 0);
  assert.equal(state.inventory.produce.tomato, 4);
});
