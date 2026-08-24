import type { HexQualityProfile } from './quality';

export type HexMotionProfile = {
  hoverResponse: number;
  selectResponse: number;
  placementDurationMs: number;
  rotationDurationMs: number;
  removalDurationMs: number;
  expansionDurationMs: number;
  cameraResponse: number;
  ambientScale: number;
  ghostBobScale: number;
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicMotionPhase(key: string): number {
  return (stableHash(key) / 0x100000000) * Math.PI * 2;
}

export function deterministicMotionBucket(key: string, bucketCount: number): number {
  if (!Number.isInteger(bucketCount) || bucketCount < 1) throw new Error('bucketCount must be a positive integer');
  return stableHash(key) % bucketCount;
}

export function expSmoothingAlpha(delta: number, response: number): number {
  return 1 - Math.exp(-Math.max(0, delta) * Math.max(0, response));
}

export function resolveHexMotionProfile(input: { quality: HexQualityProfile; reducedMotion: boolean }): HexMotionProfile {
  if (input.reducedMotion) {
    return {
      hoverResponse: 20,
      selectResponse: 20,
      placementDurationMs: 80,
      rotationDurationMs: 80,
      removalDurationMs: 80,
      expansionDurationMs: 120,
      cameraResponse: 28,
      ambientScale: 0,
      ghostBobScale: 0,
    };
  }

  return {
    hoverResponse: 12,
    selectResponse: 9,
    placementDurationMs: 420,
    rotationDurationMs: 230,
    removalDurationMs: 220,
    expansionDurationMs: 950,
    cameraResponse: 3.6,
    ambientScale: input.quality.windStrength,
    ghostBobScale: input.quality.name === 'mobile' ? 0.35 : 1,
  };
}
