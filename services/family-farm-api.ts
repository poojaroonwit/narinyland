import { getActiveCircleId } from '@/lib/circle-store';
import type { FamilyFarmState, FarmAction } from '@/lib/family-farm-game';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export type FamilyFarmApiResponse = {
  landId: string;
  revision: number;
  state: FamilyFarmState;
  message?: string;
};

async function requestFamilyFarm(
  path: string,
  options: RequestInit = {}
): Promise<FamilyFarmApiResponse> {
  const circleId = getActiveCircleId();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(circleId ? { 'X-Circle-Id': circleId } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(payload.error || `Family farm request failed: ${response.status}`);
  }

  return response.json() as Promise<FamilyFarmApiResponse>;
}

export const familyFarmAPI = {
  get: (landId: string) =>
    requestFamilyFarm(`/family-farm?landId=${encodeURIComponent(landId)}`),

  act: (landId: string, action: FarmAction) =>
    requestFamilyFarm('/family-farm', {
      method: 'POST',
      body: JSON.stringify({ landId, action }),
    }),
};
