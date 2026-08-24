"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { deterministicMotionBucket, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

function WaterBucket({ tiles, bucketIndex, motionProfile, profile }: { tiles: HexTileDTO[]; bucketIndex: number; motionProfile: HexMotionProfile; profile: HexQualityProfile }) {
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
    groupRef.current.position.y = Math.sin(clock.elapsedTime * (0.72 + bucketIndex * 0.08) + phase) * 0.008 * motionProfile.ambientScale;
  });
  if (!tiles.length) return null;
  const opacity = profile.waterDetail === 'full' ? 0.74 : profile.waterDetail === 'reduced' ? 0.7 : 0.66;
  const roughness = profile.waterDetail === 'full' ? 0.42 : profile.waterDetail === 'reduced' ? 0.5 : 0.58;
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, tiles.length]} raycast={() => {}}>
        <cylinderGeometry args={[1, 1, 0.12, 6]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.water.surface} transparent opacity={opacity} metalness={0.01} roughness={roughness} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

function WaterRipple({ tile, index, motionProfile }: { tile: HexTileDTO; index: number; motionProfile: HexMotionProfile }) {
  const ref = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const world = axialToWorld(tile, 1, tile.height + 0.135);
  useFrame(({ clock }) => {
    if (!ref.current || !materialRef.current || document.visibilityState === 'hidden') return;
    const wave = (Math.sin(clock.elapsedTime * 0.7 + index * 1.7) + 1) * 0.5;
    const scale = 0.78 + wave * 0.32 * motionProfile.ambientScale;
    ref.current.scale.setScalar(scale);
    materialRef.current.opacity = (0.07 + wave * 0.09) * Math.max(0.45, motionProfile.ambientScale);
  });
  return (
    <mesh ref={ref} position={[world.x, world.y, world.z]} rotation={[-Math.PI / 2, 0, index * 0.7]} raycast={() => {}}>
      <ringGeometry args={[0.2, 0.225, 20]} />
      <meshBasicMaterial ref={materialRef} color={HEX_VISUAL_THEME.water.highlight} transparent opacity={0.12} depthWrite={false} />
    </mesh>
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
  const rippleCount = profile.waterDetail === 'full' ? Math.max(1, profile.waterGlintCount) : profile.waterDetail === 'reduced' ? 1 : 0;
  const glintTiles = waterTiles.slice(0, rippleCount);

  if (waterTiles.length === 0) return null;
  return (
    <group>
      {buckets.map((bucket, index) => <WaterBucket key={index} tiles={bucket} bucketIndex={index} motionProfile={motionProfile} profile={profile} />)}
      {glintTiles.map((tile, index) => <WaterRipple key={`${tile.q}:${tile.r}:ripple`} tile={tile} index={index} motionProfile={motionProfile} />)}
    </group>
  );
}
