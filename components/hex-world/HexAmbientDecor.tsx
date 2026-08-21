"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { deterministicMotionBucket, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

type Placement = { x: number; y: number; z: number; scale?: number; rotation?: number };

function getPlacement(tile: HexTileDTO, yOffset = 0): Placement {
  const world = axialToWorld({ q: tile.q, r: tile.r }, 1, tile.height + yOffset);
  return { x: world.x, y: world.y, z: world.z, rotation: ((tile.q * 17 + tile.r * 11) % 12) * 0.17 };
}

function InstanceBatch({ placements, children, castShadow = false, receiveShadow = false }: { placements: Placement[]; children: React.ReactNode; castShadow?: boolean; receiveShadow?: boolean }) {
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

function MotionBucket({ index, amplitude, speed, motionProfile, children }: { index: number; amplitude: number; speed: number; motionProfile: HexMotionProfile; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || motionProfile.ambientScale <= 0 || document.visibilityState === 'hidden') return;
    const phase = index * 1.73;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * speed + phase) * amplitude * motionProfile.ambientScale;
    ref.current.rotation.x = Math.cos(clock.elapsedTime * speed * 0.73 + phase) * amplitude * 0.35 * motionProfile.ambientScale;
  });
  return <group ref={ref}>{children}</group>;
}

function tileBuckets(tiles: HexTileDTO[], prefix: string, count: number) {
  const buckets = Array.from({ length: count }, () => [] as HexTileDTO[]);
  for (const tile of tiles) buckets[deterministicMotionBucket(`${prefix}:${tile.q}:${tile.r}`, count)].push(tile);
  return buckets;
}

export function HexAmbientDecor({ tiles, profile, motionProfile }: { tiles: HexTileDTO[]; profile: HexQualityProfile; motionProfile: HexMotionProfile }) {
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

  const bucketCount = profile.vegetationMotion === 'full' ? 4 : profile.vegetationMotion === 'reduced' ? 2 : 1;
  const treeBuckets = tileBuckets(decor.trees, 'tree', bucketCount);
  const flowerBuckets = tileBuckets(decor.flowers, 'flower', bucketCount);
  const gardenBuckets = tileBuckets(decor.gardens, 'garden', bucketCount);
  const rockPlacements = decor.rocks.map((tile) => ({ ...getPlacement(tile, 0.25), scale: 0.32 + ((Math.abs(tile.q * 3 + tile.r) % 4) * 0.05) }));
  const pathPlacements = decor.paths.map((tile) => ({ ...getPlacement(tile, 0.08), scale: 0.7 }));

  return (
    <group>
      {treeBuckets.map((bucket, index) => {
        const trunks = bucket.map((tile) => ({ ...getPlacement(tile, 0.46), scale: 0.9 }));
        const canopies = bucket.map((tile) => ({ ...getPlacement(tile, 1.25), scale: 0.68 + ((Math.abs(tile.q + tile.r) % 3) * 0.06) }));
        return <MotionBucket key={`tree-${index}`} index={index} amplitude={0.018} speed={0.75} motionProfile={motionProfile}><InstanceBatch placements={trunks} castShadow><cylinderGeometry args={[0.13, 0.2, 0.92, 7]} /><meshStandardMaterial color="#876548" roughness={0.96} /></InstanceBatch><InstanceBatch placements={canopies} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#789b63" roughness={0.9} /></InstanceBatch></MotionBucket>;
      })}
      {flowerBuckets.map((bucket, index) => {
        const stems = bucket.flatMap((tile) => [-0.22, 0, 0.22].map((offset, itemIndex) => { const p = getPlacement(tile, 0.18); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.08, scale: 0.85 }; }));
        const heads = bucket.flatMap((tile) => [-0.22, 0, 0.22].map((offset, itemIndex) => { const p = getPlacement(tile, 0.43); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.08, scale: 0.12 }; }));
        return <MotionBucket key={`flower-${index}`} index={index} amplitude={0.012} speed={1.1} motionProfile={motionProfile}><InstanceBatch placements={stems}><cylinderGeometry args={[0.025, 0.035, 0.42, 5]} /><meshStandardMaterial color="#658653" roughness={1} /></InstanceBatch><InstanceBatch placements={heads}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#e9a3b0" roughness={0.88} /></InstanceBatch></MotionBucket>;
      })}
      {gardenBuckets.map((bucket, index) => {
        const sprouts = bucket.flatMap((tile) => [-0.24, 0, 0.24].map((offset, itemIndex) => { const p = getPlacement(tile, 0.2); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.12, scale: 0.16 }; }));
        return <MotionBucket key={`garden-${index}`} index={index} amplitude={0.01} speed={0.95} motionProfile={motionProfile}><InstanceBatch placements={sprouts}><coneGeometry args={[1, 2.2, 5]} /><meshStandardMaterial color="#6d9659" roughness={0.92} /></InstanceBatch></MotionBucket>;
      })}
      <InstanceBatch placements={rockPlacements} castShadow receiveShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#94948b" roughness={1} /></InstanceBatch>
      <InstanceBatch placements={pathPlacements} receiveShadow><cylinderGeometry args={[0.55, 0.6, 0.12, 8]} /><meshStandardMaterial color="#b5b1a6" roughness={1} /></InstanceBatch>
    </group>
  );
}
