"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { getUnlockedIslandBounds } from '@/lib/hex-world/camera';
import { buildIslandCliffMesh } from '@/lib/hex-world/island-boundary';
import { buildFloatingIslandFragmentPlacements } from '@/lib/hex-world/floating-island-composition';
import { buildNaturalTerrainMesh, type NaturalTerrainMaterial } from '@/lib/hex-world/natural-terrain';
import { buildExplorePBRVegetationScatter, buildPBRVegetationScatter, type HexPBRVegetationKind, type HexPBRVegetationPlacement } from '@/lib/hex-world/pbr/vegetation-scatter';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import type { HexViewMode } from '@/lib/hex-world/view-mode';

// Procedural storybook rendering: no photographs, texture maps, HDR environments,
// normal maps, GLTF vegetation or online assets. Original terrain geometry remains
// authoritative, so the art style cannot change movement or build placement.
export const STORYBOOK_COLORS = {
  grass: '#a8c792',
  grassLight: '#bdd8a3',
  soil: '#d9b893',
  path: '#e3d3ab',
  stone: '#bcc5b2',
  water: '#96cdd0',
  clay: '#d7b292',
  cliffUpper: '#bea78e',
  cliffLower: '#a79788',
  tree: '#83ad80',
  treeLight: '#b0cfa0',
  shrub: '#92b68b',
  trunk: '#97775e',
  stoneProp: '#d3c9b5',
  flower: '#e9b2a5',
} as const;

const terrainIndex: Record<NaturalTerrainMaterial, number> = { grass: 0, soil: 1, path: 2, stone: 3, water: 4 };
const cliffIndex = { soil: 0, upperRock: 1, lowerRock: 2 } as const;

function useTerrainGeometry(tiles: HexTileDTO[], seed: string) {
  const data = useMemo(() => buildNaturalTerrainMesh(tiles, seed), [tiles, seed]);
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    next.setIndex(data.indices);
    for (const group of data.groups) next.addGroup(group.start, group.count, terrainIndex[group.material]);
    next.computeVertexNormals();
    next.computeBoundingSphere();
    return next;
  }, [data]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return { data, geometry };
}

export function HexStorybookTerrain({ tiles, seed, profile }: { tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile }) {
  const { data, geometry } = useTerrainGeometry(tiles, seed);
  if (!data.indices.length) return null;
  return (
    <mesh name="storybook-terrain" geometry={geometry} castShadow={profile.name !== 'mobile'} receiveShadow raycast={() => {}}>
      <meshStandardMaterial attach="material-0" color={STORYBOOK_COLORS.grass} roughness={1} metalness={0} flatShading />
      <meshStandardMaterial attach="material-1" color={STORYBOOK_COLORS.soil} roughness={1} metalness={0} flatShading />
      <meshStandardMaterial attach="material-2" color={STORYBOOK_COLORS.path} roughness={1} metalness={0} flatShading />
      <meshStandardMaterial attach="material-3" color={STORYBOOK_COLORS.stone} roughness={1} metalness={0} flatShading />
      <meshStandardMaterial attach="material-4" color={STORYBOOK_COLORS.water} roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

export function HexStorybookCliff({ tiles, seed, profile }: { tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile }) {
  const terrain = useMemo(() => buildNaturalTerrainMesh(tiles, seed), [tiles, seed]);
  const shell = useMemo(() => buildIslandCliffMesh(terrain.boundaryEdges, seed), [terrain.boundaryEdges, seed]);
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(shell.positions, 3));
    next.setIndex(shell.indices);
    for (const group of shell.groups) next.addGroup(group.start, group.count, cliffIndex[group.material]);
    next.computeVertexNormals();
    next.computeBoundingSphere();
    return next;
  }, [shell]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  if (!shell.indices.length) return null;
  return (
    <mesh name="storybook-cliff" geometry={geometry} castShadow={profile.name !== 'mobile'} receiveShadow raycast={() => {}}>
      <meshStandardMaterial attach="material-0" color={STORYBOOK_COLORS.clay} roughness={1} flatShading />
      <meshStandardMaterial attach="material-1" color={STORYBOOK_COLORS.cliffUpper} roughness={1} flatShading />
      <meshStandardMaterial attach="material-2" color={STORYBOOK_COLORS.cliffLower} roughness={1} flatShading />
    </mesh>
  );
}

