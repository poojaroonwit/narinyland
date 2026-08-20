import type { HexWorldErrorCode } from './types';

const MESSAGES: Partial<Record<HexWorldErrorCode, string>> = {
  tile_occupied: 'Occupied',
  invalid_terrain: 'Needs compatible terrain',
  tile_locked: 'Outside unlocked land',
  invalid_rotation: 'Rotation unavailable',
  invalid_building: 'Building unavailable',
};

export function getPlacementMessage(code: HexWorldErrorCode): string {
  return MESSAGES[code] ?? code.replaceAll('_', ' ');
}
