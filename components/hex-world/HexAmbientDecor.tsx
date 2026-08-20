"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import type { HexTileDTO } from '@/lib/hex-world/types';

type Placement = { x: number; y: number; z: number; scale?: number; rotation?: number };

function getPlacement(tile: HexTileDTO, yOffset = 0): Placement {
  const world = axialToWorld({ q: tile.q, r: tile.r }, 1, tile.height + yOffset);
  return { x: world.x, y: world.y, z: world.z, rotation: ((tile.q * 17 + tile.r * 11) % 12) * 0.17 };
}

function InstanceBatch({
  placements,
  children,
  castShadow = false,
  receiveShadow = false,
}: {
  placements: Placement[];
  children: React.ReactNode;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((placement, index) => {
      dummy.position.set(placement.x, placement.y, placement.z);
      dummy.rotation.set(0, placement.rotation ?? 0, 0);
      dummy.scale.setScalar(placement.scale ?? 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, placements]);

  if (placements.length === 0) return null;
  return <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} castShadow={castShadow} receiveShadow={receiveShadow}>{children}</instancedMesh>;
}

export function HexAmbientDecor({ tiles }: { tiles: HexTileDTO[] }) {
  const decor = useMemo(() => {
    const trees: HexTileDTO[] = [];
    const rocks: HexTileDTO[] = [];
    const flowers: HexTileDTO[] = [];
    const paths: HexTileDTO[] = [];
    const gardens: HexTileDTO[] = [];

    for (const tile of tiles) {
      const decorType = tile.metadata?.decor;
      const feature = tile.metadata?.feature;
      if (decorType === 'tree') trees.push(tile);
      if (decorType === 'rock') rocks.push(tile);
      if (decorType === 'flower') flowers.push(tile);
      if (feature === 'path') paths.push(tile);
      if (feature === 'garden') gardens.push(tile);
    }
    return { trees, rocks, flowers, paths, gardens };
  }, [tiles]);

  const treeTrunks = decor.trees.map((tile) => ({ ...getPlacement(tile, 0.46), scale: 0.9 }));
  const treeCanopies = decor.trees.map((tile) => ({ ...getPlacement(tile, 1.25), scale: 0.68 + ((Math.abs(tile.q + tile.r) % 3) * 0.06) }));
  const rockPlacements = decor.rocks.map((tile) => ({ ...getPlacement(tile, 0.25), scale: 0.32 + ((Math.abs(tile.q * 3 + tile.r) % 4) * 0.05) }));
  const flowerStems = decor.flowers.flatMap((tile) => [-0.22, 0, 0.22].map((offset, index) => {
    const position = getPlacement(tile, 0.18);
    return { ...position, x: position.x + offset, z: position.z + (index - 1) * 0.08, scale: 0.85 };
  }));
  const flowerHeads = decor.flowers.flatMap((tile) => [-0.22, 0, 0.22].map((offset, index) => {
    const position = getPlacement(tile, 0.43);
    return { ...position, x: position.x + offset, z: position.z + (index - 1) * 0.08, scale: 0.12 };
  }));
  const pathPlacements = decor.paths.map((tile) => ({ ...getPlacement(tile, 0.08), scale: 0.7 }));
  const gardenSprouts = decor.gardens.flatMap((tile) => [-0.24, 0, 0.24].map((offset, index) => {
    const position = getPlacement(tile, 0.2);
    return { ...position, x: position.x + offset, z: position.z + (index - 1) * 0.12, scale: 0.16 };
  }));

  return (
    <group>
      <InstanceBatch placements={treeTrunks} castShadow><cylinderGeometry args={[0.13, 0.2, 0.92, 7]} /><meshStandardMaterial color="#876548" roughness={0.98} /></InstanceBatch>
      <InstanceBatch placements={treeCanopies} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#789b63" roughness={0.94} /></InstanceBatch>
      <InstanceBatch placements={rockPlacements} castShadow receiveShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#94948b" roughness={1} /></InstanceBatch>
      <InstanceBatch placements={flowerStems}><cylinderGeometry args={[0.025, 0.035, 0.42, 5]} /><meshStandardMaterial color="#658653" roughness={1} /></InstanceBatch>
      <InstanceBatch placements={flowerHeads}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#e9a3b0" roughness={0.9} /></InstanceBatch>
      <InstanceBatch placements={pathPlacements} receiveShadow><cylinderGeometry args={[0.55, 0.6, 0.12, 8]} /><meshStandardMaterial color="#b5b1a6" roughness={1} /></InstanceBatch>
      <InstanceBatch placements={gardenSprouts}><coneGeometry args={[1, 2.2, 5]} /><meshStandardMaterial color="#6d9659" roughness={1} /></InstanceBatch>
    </group>
  );
}
