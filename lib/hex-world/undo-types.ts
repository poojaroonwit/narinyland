import type { HexBuildingDTO } from './types';

export type HexUndoScope = {
  configId: string;
  landId: string;
  userId: string;
};

export type HexUndoAction = 'place' | 'move' | 'rotate' | 'remove';

export type HexUndoMeta = {
  token: string;
  action: HexUndoAction;
  expiresAt: string;
};

export const HEX_UNDO_TTL_MS = 12_000;

export type HexUndoBuildingState = Pick<
  HexBuildingDTO,
  'id' | 'buildingKey' | 'anchorQ' | 'anchorR' | 'rotation' | 'modelUrl' | 'metadata'
>;

export type HexUndoDescriptor =
  | { action: 'place'; expectedRevision: number; expected: HexUndoBuildingState }
  | { action: 'move'; expectedRevision: number; before: HexUndoBuildingState; expected: HexUndoBuildingState }
  | { action: 'rotate'; expectedRevision: number; before: HexUndoBuildingState; expected: HexUndoBuildingState }
  | { action: 'remove'; expectedRevision: number; before: HexUndoBuildingState };

export type HexUndoClaim = {
  scope: HexUndoScope;
  token: string;
  claimId: string;
  descriptor: HexUndoDescriptor;
};
