import { axialToWorld, hexKey, hexNeighbors } from './hex-grid';
import { generateStarterWorld } from './generator';
import type { HexCoord, HexExpansionDTO, HexTileDTO, HexWorldSnapshot } from './types';

export type HexExpansionDefinition = Omit<HexExpansionDTO, 'eligible'> & { directionIndex: number };
export type HexExpansionPlacementResult =
  | { ok: true }
  | { ok: false; code: 'expansion_overlap' | 'expansion_disconnected' };

const DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

const TIERS = [
  { tier: 1 as const, radius: 1, pointCost: 100 as const },
  { tier: 2 as const, radius: 2, pointCost: 250 as const },
  { tier: 3 as const, radius: 3, pointCost: 500 as const },
];

export function getExpansionTierConfig(tier: 1 | 2 | 3) {
  return TIERS.find((item) => item.tier === tier) ?? TIERS[0];
}

function hexDisc(center: HexCoord, radius: number): HexCoord[] {
  const cells: HexCoord[] = [];
  for (let dq = -radius; dq <= radius; dq += 1) {
    const minR = Math.max(-radius, -dq - radius);
    const maxR = Math.min(radius, -dq + radius);
    for (let dr = minR; dr <= maxR; dr += 1) cells.push({ q: center.q + dq, r: center.r + dr });
  }
  return cells;
}

export function getExpansionPlacementTiles(tier: 1 | 2 | 3, anchor: HexCoord): HexCoord[] {
  return hexDisc(anchor, getExpansionTierConfig(tier).radius);
}

function tileExpansionKey(tile: Pick<HexTileDTO, 'metadata'>): string | null {
  const value = tile.metadata?.expansionKey;
  return typeof value === 'string' && value ? value : null;
}

export function validateExpansionPlacement(
  cells: HexCoord[],
  worldTiles: HexTileDTO[],
  options: { ignoreExpansionKey?: string } = {},
): HexExpansionPlacementResult {
  const remaining = worldTiles.filter((tile) => {
    if (!tile.unlocked) return false;
    return !options.ignoreExpansionKey || tileExpansionKey(tile) !== options.ignoreExpansionKey;
  });
  const occupied = new Set(remaining.map(hexKey));
  if (cells.some((cell) => occupied.has(hexKey(cell)))) return { ok: false, code: 'expansion_overlap' };
  if (!touches(cells, occupied)) return { ok: false, code: 'expansion_disconnected' };
  return { ok: true };
}

function projection(coord: HexCoord, direction: HexCoord): number {
  const world = axialToWorld(coord);
  const dir = axialToWorld(direction);
  return world.x * dir.x + world.z * dir.z;
}

function findBoundary(coords: HexCoord[], direction: HexCoord): HexCoord {
  return [...coords].sort((a, b) => projection(b, direction) - projection(a, direction) || a.q - b.q || a.r - b.r)[0];
}

function touches(cells: HexCoord[], occupied: Set<string>): boolean {
  return cells.some((cell) => hexNeighbors(cell).some((neighbor) => occupied.has(hexKey(neighbor))));
}

export function getExpansionDefinitions(seed: string): HexExpansionDefinition[] {
  const starter = generateStarterWorld(seed).tiles.map(({ q, r }) => ({ q, r }));
  const definitions: HexExpansionDefinition[] = [];

  DIRECTIONS.forEach((direction, directionIndex) => {
    const occupied = new Set(starter.map(hexKey));
    let area = [...starter];

    for (const config of TIERS) {
      const boundary = findBoundary(area, direction);
      let shift = config.radius + 1;
      let cells: HexCoord[] = [];

      for (;;) {
        const center = { q: boundary.q + direction.q * shift, r: boundary.r + direction.r * shift };
        cells = hexDisc(center, config.radius);
        const overlaps = cells.some((cell) => occupied.has(hexKey(cell)));
        if (!overlaps && touches(cells, occupied)) break;
        shift += 1;
        if (shift > config.radius + 8) throw new Error('Could not place deterministic expansion cluster');
      }

      const expansionKey = `${config.tier}:${directionIndex}:0`;
      definitions.push({
        expansionKey,
        tier: config.tier,
        pointCost: config.pointCost,
        tiles: cells,
        directionIndex,
      });
      for (const cell of cells) occupied.add(hexKey(cell));
      area = [...area, ...cells];
    }
  });

  return definitions;
}

export function getEligibleExpansionDefinitions(
  snapshot: HexWorldSnapshot,
  purchasedExpansionKeys: Iterable<string> = [],
): HexExpansionDTO[] {
  const purchased = new Set(purchasedExpansionKeys);
  const unlocked = new Set(snapshot.tiles.filter((tile) => tile.unlocked).map(hexKey));

  return getExpansionDefinitions(snapshot.world.seed)
    .filter((definition) => !purchased.has(definition.expansionKey))
    .filter((definition) => definition.tiles.every((cell) => !unlocked.has(hexKey(cell))))
    .filter((definition) => touches(definition.tiles, unlocked))
    .map(({ directionIndex: _directionIndex, ...definition }) => ({ ...definition, eligible: true }));
}
