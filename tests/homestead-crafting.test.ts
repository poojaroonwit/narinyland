import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitialProgressionFarmState } from '../lib/family-farm-progression';
import { normalizeHomesteadLifeState, performHomesteadLifeAction } from '../lib/homestead-life-engine';

type CraftStateShape = ReturnType<typeof normalizeHomesteadLifeState> & {
  homesteadCrafting?: Record<string, number>;
};

function craftingState(value: ReturnType<typeof normalizeHomesteadLifeState>): CraftStateShape {
  return value as CraftStateShape;
}

test('Homestead crafting normalizes every approved compact recipe to zero', () => {
  const state = craftingState(normalizeHomesteadLifeState(createInitialProgressionFarmState()));
  assert.deepEqual(state.homesteadCrafting, {
    fence_bundle: 0,
    bench_kit: 0,
    lamp_kit: 0,
    stone_path_kit: 0,
    flower_planter: 0,
    animal_trough: 0,
    picnic_table: 0,
    flower_box: 0,
    wool_cushion: 0,
  });
});

test('Workshop tier gates advanced homestead recipes', () => {
  const state = normalizeHomesteadLifeState({
    ...createInitialProgressionFarmState(),
    buildingTiers: { home: 1, barn: 1, workshop: 1, storage: 1 },
    inventory: { resources: { wood: 50, berries: 10, mushroom: 5, wool: 5 } },
  });

  assert.throws(
    () => performHomesteadLifeAction(state, { type: 'craft_homestead_item', craftKey: 'picnic_table' } as never),
    /workshop.*tier 2|tier 2.*workshop/i,
  );
});

test('basic crafting subtracts materials and increments the persistent craft count', () => {
  let state = normalizeHomesteadLifeState({
    ...createInitialProgressionFarmState(),
    inventory: { resources: { wood: 20 } },
  });
  const beforeWood = state.inventory.resources.wood;

  state = performHomesteadLifeAction(state, { type: 'craft_homestead_item', craftKey: 'fence_bundle' } as never).state;
  assert.equal(craftingState(state).homesteadCrafting?.fence_bundle, 1);
  assert.ok(state.inventory.resources.wood < beforeWood);
});

test('Tier 3 wool decor consumes wool and never mutates Hex geometry state', () => {
  let state = normalizeHomesteadLifeState({
    ...createInitialProgressionFarmState(),
    buildingTiers: { home: 1, barn: 1, workshop: 3, storage: 1 },
    inventory: { resources: { wood: 10, wool: 3 } },
  });
  const beforeWool = state.inventory.resources.wool;

  state = performHomesteadLifeAction(state, { type: 'craft_homestead_item', craftKey: 'wool_cushion' } as never).state;
  assert.equal(state.inventory.resources.wool, beforeWool - 2);
  assert.equal(craftingState(state).homesteadCrafting?.wool_cushion, 1);
  assert.equal('tiles' in state, false);
  assert.equal('buildings' in state, false);
});

test('bounded craft recipes reject counts above their approved maximum', () => {
  let state = normalizeHomesteadLifeState({
    ...createInitialProgressionFarmState(),
    buildingTiers: { home: 1, barn: 1, workshop: 2, storage: 1 },
    inventory: { resources: { wood: 100 } },
  });

  for (let index = 0; index < 5; index += 1) {
    state = performHomesteadLifeAction(state, { type: 'craft_homestead_item', craftKey: 'animal_trough' } as never).state;
  }
  assert.equal(craftingState(state).homesteadCrafting?.animal_trough, 5);
  assert.throws(
    () => performHomesteadLifeAction(state, { type: 'craft_homestead_item', craftKey: 'animal_trough' } as never),
    /maximum|enough.*trough|already.*5/i,
  );
});
