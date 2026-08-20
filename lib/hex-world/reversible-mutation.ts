import type { HexWorldSnapshot } from './types';
import type { HexUndoDescriptor, HexUndoMeta, HexUndoScope } from './undo-types';
import { redisHexUndoStore, type HexUndoStore } from './undo-store';

export type HexMutationPersistenceResult = {
  snapshot: HexWorldSnapshot;
  undoDescriptor: HexUndoDescriptor;
};

export type HexReversibleMutationResponse = {
  snapshot: HexWorldSnapshot;
  undo: HexUndoMeta | null;
};

export async function finalizeReversibleMutation(
  scope: HexUndoScope,
  result: HexMutationPersistenceResult,
  store: HexUndoStore = redisHexUndoStore,
): Promise<HexReversibleMutationResponse> {
  try {
    return { snapshot: result.snapshot, undo: await store.save(scope, result.undoDescriptor) };
  } catch (error) {
    console.error('Hex undo opportunity unavailable:', error);
    return { snapshot: result.snapshot, undo: null };
  }
}
