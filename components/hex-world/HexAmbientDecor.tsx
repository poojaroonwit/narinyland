"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { deterministicMotionBucket, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Placement = { x: number; y: number; z: number; scale?: number; rotation?: number; scaleVector?: [number, number, number] };

function getPlacement(tile: HexTileDTO, yOffset = 0): Placement {
  const world = axialToWorld({ q: tile.q, r: tile.r }, 1, tile.height + yOffset);
  return { x: world.x, y: world.y, z: world.z, rotation: ((tile.q * 17 + tile.r * 11) % 12) * 0.17 };
}

function applyScale(dummy: THREE.Object3D, placement: Placement) {
  if (placement.scaleVector) dummy.scale.set(...placement.scaleVector);
  else dummy.scale.setScalar(placement.scale ?? 1);
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
      applyScale(dummy, placement);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, placements]);
  if (placements.length === 0) return null;
  return <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} castShadow={castShadow} receiveShadow={receiveShadow} raycast={() => {}}>{children}</instancedMesh>;
}

function SwayInstanceBatch({
  placements,
  children,
  bucketIndex,
  amplitude,
  speed,
  motionProfile,
  castShadow = false,
  receiveShadow = false,
}: {
  placements: Placement[];
  children: React.ReactNode;
  bucketIndex: number;
  amplitude: number;
  speed: number;
  motionProfile: HexMotionProfile;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const applyTransforms = (sway = 0) => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((placement, index) => {
      dummy.position.set(placement.x, placement.y, placement.z);
      dummy.rotation.set(sway * 0.35, placement.rotation ?? 0, sway);
      applyScale(dummy, placement);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    applyTransforms(0);
  // applyTransforms intentionally derives from stable placement and dummy refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements]);

  useFrame(({ clock }) => {
    if (motionProfile.ambientScale <= 0 || document.visibilityState === 'hidden') return;
    const phase = bucketIndex * 1.73;
    const sway = Math.sin(clock.elapsedTime * speed + phase) * amplitude * motionProfile.ambientScale;
    applyTransforms(sway);
  });

  if (placements.length === 0) return null;
  return <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} castShadow={castShadow} receiveShadow={receiveShadow} raycast={() => {}}>{children}</instancedMesh>;
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
  const rockPlacements = decor.rocks.map((tile) => ({ ...getPlacement(tile, 0.24), scaleVector: [0.28 + (Math.abs(tile.q) % 3) * 0.04, 0.22 + (Math.abs(tile.r) % 3) * 0.035, 0.32 + (Math.abs(tile.q + tile.r) % 4) * 0.035] as [number, number, number] }));
  const pathPlacements = decor.paths.map((tile) => ({ ...getPlacement(tile, 0.075), scaleVector: [0.62 + (Math.abs(tile.q) % 3) * 0.035, 0.08, 0.68 + (Math.abs(tile.r) % 3) * 0.03] as [number, number, number] }));

  return (
    <group>
      {treeBuckets.map((bucket, index) => {
        const trunks = bucket.map((tile) => ({ ...getPlacement(tile, 0.48), scaleVector: [0.9, 1, 0.9] as [number, number, number] }));
        const canopyBase = bucket.flatMap((tile) => {
          const p = getPlacement(tile, 1.22);
          const scale = 0.52 + ((Math.abs(tile.q + tile.r) % 3) * 0.055);
          return [
            { ...p, x: p.x - 0.28, y: p.y - 0.03, z: p.z + 0.04, scale },
            { ...p, x: p.x + 0.27, y: p.y + 0.02, z: p.z, scale: scale * 0.96 },
          ];
        });
        const canopyCrown = bucket.map((tile) => {
          const p = getPlacement(tile, 1.56);
          return { ...p, x: p.x + ((tile.q % 2) * 0.08), z: p.z - 0.05, scale: 0.55 + ((Math.abs(tile.r) % 3) * 0.045) };
        });
        return (
          <React.Fragment key={`tree-${index}`}>
            <SwayInstanceBatch placements={trunks} bucketIndex={index} amplitude={0.004} speed={0.75} motionProfile={motionProfile} castShadow>
              <cylinderGeometry args={[0.13, 0.21, 0.96, 7]} />
              <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.trunk} roughness={0.97} />
            </SwayInstanceBatch>
            <SwayInstanceBatch placements={canopyBase} bucketIndex={index} amplitude={0.015} speed={0.75} motionProfile={motionProfile} castShadow>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leafLight} roughness={0.94} />
            </SwayInstanceBatch>
            <SwayInstanceBatch placements={canopyCrown} bucketIndex={index} amplitude={0.018} speed={0.75} motionProfile={motionProfile} castShadow>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leafDark} roughness={0.94} />
            </SwayInstanceBatch>
          </React.Fragment>
        );
      })}
      {flowerBuckets.map((bucket, index) => {
        const stems = bucket.flatMap((tile) => [-0.22, 0, 0.22].map((offset, itemIndex) => { const p = getPlacement(tile, 0.18); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.08, scale: 0.85 }; }));
        const heads = bucket.flatMap((tile) => [-0.22, 0, 0.22].map((offset, itemIndex) => { const p = getPlacement(tile, 0.43); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.08, scale: 0.1 + ((Math.abs(tile.q + itemIndex) % 3) * 0.015) }; }));
        const flowerColor = HEX_VISUAL_THEME.vegetation.flower[index % HEX_VISUAL_THEME.vegetation.flower.length];
        return <React.Fragment key={`flower-${index}`}><SwayInstanceBatch placements={stems} bucketIndex={index} amplitude={0.008} speed={1.1} motionProfile={motionProfile}><cylinderGeometry args={[0.025, 0.035, 0.42, 5]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.grass} roughness={1} /></SwayInstanceBatch><SwayInstanceBatch placements={heads} bucketIndex={index} amplitude={0.012} speed={1.1} motionProfile={motionProfile}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={flowerColor} roughness={0.88} /></SwayInstanceBatch></React.Fragment>;
      })}
      {gardenBuckets.map((bucket, index) => {
        const sprouts = bucket.flatMap((tile) => [-0.24, 0, 0.24].map((offset, itemIndex) => { const p = getPlacement(tile, 0.2); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.12, scale: 0.14 + (itemIndex % 2) * 0.02 }; }));
        return <SwayInstanceBatch key={`garden-${index}`} placements={sprouts} bucketIndex={index} amplitude={0.008} speed={0.95} motionProfile={motionProfile}><coneGeometry args={[1, 2.2, 5]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leaf} roughness={0.94} /></SwayInstanceBatch>;
      })}
      <InstanceBatch placements={rockPlacements} castShadow receiveShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={HEX_VISUAL_THEME.terrain.stone.base} roughness={1} /></InstanceBatch>
      <InstanceBatch placements={pathPlacements} receiveShadow><cylinderGeometry args={[0.55, 0.6, 0.12, 8]} /><meshStandardMaterial color={HEX_VISUAL_THEME.terrain.stone.accent} roughness={1} /></InstanceBatch>
    </group>
  );
}
