import type { HexCoord } from './types';

export type HexVisualVariation = {
  rotation: number;
  scale: number;
  tone: number;
  phase: number;
};

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function ratio(seed: string, coord: HexCoord, channel: string): number {
  return hash(`${seed}:${coord.q}:${coord.r}:${channel}`) / 0xffffffff;
}

export function getVisualVariation(seed: string, coord: HexCoord): HexVisualVariation {
  const rotation = ratio(seed, coord, 'rotation') * Math.PI * 2;
  const scale = Math.round((0.85 + ratio(seed, coord, 'scale') * 0.3) * 1000) / 1000;
  const tone = Math.round((-0.08 + ratio(seed, coord, 'tone') * 0.16) * 1000) / 1000;
  const phase = ratio(seed, coord, 'phase') * Math.PI * 2;
  return { rotation, scale, tone, phase };
}
