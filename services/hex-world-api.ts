import { getActiveCircleId } from '@/lib/circle-store';
import type { HexReversibleMutationResponse } from '@/lib/hex-world/reversible-mutation';
import type { HexCoord, HexPlacementInput, HexWorldErrorCode, HexWorldSnapshot } from '@/lib/hex-world/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export class HexWorldApiError extends Error {
  constructor(public readonly code: HexWorldErrorCode | string, message: string, public readonly status: number) {
    super(message);
    this.name = 'HexWorldApiError';
  }
}

function headers(): Record<string, string> {
  const circleId = getActiveCircleId();
  return {
    'Content-Type': 'application/json',
    ...(circleId ? { 'X-Circle-Id': circleId } : {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers(), ...init.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new HexWorldApiError(payload.code || 'unknown', payload.error || 'HexWorld request failed', response.status);
  return payload as T;
}

export const hexWorldAPI = {
  get: (landId: string, signal?: AbortSignal) =>
    request<HexWorldSnapshot>(`/hex-world?landId=${encodeURIComponent(landId)}`, { signal }),

  place: (landId: string, input: HexPlacementInput) =>
    request<HexReversibleMutationResponse>('/hex-world/buildings', {
      method: 'POST',
      body: JSON.stringify({ landId, ...input }),
    }),

  update: (landId: string, id: string, patch: { anchorQ?: number; anchorR?: number; rotation?: number }) =>
    request<HexReversibleMutationResponse>(`/hex-world/buildings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ landId, ...patch }),
    }),

  remove: (landId: string, id: string) =>
    request<HexReversibleMutationResponse>(`/hex-world/buildings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ landId }),
    }),

  undo: (landId: string, undoToken: string) =>
    request<HexWorldSnapshot>('/hex-world/undo', {
      method: 'POST',
      body: JSON.stringify({ landId, undoToken }),
    }),

  expand: (landId: string, expansionKey: string, anchor: HexCoord) =>
    request<HexWorldSnapshot>('/hex-world/expand', {
      method: 'POST',
      body: JSON.stringify({ landId, expansionKey, anchorQ: anchor.q, anchorR: anchor.r }),
    }),

  moveExpansion: (landId: string, expansionKey: string, anchor: HexCoord) =>
    request<HexWorldSnapshot>('/hex-world/expand', {
      method: 'PATCH',
      body: JSON.stringify({ landId, expansionKey, anchorQ: anchor.q, anchorR: anchor.r }),
    }),
};
