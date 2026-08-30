import type { NaturalTerrainBoundaryEdge } from './natural-terrain';

export type IslandCliffMaterial = 'soil' | 'upperRock' | 'lowerRock';
export type IslandCliffMaterialGroup = { material: IslandCliffMaterial; start: number; count: number };

export type IslandCliffMeshData = {
  positions: number[];
  indices: number[];
  colors: number[];
  uvs: number[];
  groups: IslandCliffMaterialGroup[];
};

type CliffVertexProfile = {
  grassOverhang: number;
  soilLipDepth: number;
  upperRockOffset: number;
  midRockDepth: number;
  lowerTaper: number;
  spireDepth: number;
  erosionJitter: number;
  spireInfluence: number;
};

type LowerContourEdge = {
  lowerStartIndex: number;
  lowerEndIndex: number;
  lowerStart: [number, number, number];
  lowerEnd: [number, number, number];
  outward: [number, number];
  edgeIndex: number;
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function ratio(key: string): number { return stableHash(key) / 0xffffffff; }
function vertexKey(point: [number, number, number]): string { return `${Math.round(point[0] * 100000)}:${Math.round(point[1] * 100000)}:${Math.round(point[2] * 100000)}`; }
function averageBoundaryCenter(edges: NaturalTerrainBoundaryEdge[]): [number, number] {
  if (!edges.length) return [0, 0];
  let x = 0, z = 0, count = 0;
  for (const edge of edges) { x += edge.start[0] + edge.end[0]; z += edge.start[2] + edge.end[2]; count += 2; }
  return [x / count, z / count];
}
function radialDirection(point: [number, number, number], center: [number, number]): [number, number] {
  const dx = point[0] - center[0];
  const dz = point[2] - center[1];
  const length = Math.hypot(dx, dz) || 1;
  return [dx / length, dz / length];
}
function spireRegion(point: [number, number, number], center: [number, number]): number {
  const angle = Math.atan2(point[2] - center[1], point[0] - center[0]);
  const normalized = (angle + Math.PI) / (Math.PI * 2);
  return Math.min(4, Math.floor(normalized * 5));
}
function regionalSpireInfluence(region: number, seed: string): number {
  const primary = stableHash(`${seed}:cliff-primary`) % 5;
  const secondaryOffset = 2 + (stableHash(`${seed}:cliff-secondary-offset`) % 3);
  const secondary = (primary + secondaryOffset) % 5;
  if (region === primary) return 1;
  if (region === secondary) return 0.86;
  return 0.58 + ratio(`${seed}:cliff-region:${region}:influence`) * 0.18;
}
function profileFor(point: [number, number, number], center: [number, number], seed: string): CliffVertexProfile {
  const key = `${seed}:cliff:${vertexKey(point)}`;
  const region = spireRegion(point, center);
  const regionKey = `${seed}:cliff-region:${region}`;
  const localInfluence = 0.94 + ratio(`${key}:local-influence`) * 0.06;
  return {
    grassOverhang: 0.05 + ratio(`${key}:grass`) * 0.11,
    soilLipDepth: 0.22 + ratio(`${key}:soil`) * 0.2,
    upperRockOffset: -0.08 + ratio(`${regionKey}:upper-offset`) * 0.18,
    midRockDepth: 1.7 + ratio(`${regionKey}:mid-depth`) * 1.1,
    lowerTaper: 0.24 + ratio(`${regionKey}:taper`) * 0.2,
    spireDepth: 5.5 + ratio(`${regionKey}:spire-depth`) * 2.4,
    erosionJitter: (ratio(`${key}:erosion`) * 2 - 1) * 0.16,
    spireInfluence: regionalSpireInfluence(region, seed) * localInfluence,
  };
}
function soilPoint(top: [number, number, number], center: [number, number], profile: CliffVertexProfile): [number, number, number] {
  const [rx, rz] = radialDirection(top, center);
  const inset = profile.grassOverhang - profile.erosionJitter * 0.18;
  return [top[0] - rx * inset, top[1] - profile.soilLipDepth, top[2] - rz * inset];
}
function midRockPoint(top: [number, number, number], center: [number, number], profile: CliffVertexProfile): [number, number, number] {
  const [rx, rz] = radialDirection(top, center);
  const shoulderTaper = Math.min(0.86, 0.68 + profile.lowerTaper * 0.28);
  const taperedX = center[0] + (top[0] - center[0]) * shoulderTaper;
  const taperedZ = center[1] + (top[2] - center[1]) * shoulderTaper;
  return [
    taperedX + rx * (profile.upperRockOffset + profile.erosionJitter * 0.45),
    top[1] - profile.soilLipDepth - profile.midRockDepth,
    taperedZ + rz * (profile.upperRockOffset + profile.erosionJitter * 0.45),
  ];
}
function lowerRockPoint(top: [number, number, number], center: [number, number], profile: CliffVertexProfile): [number, number, number] {
  const [rx, rz] = radialDirection(top, center);
  const taperedX = center[0] + (top[0] - center[0]) * profile.lowerTaper;
  const taperedZ = center[1] + (top[2] - center[1]) * profile.lowerTaper;
  const depth = profile.spireDepth * profile.spireInfluence;
  return [
    taperedX + rx * profile.erosionJitter,
    top[1] - profile.soilLipDepth - profile.midRockDepth - depth,
    taperedZ + rz * profile.erosionJitter,
  ];
}
function innerCorePoint(
  lower: [number, number, number], center: [number, number], seed: string, edgeIndex: number, endpoint: 'start' | 'end',
): [number, number, number] {
  const key = `${seed}:underside-core:${edgeIndex}:${endpoint}`;
  const radialScale = 0.08 + ratio(`${key}:radial`) * 0.08;
  const sink = 0.45 + ratio(`${key}:sink`) * 0.65;
  return [
    center[0] + (lower[0] - center[0]) * radialScale,
    lower[1] - sink,
    center[1] + (lower[2] - center[1]) * radialScale,
  ];
}
function projectUv(point: [number, number, number], outward: [number, number]): [number, number] {
  const horizontal = Math.abs(outward[0]) > Math.abs(outward[1]) ? point[2] : point[0];
  return [horizontal * 0.31, point[1] * 0.28];
}
function pushVertex(
  positions: number[], colors: number[], uvs: number[], point: [number, number, number],
  color: [number, number, number], outward: [number, number],
): number {
  const index = positions.length / 3;
  positions.push(...point);
  colors.push(...color);
  uvs.push(...projectUv(point, outward));
  return index;
}

export function buildIslandCliffMesh(edges: NaturalTerrainBoundaryEdge[], seed: string): IslandCliffMeshData {
  const positions: number[] = [], colors: number[] = [], uvs: number[] = [];
  const soilIndices: number[] = [], upperRockIndices: number[] = [], lowerRockIndices: number[] = [];
  if (!edges.length) return { positions, indices: [], colors, uvs, groups: [] };

  const center = averageBoundaryCenter(edges);
  const earthTop: [number, number, number] = [0.31, 0.24, 0.15];
  const earthLower: [number, number, number] = [0.25, 0.18, 0.12];
  const rockUpper: [number, number, number] = [0.35, 0.35, 0.32];
  const rockLower: [number, number, number] = [0.21, 0.24, 0.25];
  const lowerContourEdges: LowerContourEdge[] = [];

  edges.forEach((edge, edgeIndex) => {
    const startProfile = profileFor(edge.start, center, seed);
    const endProfile = profileFor(edge.end, center, seed);
    const startSoil = soilPoint(edge.start, center, startProfile);
    const endSoil = soilPoint(edge.end, center, endProfile);
    const startMidRock = midRockPoint(edge.start, center, startProfile);
    const endMidRock = midRockPoint(edge.end, center, endProfile);
    const startLowerRock = lowerRockPoint(edge.start, center, startProfile);
    const endLowerRock = lowerRockPoint(edge.end, center, endProfile);

    const topStart = pushVertex(positions, colors, uvs, edge.start, earthTop, edge.outward);
    const topEnd = pushVertex(positions, colors, uvs, edge.end, earthTop, edge.outward);
    const soilStart = pushVertex(positions, colors, uvs, startSoil, earthLower, edge.outward);
    const soilEnd = pushVertex(positions, colors, uvs, endSoil, earthLower, edge.outward);
    soilIndices.push(topStart, soilStart, topEnd, topEnd, soilStart, soilEnd);

    const upperStart = pushVertex(positions, colors, uvs, startSoil, rockUpper, edge.outward);
    const upperEnd = pushVertex(positions, colors, uvs, endSoil, rockUpper, edge.outward);
    const midStart = pushVertex(positions, colors, uvs, startMidRock, rockUpper, edge.outward);
    const midEnd = pushVertex(positions, colors, uvs, endMidRock, rockUpper, edge.outward);
    upperRockIndices.push(upperStart, midStart, upperEnd, upperEnd, midStart, midEnd);

    const lowerTopStart = pushVertex(positions, colors, uvs, startMidRock, rockLower, edge.outward);
    const lowerTopEnd = pushVertex(positions, colors, uvs, endMidRock, rockLower, edge.outward);
    const lowerStart = pushVertex(positions, colors, uvs, startLowerRock, rockLower, edge.outward);
    const lowerEnd = pushVertex(positions, colors, uvs, endLowerRock, rockLower, edge.outward);
    lowerRockIndices.push(lowerTopStart, lowerStart, lowerTopEnd, lowerTopEnd, lowerStart, lowerEnd);
    lowerContourEdges.push({
      lowerStartIndex: lowerStart,
      lowerEndIndex: lowerEnd,
      lowerStart: startLowerRock,
      lowerEnd: endLowerRock,
      outward: edge.outward,
      edgeIndex,
    });
  });

  const deepestContourY = Math.min(...lowerContourEdges.flatMap((edge) => [edge.lowerStart[1], edge.lowerEnd[1]]));
  const hubJitterX = (ratio(`${seed}:underside-hub:x`) * 2 - 1) * 0.16;
  const hubJitterZ = (ratio(`${seed}:underside-hub:z`) * 2 - 1) * 0.16;
  const hubPoint: [number, number, number] = [
    center[0] + hubJitterX,
    Math.max(-13.1, deepestContourY - 0.85),
    center[1] + hubJitterZ,
  ];
  const hubIndex = pushVertex(positions, colors, uvs, hubPoint, rockLower, [1, 0]);

  for (const contour of lowerContourEdges) {
    const innerStartPoint = innerCorePoint(contour.lowerStart, center, seed, contour.edgeIndex, 'start');
    const innerEndPoint = innerCorePoint(contour.lowerEnd, center, seed, contour.edgeIndex, 'end');
    const innerStart = pushVertex(positions, colors, uvs, innerStartPoint, rockLower, contour.outward);
    const innerEnd = pushVertex(positions, colors, uvs, innerEndPoint, rockLower, contour.outward);

    lowerRockIndices.push(
      contour.lowerStartIndex, innerStart, contour.lowerEndIndex,
      contour.lowerEndIndex, innerStart, innerEnd,
      innerStart, hubIndex, innerEnd,
    );
  }

  const indices = [...soilIndices, ...upperRockIndices, ...lowerRockIndices];
  const groups: IslandCliffMaterialGroup[] = [];
  if (soilIndices.length) groups.push({ material: 'soil', start: 0, count: soilIndices.length });
  if (upperRockIndices.length) groups.push({ material: 'upperRock', start: soilIndices.length, count: upperRockIndices.length });
  if (lowerRockIndices.length) groups.push({ material: 'lowerRock', start: soilIndices.length + upperRockIndices.length, count: lowerRockIndices.length });
  return { positions, indices, colors, uvs, groups };
}
