import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createInitialProgressionFarmState,
  normalizeProgressionFarmState,
} from '../lib/family-farm-progression';

type V5FamilyShape = {
  schemaVersion: number;
  homeLevel: number;
  hearts: number;
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
