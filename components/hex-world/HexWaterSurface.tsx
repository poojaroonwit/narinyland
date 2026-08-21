"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { deterministicMotionBucket, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

function WaterBucket({ tiles, bucketIndex, motionProfile }: { tiles: HexTileDTO[]; bucketIndex: number; motionProfile: HexMotionProfile }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    tiles.forEach((tile, index) => {
      const world = axialToWorld(tile, 1, tile.height + 0.075);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.set(0, Math.PI / 6, 0);
      dummy.scale.set(0.92, 0.02, 0.92);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, tiles]);
  useFrame(({ clock }) => {
    if (!groupRef.current || motionProfile.ambientScale <= 0 || document.visibilityState === 'hidden') return;
    const phase = bucketIndex * 1.4;
    groupRef.current.position.y = Math.sin(clock.elapsedTime * (0.72 + bucketIndex * 0.08) + phase) * 0.009 * motionProfile.ambientScale;
  });
  if (!tiles.length) return null;
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, tiles.length]}>
        <cylinderGeometry args={[1, 1, 0.12, 6]} />
        <meshStandardMaterial color="#66c4c1" transparent opacity={0.77} metalness={0.01} roughness={0.54} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

export function HexWaterSurface({ tiles, profile, motionProfile }: { tiles: HexTileDTO[]; profile: HexQualityProfile; motionProfile: HexMotionProfile }) {
  const waterTiles = useMemo(() => tiles.filter((tile) => tile.unlocked && tile.terrainType === 'water'), [tiles]);
  const bucketCount = profile.name === 'high' ? 3 : profile.name === 'medium' ? 2 : 1;
  const buckets = useMemo(() => {
    const result = Array.from({ length: bucketCount }, () => [] as HexTileDTO[]);
    for (const tile of waterTiles) result[deterministicMotionBucket(`water:${tile.q}:${tile.r}`, bucketCount)].push(tile);
    return result;
  }, [bucketCount, waterTiles]);
  const glintTiles = waterTiles.slice(0, profile.waterGlintCount);

  if (waterTiles.length === 0) return null;
  return (
    <group>
      {buckets.map((bucket, index) => <WaterBucket key={index} tiles={bucket} bucketIndex={index} motionProfile={motionProfile} />)}
      {glintTiles.map((tile, index) => {
        const world = axialToWorld(tile, 1, tile.height + 0.13);
        return (
          <mesh key={`${tile.q}:${tile.r}:glint`} position={[world.x, world.y, world.z]} rotation={[-Math.PI / 2, 0, index * 0.5]}>
            <ringGeometry args={[0.2 + index * 0.06, 0.225 + index * 0.06, 24]} />
            <meshBasicMaterial color="#e4ffff" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
