import type { HexCoord } from './types';

export type HexConfirmedVisualEvent =
  | { kind: 'placed'; buildingId: string; coord: HexCoord; nonce: number }
  | { kind: 'moved'; buildingId: string; coord: HexCoord; nonce: number }
  | { kind: 'rotated'; buildingId: string; nonce: number }
  | { kind: 'expanded'; coords: HexCoord[]; nonce: number }
  | null;
