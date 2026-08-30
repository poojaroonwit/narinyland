import type { HexIslandBounds } from './camera';
import type { HexQualityName } from './quality';

export type FloatingIslandFragmentPlacement = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

const COUNT: Record<HexQualityName, number> = { high: 10, medium: 7, mobile: 4 };
const MASTER_COUNT = COUNT.high;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function ratio(key: string): number {
  return stableHash(key) / 0xffffffff;
}

export function buildFloatingIslandFragmentPlacements({
  bounds,
  seed,
  quality,
}: {
  bounds: HexIslandBounds;
  seed: string;
  quality: HexQualityName;
}): FloatingIslandFragmentPlacement[] {
  const count = COUNT[quality];
  const baseAngle = ratio(`${seed}:floating-fragments:base-angle`) * Math.PI * 2;
  const placements: FloatingIslandFragmentPlacement[] = [];

  for (let index = 0; index < count; index += 1) {
    const key = `${seed}:floating-fragment:${index}`;
    const major = index < 4;
    const angleStep = (index / MASTER_COUNT) * Math.PI * 2;
    const angleJitter = (ratio(`${key}:angle-jitter`) - 0.5) * 0.58;
    const angle = baseAngle + angleStep + angleJitter;
    const radiusFactor = major
      ? 0.92 + ratio(`${key}:radius`) * 0.22
      : 1.05 + ratio(`${key}:radius`) * 0.43;
    const radius = Math.max(1, bounds.radius) * radiusFactor;
    const depth = major
      ? 2.8 + ratio(`${key}:depth`) * 2.2
      : 3.4 + ratio(`${key}:depth`) * 4;
    const scale = major
      ? 0.58 + ratio(`${key}:scale`) * 0.32
      : 0.34 + ratio(`${key}:scale`) * 0.38;

    placements.push({
      position: [
        bounds.center[0] + Math.cos(angle) * radius,
        Math.min(bounds.center[1] - 2.6, bounds.center[1] - depth),
        bounds.center[2] + Math.sin(angle) * radius,
      ],
      rotation: [
        (ratio(`${key}:rotation-x`) - 0.5) * 0.5,
        ratio(`${key}:rotation-y`) * Math.PI * 2,
        (ratio(`${key}:rotation-z`) - 0.5) * 0.36,
      ],
      scale,
    });
  }

  return placements;
}
