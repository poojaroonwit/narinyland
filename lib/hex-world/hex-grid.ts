import type { HexCoord, HexRotation } from './types';

export const HEX_SIZE = 1;

const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey({ q, r }: HexCoord): string {
  return `${q}:${r}`;
}

export function hexNeighbors({ q, r }: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((direction) => ({ q: q + direction.q, r: r + direction.r }));
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -(a.q + a.r) + (b.q + b.r);
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

export function rotateHexOffset({ q, r }: HexCoord, rotation: HexRotation): HexCoord {
  let next = { q, r };
  for (let step = 0; step < rotation; step += 1) {
    next = { q: -next.r, r: next.q + next.r };
  }
  return next;
}

export function axialToWorld({ q, r }: HexCoord, size = HEX_SIZE, height = 0) {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: height,
    z: size * 1.5 * r,
  };
}

function cubeRound(x: number, y: number, z: number): { x: number; y: number; z: number } {
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { x: rx, y: ry, z: rz };
}

export function worldToAxial(x: number, z: number, size = HEX_SIZE): HexCoord {
  const q = ((Math.sqrt(3) / 3) * x - z / 3) / size;
  const r = ((2 / 3) * z) / size;
  const cube = cubeRound(q, -q - r, r);
  return { q: cube.x, r: cube.z };
}

export function isConnectedHexSet(coords: HexCoord[]): boolean {
  if (coords.length <= 1) return true;
  const allowed = new Set(coords.map(hexKey));
  const visited = new Set<string>();
  const queue: HexCoord[] = [coords[0]];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = hexKey(current);
    if (visited.has(key)) continue;
    visited.add(key);
    for (const neighbor of hexNeighbors(current)) {
      const neighborKey = hexKey(neighbor);
      if (allowed.has(neighborKey) && !visited.has(neighborKey)) queue.push(neighbor);
    }
  }

  return visited.size === allowed.size;
}
