/**
 * Deterministic, client-side open-world terrain. No database state, network requests,
 * or world mutations: the protected couple homestead remains separately authoritative.
 */
export const OPEN_WORLD_SEED = 'narinyland-commons-v1';
export const OPEN_WORLD_CHUNK_SIZE = 24;
export const OPEN_WORLD_GRID_STEP = 2;
export const OPEN_WORLD_STREAM_RADIUS = 2;
export const OPEN_WORLD_MAX_CHUNKS = (OPEN_WORLD_STREAM_RADIUS * 2 + 1) ** 2;

export type OpenWorldChunkKey = { x: number; z: number; key: string };
export type OpenWorldBiome = 'village' | 'meadow' | 'forest' | 'lakeshore' | 'highlands';
export type OpenWorldLandmark = { id: string; title: string; hint: string; x: number; z: number; kind: 'village' | 'forest' | 'lake' | 'hills' };

export const OPEN_WORLD_LANDMARKS: readonly OpenWorldLandmark[] = [
  { id: 'commons', title: 'Willow Commons', hint: 'Our little village', x: 0, z: 0, kind: 'village' },
  { id: 'woods', title: 'Whispering Woods', hint: 'A trail of gentle trees', x: 52, z: 12, kind: 'forest' },
  { id: 'lake', title: 'Moonpetal Lake', hint: 'Still water and wildflowers', x: -48, z: -32, kind: 'lake' },
  { id: 'hills', title: 'Cloudberry Hills', hint: 'A quiet overlook', x: 12, z: 68, kind: 'hills' },
];

export function getOpenWorldChunkIndex(position: number): number {
  return Math.floor(position / OPEN_WORLD_CHUNK_SIZE);
}

export function getOpenWorldVisibleChunks(x: number, z: number, radius = OPEN_WORLD_STREAM_RADIUS): OpenWorldChunkKey[] {
  const boundedRadius = Number.isFinite(radius) ? Math.max(0, Math.min(OPEN_WORLD_STREAM_RADIUS, Math.floor(radius))) : OPEN_WORLD_STREAM_RADIUS;
  const cx = getOpenWorldChunkIndex(x);
  const cz = getOpenWorldChunkIndex(z);
  const chunks: OpenWorldChunkKey[] = [];
  for (let dz = -boundedRadius; dz <= boundedRadius; dz += 1) {
    for (let dx = -boundedRadius; dx <= boundedRadius; dx += 1) {
      const chunkX = cx + dx;
      const chunkZ = cz + dz;
      chunks.push({ x: chunkX, z: chunkZ, key: `${chunkX}:${chunkZ}` });
    }
  }
  return chunks.sort((a, b) => (a.x - cx) ** 2 + (a.z - cz) ** 2 - ((b.x - cx) ** 2 + (b.z - cz) ** 2) || a.x - b.x || a.z - b.z);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Continuous across chunk boundaries; the village is a deliberately walkable clearing. */
export function sampleOpenWorldHeight(x: number, z: number): number {
  const small = Math.sin(x * 0.11) * Math.cos(z * 0.09) * 0.48;
  const wide = Math.sin((x + z) * 0.037) * 0.85 + Math.cos((x - z) * 0.029) * 0.55;
  const hill = 2.1 * Math.exp(-(((x - 12) / 34) ** 2 + ((z - 70) / 32) ** 2));
  const villageBlend = smoothstep(9, 24, Math.hypot(x, z));
  const lakeDistance = Math.hypot(x + 48, z + 32);
  const lakeBasin = -1.8 * (1 - smoothstep(12, 26, lakeDistance));
  return (small + wide + hill) * villageBlend + lakeBasin;
}

export function getOpenWorldBiome(x: number, z: number): OpenWorldBiome {
  if (Math.hypot(x, z) < 20) return 'village';
  if (Math.hypot(x + 48, z + 32) < 31) return 'lakeshore';
  if (Math.hypot(x - 12, z - 68) < 33) return 'highlands';
  if (x > 25 || z > 32) return 'forest';
  return 'meadow';
}

export function isOpenWorldWalkable(x: number, z: number, fromX: number, fromZ: number): boolean {
  // Water is a visual landmark for this first slice, not a swimmable volume.
  if (Math.hypot(x + 48, z + 32) < 12.5) return false;
  // Keep the miniature village cottages solid rather than walking through them.
  // This uses the same placements as <Village /> without touching private Land data.
  const villageHouses = [{ x: -7, z: 2, radius: 1.75 }, { x: 7, z: 3, radius: 1.7 }, { x: 0, z: -8, radius: 1.75 }];
  if (villageHouses.some((house) => Math.hypot(x - house.x, z - house.z) < house.radius)) return false;
  return Math.abs(sampleOpenWorldHeight(x, z) - sampleOpenWorldHeight(fromX, fromZ)) <= 0.4;
}

export function openWorldStableRandom(x: number, z: number, salt = 0): number {
  // Coordinate hash is deterministic for negative coordinates and browser / Node.
  let h = 2166136261;
  const input = `${OPEN_WORLD_SEED}:${x}:${z}:${salt}`;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export type OpenWorldDecor = { x: number; y: number; z: number; kind: 'tree' | 'bush' | 'flower' | 'rock'; scale: number; angle: number };

export function getOpenWorldChunkDecor(chunkX: number, chunkZ: number): OpenWorldDecor[] {
  const candidates: OpenWorldDecor[] = [];
  // Fixed candidate count per chunk provides a predictable rendering budget.
  for (let i = 0; i < 18; i += 1) {
    const x = chunkX * OPEN_WORLD_CHUNK_SIZE + openWorldStableRandom(chunkX, chunkZ, i * 5 + 1) * OPEN_WORLD_CHUNK_SIZE;
    const z = chunkZ * OPEN_WORLD_CHUNK_SIZE + openWorldStableRandom(chunkX, chunkZ, i * 5 + 2) * OPEN_WORLD_CHUNK_SIZE;
    const biome = getOpenWorldBiome(x, z);
    if (biome === 'village' || Math.hypot(x + 48, z + 32) < 14) continue;
    // Preserve broad paths through the forest and the clearing around landmarks.
    if ((Math.abs(z - 12) < 2.5 && x > 12 && x < 55) || (Math.abs(x) < 2.2 && z > -12 && z < 80)) continue;
    const r = openWorldStableRandom(chunkX, chunkZ, i * 5 + 3);
    const kind: OpenWorldDecor['kind'] = biome === 'forest'
      ? r < 0.56 ? 'tree' : r < 0.77 ? 'bush' : r < 0.91 ? 'flower' : 'rock'
      : r < 0.2 ? 'tree' : r < 0.43 ? 'bush' : r < 0.84 ? 'flower' : 'rock';
    candidates.push({
      x, y: sampleOpenWorldHeight(x, z), z, kind,
      scale: 0.75 + openWorldStableRandom(chunkX, chunkZ, i * 5 + 4) * 0.5,
      angle: openWorldStableRandom(chunkX, chunkZ, i * 5 + 5) * Math.PI * 2,
    });
  }
  return candidates;
}

export function getNearestOpenWorldLandmark(x: number, z: number): OpenWorldLandmark {
  return OPEN_WORLD_LANDMARKS.reduce((best, landmark) =>
    Math.hypot(landmark.x - x, landmark.z - z) < Math.hypot(best.x - x, best.z - z) ? landmark : best,
  );
}
