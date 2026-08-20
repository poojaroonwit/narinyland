import { axialToWorld } from './hex-grid';
import type { HexCoord, HexTileDTO } from './types';

export type HexIslandBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  center: [number, number, number];
  radius: number;
};

export type HexCameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
};

export type HexCameraIntent =
  | { kind: 'overview' }
  | { kind: 'focus'; coord: HexCoord }
  | { kind: 'build'; anchor: HexCoord | null };

const FALLBACK_BOUNDS: HexIslandBounds = {
  minX: -5,
  maxX: 5,
  minZ: -5,
  maxZ: 5,
  center: [0, 0, 0],
  radius: 5,
};

export function getUnlockedIslandBounds(tiles: HexTileDTO[]): HexIslandBounds {
  const unlocked = tiles.filter((tile) => tile.unlocked);
  if (unlocked.length === 0) return { ...FALLBACK_BOUNDS };

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxY = -Infinity;

  for (const tile of unlocked) {
    const world = axialToWorld(tile, 1, tile.height);
    minX = Math.min(minX, world.x);
    maxX = Math.max(maxX, world.x);
    minZ = Math.min(minZ, world.z);
    maxZ = Math.max(maxZ, world.z);
    maxY = Math.max(maxY, world.y);
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const halfWidth = Math.max(1, (maxX - minX) / 2 + 1);
  const halfDepth = Math.max(1, (maxZ - minZ) / 2 + 1);
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    center: [centerX, Math.max(0, maxY * 0.18), centerZ],
    radius: Math.hypot(halfWidth, halfDepth),
  };
}

export function getOverviewCameraPose(bounds: HexIslandBounds, aspect: number): HexCameraPose {
  const portraitPenalty = aspect < 1 ? 1.22 : 1;
  const distance = Math.max(12, bounds.radius * 2.15 * portraitPenalty);
  return {
    target: bounds.center,
    position: [
      bounds.center[0] + distance * 0.58,
      bounds.center[1] + distance * 0.64,
      bounds.center[2] + distance * 0.74,
    ],
    distance,
  };
}

export function getFocusCameraPose(bounds: HexIslandBounds, focus: HexCoord, aspect: number): HexCameraPose {
  const overview = getOverviewCameraPose(bounds, aspect);
  const focusWorld = axialToWorld(focus);
  const target: [number, number, number] = [
    bounds.center[0] * 0.35 + focusWorld.x * 0.65,
    Math.max(bounds.center[1], 0.45),
    bounds.center[2] * 0.35 + focusWorld.z * 0.65,
  ];
  const distance = Math.max(10, overview.distance * 0.72);
  return {
    target,
    position: [target[0] + distance * 0.58, target[1] + distance * 0.64, target[2] + distance * 0.74],
    distance,
  };
}

export function getBuildCameraPose(bounds: HexIslandBounds, anchor: HexCoord | null, aspect: number): HexCameraPose {
  const base = anchor ? getFocusCameraPose(bounds, anchor, aspect) : getOverviewCameraPose(bounds, aspect);
  const distance = Math.max(11, base.distance * 0.9);
  return {
    target: base.target,
    position: [base.target[0] + distance * 0.52, base.target[1] + distance * 0.72, base.target[2] + distance * 0.66],
    distance,
  };
}

export function shouldReframeForCoords(bounds: HexIslandBounds, coords: HexCoord[], margin = 1.8): boolean {
  return coords.some((coord) => {
    const world = axialToWorld(coord);
    return world.x < bounds.minX - margin || world.x > bounds.maxX + margin || world.z < bounds.minZ - margin || world.z > bounds.maxZ + margin;
  });
}
