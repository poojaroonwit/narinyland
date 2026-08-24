import type { NaturalTerrainBoundaryEdge } from './natural-terrain';

export type IslandCliffMeshData = {
  positions: number[];
  indices: number[];
  colors: number[];
};

type CliffVertexProfile = {
  soilLipDepth: number;
  rockWallDepth: number;
  lowerTaper: number;
  erosionJitter: number;
};

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

function vertexKey(point: [number, number, number]): string {
  return `${Math.round(point[0] * 100000)}:${Math.round(point[1] * 100000)}:${Math.round(point[2] * 100000)}`;
}

function profileFor(point: [number, number, number], seed: string): CliffVertexProfile {
  const key = `${seed}:cliff:${vertexKey(point)}`;
  return {
    soilLipDepth: 0.16 + ratio(`${key}:soil`) * 0.12,
    rockWallDepth: 1.35 + ratio(`${key}:rock`) * 1.45,
    lowerTaper: 0.62 + ratio(`${key}:taper`) * 0.16,
    erosionJitter: (ratio(`${key}:erosion`) * 2 - 1) * 0.08,
  };
}

function averageBoundaryCenter(edges: NaturalTerrainBoundaryEdge[]): [number, number] {
  if (edges.length === 0) return [0, 0];
  let x = 0;
  let z = 0;
  let count = 0;
  for (const edge of edges) {
    x += edge.start[0] + edge.end[0];
    z += edge.start[2] + edge.end[2];
    count += 2;
  }
  return [x / count, z / count];
}

function radialDirection(point: [number, number, number], center: [number, number]): [number, number] {
  const dx = point[0] - center[0];
  const dz = point[2] - center[1];
  const length = Math.hypot(dx, dz) || 1;
  return [dx / length, dz / length];
}

function soilPoint(
  top: [number, number, number],
  center: [number, number],
  profile: CliffVertexProfile,
): [number, number, number] {
  const [rx, rz] = radialDirection(top, center);
  const erosion = profile.erosionJitter * 0.35;
  return [
    top[0] + rx * erosion,
    top[1] - profile.soilLipDepth,
    top[2] + rz * erosion,
  ];
}

function rockBottomPoint(
  top: [number, number, number],
  center: [number, number],
  profile: CliffVertexProfile,
): [number, number, number] {
  const [rx, rz] = radialDirection(top, center);
  const taperedX = center[0] + (top[0] - center[0]) * profile.lowerTaper;
  const taperedZ = center[1] + (top[2] - center[1]) * profile.lowerTaper;
  return [
    taperedX + rx * profile.erosionJitter,
    top[1] - profile.soilLipDepth - profile.rockWallDepth,
    taperedZ + rz * profile.erosionJitter,
  ];
}

function pushVertex(
  positions: number[],
  colors: number[],
  point: [number, number, number],
  color: [number, number, number],
): number {
  const index = positions.length / 3;
  positions.push(...point);
  colors.push(...color);
  return index;
}

export function buildIslandCliffMesh(
  edges: NaturalTerrainBoundaryEdge[],
  seed: string,
): IslandCliffMeshData {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  if (edges.length === 0) return { positions, indices, colors };

  const center = averageBoundaryCenter(edges);
  const earthTop: [number, number, number] = [0.29, 0.22, 0.14];
  const earthLower: [number, number, number] = [0.24, 0.17, 0.12];
  const rockUpper: [number, number, number] = [0.34, 0.34, 0.31];
  const rockLower: [number, number, number] = [0.22, 0.23, 0.22];

  for (const edge of edges) {
    const startProfile = profileFor(edge.start, seed);
    const endProfile = profileFor(edge.end, seed);
    const startSoil = soilPoint(edge.start, center, startProfile);
    const endSoil = soilPoint(edge.end, center, endProfile);
    const startRockBottom = rockBottomPoint(edge.start, center, startProfile);
    const endRockBottom = rockBottomPoint(edge.end, center, endProfile);

    const topStart = pushVertex(positions, colors, edge.start, earthTop);
    const topEnd = pushVertex(positions, colors, edge.end, earthTop);
    const soilStart = pushVertex(positions, colors, startSoil, earthLower);
    const soilEnd = pushVertex(positions, colors, endSoil, earthLower);
    const rockStart = pushVertex(positions, colors, startRockBottom, rockLower);
    const rockEnd = pushVertex(positions, colors, endRockBottom, rockLower);

    indices.push(topStart, soilStart, topEnd, topEnd, soilStart, soilEnd);

    const rockTopStart = pushVertex(positions, colors, startSoil, rockUpper);
    const rockTopEnd = pushVertex(positions, colors, endSoil, rockUpper);
    indices.push(rockTopStart, rockStart, rockTopEnd, rockTopEnd, rockStart, rockEnd);
  }

  return { positions, indices, colors };
}
