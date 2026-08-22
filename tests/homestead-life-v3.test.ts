import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createInitialProgressionFarmState,
  normalizeProgressionFarmState,
} from '../lib/family-farm-progression';
import { performHomesteadLifeAction } from '../lib/homestead-life-engine';

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
