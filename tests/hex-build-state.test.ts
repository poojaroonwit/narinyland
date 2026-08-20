import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitialHexBuildState, hexBuildReducer } from '@/lib/hex-world/build-state';

test('selecting a catalog item starts placement', () => {
  const state = hexBuildReducer(createInitialHexBuildState(), { type: 'select_building', buildingKey: 'bench' });
  assert.equal(state.mode, 'placing');
  assert.equal(state.buildingKey, 'bench');
  assert.equal(state.rotation, 0);
});

test('rotation wraps after six directions', () => {
  const state = hexBuildReducer({ ...createInitialHexBuildState(), mode: 'placing', buildingKey: 'workshop', rotation: 5 }, { type: 'rotate_clockwise' });
  assert.equal(state.rotation, 0);
});

test('moving retains selected building and current rotation', () => {
  const state = hexBuildReducer(createInitialHexBuildState(), { type: 'start_move', buildingId: 'b1', buildingKey: 'tree', rotation: 4 });
  assert.equal(state.mode, 'moving');
  assert.equal(state.selectedBuildingId, 'b1');
  assert.equal(state.rotation, 4);
});

test('expansion preview is separate from build placement', () => {
  const state = hexBuildReducer(createInitialHexBuildState(), { type: 'preview_expansion', expansionKey: '1:0:0' });
  assert.equal(state.mode, 'expanding');
  assert.equal(state.expansionKey, '1:0:0');
  assert.equal(state.buildingKey, null);
  assert.equal(state.selectedBuildingId, null);
});
