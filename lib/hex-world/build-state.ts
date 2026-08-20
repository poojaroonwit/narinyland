import type { HexBuildingKey } from './building-catalog';
import type { HexCoord, HexRotation } from './types';

export type HexInteractionMode = 'idle' | 'placing' | 'moving' | 'expanding';

export type HexBuildState = {
  mode: HexInteractionMode;
  buildingKey: HexBuildingKey | null;
  selectedBuildingId: string | null;
  anchor: HexCoord | null;
  rotation: HexRotation;
  expansionKey: string | null;
};

export type HexBuildAction =
  | { type: 'select_building'; buildingKey: HexBuildingKey }
  | { type: 'select_existing'; buildingId: string | null }
  | { type: 'set_anchor'; anchor: HexCoord | null }
  | { type: 'start_move'; buildingId: string; buildingKey: HexBuildingKey; rotation: HexRotation }
  | { type: 'rotate_clockwise' }
  | { type: 'rotate_counterclockwise' }
  | { type: 'preview_expansion'; expansionKey: string }
  | { type: 'cancel' };

export function createInitialHexBuildState(): HexBuildState {
  return { mode: 'idle', buildingKey: null, selectedBuildingId: null, anchor: null, rotation: 0, expansionKey: null };
}

function wrapRotation(value: number): HexRotation {
  return ((value % 6 + 6) % 6) as HexRotation;
}

export function hexBuildReducer(state: HexBuildState, action: HexBuildAction): HexBuildState {
  switch (action.type) {
    case 'select_building':
      return { ...state, mode: 'placing', buildingKey: action.buildingKey, selectedBuildingId: null, anchor: null, rotation: 0, expansionKey: null };
    case 'select_existing':
      return { ...createInitialHexBuildState(), selectedBuildingId: action.buildingId };
    case 'set_anchor':
      return state.mode === 'placing' || state.mode === 'moving' ? { ...state, anchor: action.anchor } : state;
    case 'start_move':
      return { ...state, mode: 'moving', buildingKey: action.buildingKey, selectedBuildingId: action.buildingId, anchor: null, rotation: action.rotation, expansionKey: null };
    case 'rotate_clockwise':
      return state.mode === 'placing' || state.mode === 'moving' ? { ...state, rotation: wrapRotation(state.rotation + 1) } : state;
    case 'rotate_counterclockwise':
      return state.mode === 'placing' || state.mode === 'moving' ? { ...state, rotation: wrapRotation(state.rotation - 1) } : state;
    case 'preview_expansion':
      return { ...createInitialHexBuildState(), mode: 'expanding', expansionKey: action.expansionKey };
    case 'cancel':
      return createInitialHexBuildState();
    default:
      return state;
  }
}
