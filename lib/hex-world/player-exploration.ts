import { axialToWorld, hexKey, worldToAxial } from './hex-grid';
import type { HexBuildingDTO, HexCoord, HexTileDTO } from './types';

export type HexPlayerPosition = {
  x: number;
  y: number;
  z: number;
  coord: HexCoord;
};

export type HexPlayerMoveInput = {
  forward: number;
  right: number;
};

type PlayerBuildingAnchor = Pick<HexBuildingDTO, 'buildingKey' | 'anchorQ' | 'anchorR'>;

const PLAYER_GROUND_OFFSET = 0.08;

function tilePosition(tile: HexTileDTO): HexPlayerPosition {
  const world = axialToWorld(tile, 1, tile.height + PLAYER_GROUND_OFFSET);
  return { ...world, coord: { q: tile.q, r: tile.r } };
}

function cleanZero(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : value;
}

export function getHexPlayerSpawn({
  tiles,
  buildings,
}: {
  tiles: HexTileDTO[];
  buildings: PlayerBuildingAnchor[];
}): HexPlayerPosition {
  const unlocked = tiles.filter((tile) => tile.unlocked);
  const unlockedByKey = new Map(unlocked.map((tile) => [hexKey(tile), tile]));
  const home = buildings.find((building) => building.buildingKey === 'home');

  if (home) {
    const homeTile = unlockedByKey.get(`${home.anchorQ}:${home.anchorR}`);
    if (homeTile) return tilePosition(homeTile);
  }

  if (unlocked.length > 0) {
    const worlds = unlocked.map((tile) => ({ tile, world: axialToWorld(tile) }));
    const minX = Math.min(...worlds.map(({ world }) => world.x));
    const maxX = Math.max(...worlds.map(({ world }) => world.x));
    const minZ = Math.min(...worlds.map(({ world }) => world.z));
    const maxZ = Math.max(...worlds.map(({ world }) => world.z));
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const nearest = worlds.reduce((best, candidate) => {
      const bestDistance = (best.world.x - centerX) ** 2 + (best.world.z - centerZ) ** 2;
      const candidateDistance = (candidate.world.x - centerX) ** 2 + (candidate.world.z - centerZ) ** 2;
      return candidateDistance < bestDistance ? candidate : best;
    });
    return tilePosition(nearest.tile);
  }

  return { x: 0, y: PLAYER_GROUND_OFFSET, z: 0, coord: { q: 0, r: 0 } };
}

export function getCameraRelativeMoveVector(
  input: HexPlayerMoveInput,
  cameraForward: { x: number; z: number },
): { x: number; z: number } {
  const cameraLength = Math.hypot(cameraForward.x, cameraForward.z);
  if (cameraLength < 1e-9) return { x: 0, z: 0 };

  const forwardX = cameraForward.x / cameraLength;
  const forwardZ = cameraForward.z / cameraLength;
  const rightX = -forwardZ;
  const rightZ = forwardX;
  const x = forwardX * input.forward + rightX * input.right;
  const z = forwardZ * input.forward + rightZ * input.right;
  const length = Math.hypot(x, z);

  if (length < 1e-9) return { x: 0, z: 0 };
  return { x: cleanZero(x / length), z: cleanZero(z / length) };
}

export function resolveWalkablePlayerPosition({
  current,
  proposed,
  tiles,
}: {
  current: HexPlayerPosition;
  proposed: { x: number; z: number };
  tiles: HexTileDTO[];
}): HexPlayerPosition {
  const coord = worldToAxial(proposed.x, proposed.z);
  const tile = tiles.find((candidate) => candidate.q === coord.q && candidate.r === coord.r && candidate.unlocked);
  if (!tile) return current;
  return {
    x: proposed.x,
    y: tile.height + PLAYER_GROUND_OFFSET,
    z: proposed.z,
    coord,
  };
}
