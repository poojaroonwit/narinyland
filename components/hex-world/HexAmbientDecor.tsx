"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { deterministicMotionBucket, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import { deterministicVisualRatio, HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Placement = {
  x: number;
  y: number;
  z: number;
  scale?: number;
  rotation?: number;
  scaleVector?: [number, number, number];
  rotationVector?: [number, number, number];
};

const LEAF_CLUSTER_OFFSETS = [
  [-0.34, 1.2, 0.05, 0.34],
  [0.31, 1.22, -0.02, 0.36],
  [-0.12, 1.48, -0.2, 0.32],
  [0.18, 1.53, 0.18, 0.33],
  [-0.43, 1.42, -0.17, 0.28],
  [0.42, 1.46, 0.16, 0.29],
  [0.02, 1.72, -0.02, 0.31],
] as const;

function getPlacement(tile: HexTileDTO, yOffset = 0): Placement {
  const world = axialToWorld({ q: tile.q, r: tile.r }, 1, tile.height + yOffset);
  return { x: world.x, y: world.y, z: world.z, rotation: ((tile.q * 17 + tile.r * 11) % 12) * 0.17 };
}

function applyScale(dummy: THREE.Object3D, placement: Placement) {
  if (placement.scaleVector) dummy.scale.set(...placement.scaleVector);
  else dummy.scale.setScalar(placement.scale ?? 1);
}

function applyRotation(dummy: THREE.Object3D, placement: Placement, sway = 0) {
  const base = placement.rotationVector ?? [0, placement.rotation ?? 0, 0];
  dummy.rotation.set(base[0] + sway * 0.35, base[1], base[2] + sway);
}

