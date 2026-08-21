import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitialFamilyFarmState, performFarmAction } from '../lib/family-farm-game';
import {
  getCropVisualSamples,
  getGardenActionTarget,
  getGardenSummary,
  getLivingBuildingRole,
  getWeatherPresentation,
} from '../lib/hex-world/living-homestead';
import type { HexBuildingDTO } from '../lib/hex-world/types';

test('living building roles connect existing HexWorld assets to cozy life actions', () => {
  assert.equal(getLivingBuildingRole('home'), 'home');
  assert.equal(getLivingBuildingRole('garden_patch'), 'garden');
  assert.equal(getLivingBuildingRole('pond'), 'pond');
  assert.equal(getLivingBuildingRole('tree'), 'forage');
  assert.equal(getLivingBuildingRole('bench'), 'family');
  assert.equal(getLivingBuildingRole('storage'), 'storage');
  assert.equal(getLivingBuildingRole('workshop'), null);
  assert.equal(getLivingBuildingRole('lamp'), null);
});

test('garden smart targets always choose the first authoritative actionable plot', () => {
  let state = createInitialFamilyFarmState('Test Homestead');
  assert.equal(getGardenActionTarget(state, 'plant')?.id, 'plot-1');
  assert.equal(getGardenActionTarget(state, 'water'), null);
  assert.equal(getGardenActionTarget(state, 'harvest'), null);

  state = performFarmAction(state, { type: 'plant', plotId: 'plot-1', cropKey: 'carrot' }).state;
  assert.equal(getGardenActionTarget(state, 'plant')?.id, 'plot-2');
  assert.equal(getGardenActionTarget(state, 'water')?.id, 'plot-1');

  state = performFarmAction(state, { type: 'water', plotId: 'plot-1' }).state;
  state = performFarmAction(state, { type: 'end_day' }).state;
  state = performFarmAction(state, { type: 'water', plotId: 'plot-1' }).state;
  state = performFarmAction(state, { type: 'end_day' }).state;

  assert.equal(getGardenActionTarget(state, 'harvest')?.id, 'plot-1');
});

test('garden summary derives planted ready watered and empty counts from farm truth', () => {
  let state = createInitialFamilyFarmState();
  state = performFarmAction(state, { type: 'plant', plotId: 'plot-1', cropKey: 'tomato' }).state;
  state = performFarmAction(state, { type: 'water', plotId: 'plot-1' }).state;
  state = performFarmAction(state, { type: 'plant', plotId: 'plot-2', cropKey: 'carrot' }).state;

  const summary = getGardenSummary(state);
  assert.equal(summary.total, 20);
  assert.equal(summary.empty, 18);
  assert.equal(summary.planted, 2);
  assert.equal(summary.watered, 1);
  assert.equal(summary.ready, 0);
  assert.equal(summary.growing, 2);
});

test('crop visual samples are deterministic bounded and anchored to visible garden patches', () => {
  let state = createInitialFamilyFarmState();
  for (const [plotId, cropKey] of [
    ['plot-1', 'carrot'],
    ['plot-2', 'lettuce'],
    ['plot-3', 'tomato'],
    ['plot-4', 'strawberry'],
  ] as const) {
    state = performFarmAction(state, { type: 'plant', plotId, cropKey }).state;
  }

  const gardens: HexBuildingDTO[] = [
    { id: 'garden-a', worldId: 'world', buildingKey: 'garden_patch', anchorQ: 1, anchorR: 2, rotation: 0 },
    { id: 'garden-b', worldId: 'world', buildingKey: 'garden_patch', anchorQ: -2, anchorR: 0, rotation: 0 },
  ];

  const first = getCropVisualSamples(state, gardens, 3);
  const second = getCropVisualSamples(state, gardens, 3);
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.deepEqual(first.map((sample) => sample.gardenBuildingId), ['garden-a', 'garden-b', 'garden-a']);
  assert.ok(first.every((sample) => sample.progress >= 0 && sample.progress <= 1));
});

test('weather presentation stays small stable and UI ready', () => {
  assert.deepEqual(getWeatherPresentation('sunny'), { label: 'Sunny', emoji: '☀️' });
  assert.deepEqual(getWeatherPresentation('cloudy'), { label: 'Cloudy', emoji: '☁️' });
  assert.deepEqual(getWeatherPresentation('rainy'), { label: 'Rainy', emoji: '🌧️' });
  assert.deepEqual(getWeatherPresentation('breezy'), { label: 'Breezy', emoji: '🍃' });
});
