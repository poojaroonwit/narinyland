import assert from 'node:assert/strict';
import { test } from 'node:test';
import { finalizeReversibleMutation } from '@/lib/hex-world/reversible-mutation';
import type { HexUndoStore } from '@/lib/hex-world/undo-store';
import type { HexMutationPersistenceResult } from '@/lib/hex-world/reversible-mutation';

const result: HexMutationPersistenceResult = {
  snapshot: {
    world: { id: 'world', landId: 'land', schemaVersion: 1, generatorVersion: 1, seed: 'land', expansionLevel: 0, revision: 1 },
    tiles: [],
    buildings: [],
    expansions: [],
    points: 0,
  },
  undoDescriptor: {
    action: 'place',
    expectedRevision: 1,
    expected: { id: 'b1', buildingKey: 'bench', anchorQ: 0, anchorR: 0, rotation: 0, modelUrl: null, metadata: {} },
  },
};

test('committed mutation survives unavailable undo storage', async () => {
  const throwingStore: HexUndoStore = {
    async save() { throw new Error('redis unavailable'); },
    async claim() { return null; },
    async consume() {},
    async release() {},
  };
  const response = await finalizeReversibleMutation(
    { configId: 'circle', landId: 'land', userId: 'user' },
    result,
    throwingStore,
  );
  assert.equal(response.snapshot.world.revision, 1);
  assert.equal(response.undo, null);
});