export function HexStorybookFragments({ tiles, seed, profile }: { tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile }) {
  const bounds = useMemo(() => getUnlockedIslandBounds(tiles), [tiles]);
  const placements = useMemo(() => buildFloatingIslandFragmentPlacements({ bounds, seed, quality: profile.name }), [bounds, seed, profile.name]);
  return (
    <group name="storybook-floating-stones">
      {placements.map((fragment, index) => (
        <mesh key={index} position={fragment.position} rotation={fragment.rotation} scale={fragment.scale * 0.9} castShadow={profile.name !== 'mobile'} raycast={() => {}}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={index % 2 ? '#c6b49d' : '#d8c5a9'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

type PartShape = 'trunk' | 'crown' | 'crown-light' | 'shrub' | 'fern' | 'grass' | 'rock' | 'stump' | 'blossom';
type StorybookPart = {
  kind: HexPBRVegetationKind;
  shape: PartShape;
  color: string;
  lift: number;
  lateral?: number;
  depth?: number;
  scale: [number, number, number];
};
const PARTS: readonly StorybookPart[] = [
  { kind: 'tree', shape: 'trunk', color: STORYBOOK_COLORS.trunk, lift: 0.55, scale: [0.16, 0.53, 0.16] },
  { kind: 'tree', shape: 'crown', color: STORYBOOK_COLORS.tree, lift: 1.4, scale: [0.73, 0.65, 0.73] },
  { kind: 'tree', shape: 'crown-light', color: STORYBOOK_COLORS.treeLight, lift: 1.86, lateral: 0.17, scale: [0.5, 0.44, 0.48] },
  { kind: 'shrub', shape: 'shrub', color: STORYBOOK_COLORS.shrub, lift: 0.38, scale: [0.66, 0.48, 0.61] },
  { kind: 'fern', shape: 'fern', color: '#92b487', lift: 0.25, scale: [0.36, 0.44, 0.36] },
  { kind: 'grassTuft', shape: 'grass', color: '#b0cf91', lift: 0.16, scale: [0.27, 0.31, 0.26] },
  { kind: 'rockSet', shape: 'rock', color: STORYBOOK_COLORS.stoneProp, lift: 0.18, scale: [0.56, 0.36, 0.42] },
  { kind: 'stump', shape: 'stump', color: STORYBOOK_COLORS.trunk, lift: 0.18, scale: [0.34, 0.37, 0.34] },
];

function StorybookScatterPart({ placements, part, profile }: {
  placements: HexPBRVegetationPlacement[];
  part: StorybookPart;
  profile: HexQualityProfile;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((placement, index) => {
      const scale = placement.scale;
      const angle = placement.rotation;
      // Rotate the off-center crown accent along with the tree for a natural silhouette.
      const x = (part.lateral ?? 0) * scale;
      const z = (part.depth ?? 0) * scale;
      dummy.position.set(
        placement.x + Math.cos(angle) * x - Math.sin(angle) * z,
        placement.y + part.lift * scale,
        placement.z + Math.sin(angle) * x + Math.cos(angle) * z,
      );
      dummy.rotation.set(0, angle, 0);
      dummy.scale.set(part.scale[0] * scale, part.scale[1] * scale, part.scale[2] * scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, part, placements]);

  if (!placements.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} castShadow={profile.name !== 'mobile'} receiveShadow raycast={() => {}}>
      {part.shape === 'trunk' || part.shape === 'stump'
        ? <cylinderGeometry args={[1, 1.18, 2, 7]} />
        : part.shape === 'fern' || part.shape === 'grass'
          ? <coneGeometry args={[1, 2, 7]} />
          : part.shape === 'rock'
            ? <dodecahedronGeometry args={[1, 0]} />
            : <sphereGeometry args={[1, 9, 7]} />}
      <meshStandardMaterial color={part.color} roughness={1} metalness={0} flatShading />
    </instancedMesh>
  );
}

export function HexStorybookVegetation({ tiles, buildings, seed, profile, presentation = 'world' }: {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  seed: string;
  profile: HexQualityProfile;
  presentation?: HexViewMode;
}) {
  // Reuse deterministic scatter and building avoidance without loading its PBR assets.
  const scatter = useMemo(() => presentation === 'person'
    ? buildExplorePBRVegetationScatter({ tiles, buildings, seed, profile })
    : buildPBRVegetationScatter({ tiles, buildings, seed, profile }), [tiles, buildings, seed, profile, presentation]);
  const buckets = useMemo(() => {
    const groups = new Map<HexPBRVegetationKind, HexPBRVegetationPlacement[]>();
    for (const placement of scatter) groups.set(placement.kind, [...(groups.get(placement.kind) ?? []), placement]);
    return groups;
  }, [scatter]);
  return (
    <group name="storybook-vegetation">
      {PARTS.map((part) => (
        <StorybookScatterPart key={part.shape} placements={buckets.get(part.kind) ?? []} part={part} profile={profile} />
      ))}
    </group>
  );
}

export function HexStorybookWater({ tiles, profile }: { tiles: HexTileDTO[]; profile: HexQualityProfile }) {
  const water = useMemo(() => tiles.filter((tile) => tile.unlocked && tile.terrainType === 'water'), [tiles]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    water.forEach((tile, index) => {
      const world = axialToWorld(tile, 1, tile.height + 0.08);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.set(0, Math.PI / 6, 0);
      dummy.scale.set(0.94, 0.018, 0.94);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, water]);
  if (!water.length) return null;
  return (
    <group name="storybook-water">
      <instancedMesh ref={meshRef} args={[undefined, undefined, water.length]} raycast={() => {}} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.08, 6]} />
        <meshStandardMaterial color={STORYBOOK_COLORS.water} roughness={0.78} metalness={0} transparent opacity={0.89} depthWrite={false} />
      </instancedMesh>
      {profile.name !== 'mobile' && water.slice(0, 3).map((tile) => {
        const world = axialToWorld(tile, 1, tile.height + 0.125);
        return (
          <mesh key={`${tile.q}:${tile.r}`} position={[world.x, world.y, world.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
            <ringGeometry args={[0.28, 0.31, 18]} />
            <meshBasicMaterial color="#e8f6eb" transparent opacity={0.63} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
