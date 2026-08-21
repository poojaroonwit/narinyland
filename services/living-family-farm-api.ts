import { getActiveCircleId } from '@/lib/circle-store';
import type { ProgressionFamilyFarmState, ProgressionFarmAction } from '@/lib/family-farm-progression';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export type LivingFamilyFarmApiResponse = {
  landId: string;
  revision: number;
  state: ProgressionFamilyFarmState;
  message?: string;
};

async function requestLivingFamilyFarm(
  path: string,
  options: RequestInit = {}
): Promise<LivingFamilyFarmApiResponse> {
  const circleId = getActiveCircleId();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (circleId) headers.set('X-Circle-Id', circleId);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(payload.error || `Living homestead request failed: ${response.status}`);
  }

  return response.json() as Promise<LivingFamilyFarmApiResponse>;
}

export const livingFamilyFarmAPI = {
  get: (landId: string) =>
    requestLivingFamilyFarm(`/family-farm?landId=${encodeURIComponent(landId)}`),

  act: (landId: string, action: ProgressionFarmAction) =>
    requestLivingFamilyFarm('/family-farm', {
      method: 'POST',
      body: JSON.stringify({ landId, action }),
    }),
};