function InstanceBatch({ placements, children, castShadow = false, receiveShadow = false }: { placements: Placement[]; children: React.ReactNode; castShadow?: boolean; receiveShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((placement, index) => {
      dummy.position.set(placement.x, placement.y, placement.z);
      applyRotation(dummy, placement);
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
  secondaryPhaseOffset = 0,
  castShadow = false,
  receiveShadow = false,
}: {
  placements: Placement[];
  children: React.ReactNode;
  bucketIndex: number;
  amplitude: number;
  speed: number;
  motionProfile: HexMotionProfile;
  secondaryPhaseOffset?: number;
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
      applyRotation(dummy, placement, sway);
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
    if (motionProfile.worldWindScale <= 0 || document.visibilityState === 'hidden') return;
    const phase = bucketIndex * 1.73;
    const primary = Math.sin(clock.elapsedTime * speed + phase);
    const secondary = Math.sin(clock.elapsedTime * speed * 0.47 + phase * 1.83 + secondaryPhaseOffset);
    const wind = primary + secondary * 0.35 * motionProfile.worldWindSecondaryScale;
    const sway = wind * amplitude * motionProfile.worldWindScale;
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
      if (!tile.unlocked) continue;
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
  const rockPlacements = decor.rocks.map((tile) => ({ ...getPlacement(tile, 0.19), scaleVector: [0.24 + (Math.abs(tile.q) % 3) * 0.035, 0.16 + (Math.abs(tile.r) % 3) * 0.03, 0.28 + (Math.abs(tile.q + tile.r) % 4) * 0.03] as [number, number, number] }));
  const pathPlacements = decor.paths.map((tile) => ({ ...getPlacement(tile, 0.05), scaleVector: [0.72 + (Math.abs(tile.q) % 3) * 0.03, 0.055, 0.78 + (Math.abs(tile.r) % 3) * 0.025] as [number, number, number] }));

  return (
    <group>
      {treeBuckets.map((bucket, index) => {
        const trunks = bucket.map((tile) => ({ ...getPlacement(tile, 0.5), scaleVector: [0.88, 1.05, 0.88] as [number, number, number] }));
        const branches = bucket.flatMap((tile) => {
          const base = getPlacement(tile, 0);
          const yaw = base.rotation ?? 0;
          return [
            { x: base.x - 0.13, y: base.y + 0.98, z: base.z, scaleVector: [0.72, 0.78, 0.72] as [number, number, number], rotationVector: [0, yaw, 0.72] as [number, number, number] },
            { x: base.x + 0.14, y: base.y + 1.12, z: base.z - 0.04, scaleVector: [0.68, 0.72, 0.68] as [number, number, number], rotationVector: [0, yaw + Math.PI, -0.66] as [number, number, number] },
            { x: base.x, y: base.y + 1.28, z: base.z + 0.04, scaleVector: [0.58, 0.62, 0.58] as [number, number, number], rotationVector: [0.55, yaw + 0.7, 0.22] as [number, number, number] },
          ];
        });
        const leafPlacements = bucket.flatMap((tile) => {
          const base = getPlacement(tile, 0);
          const sizeVariation = 0.88 + deterministicVisualRatio('ambient-tree', tile.q, tile.r, 'leaf-size') * 0.2;
          return LEAF_CLUSTER_OFFSETS.slice(0, profile.treeLeafClusters).map(([dx, dy, dz, scale], clusterIndex) => ({
            x: base.x + dx,
            y: base.y + dy,
            z: base.z + dz,
            rotation: (base.rotation ?? 0) + clusterIndex * 0.37,
            scaleVector: [scale * (1.08 + (clusterIndex % 2) * 0.08), scale * sizeVariation, scale * (0.9 + (clusterIndex % 3) * 0.06)] as [number, number, number],
          }));
        });
        const lowerLeaves = leafPlacements.filter((_, leafIndex) => leafIndex % profile.treeLeafClusters < Math.ceil(profile.treeLeafClusters * 0.58));
        const crownLeaves = leafPlacements.filter((_, leafIndex) => leafIndex % profile.treeLeafClusters >= Math.ceil(profile.treeLeafClusters * 0.58));
        return (
          <React.Fragment key={`tree-${index}`}>
            <SwayInstanceBatch placements={trunks} bucketIndex={index} amplitude={0.0025} speed={0.62} motionProfile={motionProfile} secondaryPhaseOffset={0.12} castShadow>
              <cylinderGeometry args={[0.13, 0.21, 0.96, 8]} />
              <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.trunk} roughness={0.98} />
            </SwayInstanceBatch>
            <SwayInstanceBatch placements={branches} bucketIndex={index} amplitude={0.012} speed={0.62} motionProfile={motionProfile} secondaryPhaseOffset={0.18} castShadow>
              <cylinderGeometry args={[0.055, 0.085, 0.78, 7]} />
              <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.trunkDark} roughness={0.98} />
            </SwayInstanceBatch>
            <SwayInstanceBatch placements={lowerLeaves} bucketIndex={index} amplitude={0.020} speed={0.62} motionProfile={motionProfile} secondaryPhaseOffset={0.24} castShadow>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leafLight} roughness={0.96} />
            </SwayInstanceBatch>
            <SwayInstanceBatch placements={crownLeaves} bucketIndex={index} amplitude={0.030} speed={0.62} motionProfile={motionProfile} secondaryPhaseOffset={0.55} castShadow>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leafDark} roughness={0.96} />
            </SwayInstanceBatch>
          </React.Fragment>
        );
      })}
      {flowerBuckets.map((bucket, index) => {
        const stems = bucket.flatMap((tile) => [-0.22, 0, 0.22].map((offset, itemIndex) => { const p = getPlacement(tile, 0.18); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.08, scale: 0.85 }; }));
        const heads = bucket.flatMap((tile) => [-0.22, 0, 0.22].map((offset, itemIndex) => { const p = getPlacement(tile, 0.43); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.08, scaleVector: [0.11, 0.065, 0.11] as [number, number, number] }; }));
        const flowerColor = HEX_VISUAL_THEME.vegetation.flower[index % HEX_VISUAL_THEME.vegetation.flower.length];
        const flowerSpeed = 1.02 + index * 0.04;
        return <React.Fragment key={`flower-${index}`}><SwayInstanceBatch placements={stems} bucketIndex={index} amplitude={0.012} speed={flowerSpeed} motionProfile={motionProfile} secondaryPhaseOffset={0.18}><cylinderGeometry args={[0.025, 0.035, 0.42, 5]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.grass} roughness={1} /></SwayInstanceBatch><SwayInstanceBatch placements={heads} bucketIndex={index} amplitude={0.020} speed={flowerSpeed} motionProfile={motionProfile} secondaryPhaseOffset={0.42}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={flowerColor} roughness={0.9} /></SwayInstanceBatch></React.Fragment>;
      })}
      {gardenBuckets.map((bucket, index) => {
        const sprouts = bucket.flatMap((tile) => [-0.24, 0, 0.24].map((offset, itemIndex) => { const p = getPlacement(tile, 0.2); return { ...p, x: p.x + offset, z: p.z + (itemIndex - 1) * 0.12, scale: 0.14 + (itemIndex % 2) * 0.02 }; }));
        const gardenSpeed = 0.95 + index * 0.05;
        return <SwayInstanceBatch key={`garden-${index}`} placements={sprouts} bucketIndex={index} amplitude={0.014} speed={gardenSpeed} motionProfile={motionProfile} secondaryPhaseOffset={0.33}><coneGeometry args={[1, 2.2, 5]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leaf} roughness={0.96} /></SwayInstanceBatch>;
      })}
      <InstanceBatch placements={rockPlacements} castShadow receiveShadow><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={HEX_VISUAL_THEME.terrain.stone.base} roughness={1} /></InstanceBatch>
      <InstanceBatch placements={pathPlacements} receiveShadow><cylinderGeometry args={[0.55, 0.6, 0.12, 16]} /><meshStandardMaterial color={HEX_VISUAL_THEME.terrain.pathDirt} roughness={1} /></InstanceBatch>
    </group>
  );
}
