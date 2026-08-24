"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld, hexKey, hexNeighbors } from '@/lib/hex-world/hex-grid';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import { deterministicVisualRatio, HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type RockPlacement = {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: [number, number, number];
};

export function getBoundaryTiles(tiles: HexTileDTO[]): HexTileDTO[] {
  const unlocked = tiles.filter((tile) => tile.unlocked);
  const unlockedKeys = new Set(unlocked.map(hexKey));
  return unlocked.filter((tile) => hexNeighbors(tile).some((neighbor) => !unlockedKeys.has(hexKey(neighbor))));
}

export function HexIslandUnderside({
  tiles,
  seed,
  profile,
}: {
  tiles: HexTileDTO[];
  seed: string;
  profile?: HexQualityProfile;
}) {
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const mossRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const placements = useMemo(() => {
    const boundary = getBoundaryTiles(tiles);
    const unlocked = tiles.filter((tile) => tile.unlocked);
    const boundaryLimit = profile?.name === 'high' ? 54 : profile?.name === 'medium' ? 40 : 28;
    const coreLimit = profile?.name === 'mobile' ? 6 : 10;
    const stride = Math.max(1, Math.ceil(boundary.length / Math.max(1, boundaryLimit)));
    const rocks: RockPlacement[] = [];
    const moss: RockPlacement[] = [];

    boundary.forEach((tile, index) => {
      if (index % stride !== 0) return;
      const world = axialToWorld(tile, 1, tile.height);
      const depth = 1.15 + deterministicVisualRatio(seed, tile.q, tile.r, 'edge-depth') * 1.45;
      const scale = 0.58 + deterministicVisualRatio(seed, tile.q, tile.r, 'edge-scale') * 0.5;
      const rotation = deterministicVisualRatio(seed, tile.q, tile.r, 'edge-rotation') * Math.PI * 2;
      rocks.push({
        x: world.x,
        y: world.y - 0.7 - depth * 0.72,
        z: world.z,
        rotation,
        scale: [scale * 1.05, depth, scale],
      });
      if (profile?.name !== 'mobile' && moss.length < Math.ceil(boundaryLimit * 0.45)) {
        moss.push({
          x: world.x,
          y: world.y - 0.12,
          z: world.z,
          rotation,
          scale: [scale * 0.78, 0.09, scale * 0.5],
        });
      }
    });

    const coreStride = Math.max(1, Math.ceil(unlocked.length / Math.max(1, coreLimit)));
    unlocked.forEach((tile, index) => {
      if (index % coreStride !== 0 || rocks.length >= boundaryLimit + coreLimit) return;
      const world = axialToWorld(tile, 1, tile.height);
      const ratio = deterministicVisualRatio(seed, tile.q, tile.r, 'core');
      rocks.push({
        x: world.x * 0.88,
        y: world.y - 2.1 - ratio * 1.6,
        z: world.z * 0.88,
        rotation: ratio * Math.PI * 2,
        scale: [0.7 + ratio * 0.55, 1.35 + ratio * 1.35, 0.68 + ratio * 0.5],
      });
    });

    return { rocks, moss };
  }, [profile?.name, seed, tiles]);

  useLayoutEffect(() => {
    const rockMesh = rockRef.current;
    if (rockMesh) {
      placements.rocks.forEach((placement, index) => {
        dummy.position.set(placement.x, placement.y, placement.z);
        dummy.rotation.set(0.12, placement.rotation, 0.08);
        dummy.scale.set(...placement.scale);
        dummy.updateMatrix();
        rockMesh.setMatrixAt(index, dummy.matrix);
      });
      rockMesh.instanceMatrix.needsUpdate = true;
    }

    const mossMesh = mossRef.current;
    if (mossMesh) {
      placements.moss.forEach((placement, index) => {
        dummy.position.set(placement.x, placement.y, placement.z);
        dummy.rotation.set(0, placement.rotation, 0);
        dummy.scale.set(...placement.scale);
        dummy.updateMatrix();
        mossMesh.setMatrixAt(index, dummy.matrix);
      });
      mossMesh.instanceMatrix.needsUpdate = true;
    }
  }, [dummy, placements]);

  return (
    <group>
      {!!placements.rocks.length && (
        <instancedMesh ref={rockRef} args={[undefined, undefined, placements.rocks.length]} receiveShadow raycast={() => {}}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={HEX_VISUAL_THEME.terrain.stone.dark} roughness={1} />
        </instancedMesh>
      )}
      {!!placements.moss.length && (
        <instancedMesh ref={mossRef} args={[undefined, undefined, placements.moss.length]} raycast={() => {}}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leafDark} roughness={1} />
        </instancedMesh>
      )}
    </group>
  );
}
