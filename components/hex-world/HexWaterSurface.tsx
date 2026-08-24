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
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseOpacity = profile.waterDetail === 'full' ? 0.74 : profile.waterDetail === 'reduced' ? 0.7 : 0.66;
  const baseRoughness = profile.waterDetail === 'full' ? 0.42 : profile.waterDetail === 'reduced' ? 0.5 : 0.58;

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
    const group = groupRef.current;
    const material = materialRef.current;
    if (!group || !material || document.visibilityState === 'hidden') return;
    if (motionProfile.waterMotionScale <= 0) {
      group.position.y = 0;
      material.roughness = baseRoughness;
      material.opacity = baseOpacity;
      return;
    }

    const time = clock.elapsedTime;
    const phase = bucketIndex * 1.4;
    const speed = 0.58 + bucketIndex * 0.07;
    const primary = Math.sin(time * speed + phase) * 0.010;
    const secondary = Math.sin(time * speed * 1.73 + phase * 0.67) * 0.004;
    group.position.y = (primary + secondary) * motionProfile.waterMotionScale;

    const roughnessWave = Math.sin(time * 0.41 + phase * 0.7);
    const opacityWave = Math.sin(time * 0.53 + phase * 1.2);
    material.roughness = THREE.MathUtils.clamp(
      baseRoughness + roughnessWave * 0.035 * motionProfile.waterMotionScale,
      0.08,
      1,
    );
    material.opacity = THREE.MathUtils.clamp(
      baseOpacity + opacityWave * 0.025 * motionProfile.waterMotionScale,
      0.5,
      0.85,
    );
  });

  if (!tiles.length) return null;
  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, tiles.length]} raycast={() => {}}>
        <cylinderGeometry args={[1, 1, 0.12, 6]} />
        <meshStandardMaterial ref={materialRef} color={HEX_VISUAL_THEME.water.surface} transparent opacity={baseOpacity} metalness={0.01} roughness={baseRoughness} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

function WaterRipple({ tile, index, motionProfile }: { tile: HexTileDTO; index: number; motionProfile: HexMotionProfile }) {
  const ref = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const world = axialToWorld(tile, 1, tile.height + 0.135);
  const phase = tile.q * 0.91 + tile.r * 1.37 + index * 1.7;

  useFrame(({ clock }) => {
    const mesh = ref.current;
    const material = materialRef.current;
    if (!mesh || !material || document.visibilityState === 'hidden') return;
    if (motionProfile.waterMotionScale <= 0) {
      mesh.scale.setScalar(0.72);
      material.opacity = 0.055;
      return;
    }
    const cycle = (Math.sin(clock.elapsedTime * 0.62 + phase) + 1) * 0.5;
    const scale = 0.72 + cycle * (1.18 - 0.72);
    mesh.scale.setScalar(scale);
    material.opacity = (0.15 - cycle * (0.15 - 0.035)) * motionProfile.waterMotionScale;
  });

  return (
    <mesh ref={ref} position={[world.x, world.y, world.z]} rotation={[-Math.PI / 2, 0, index * 0.7]} scale={0.72} raycast={() => {}}>
      <ringGeometry args={[0.2, 0.225, 20]} />
      <meshBasicMaterial ref={materialRef} color={HEX_VISUAL_THEME.water.highlight} transparent opacity={0.15} depthWrite={false} />
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
  const rippleCount = profile.waterDetail === 'full'
    ? Math.min(3, Math.max(1, profile.waterGlintCount))
    : profile.waterDetail === 'reduced'
      ? 1
      : 0;
  const glintTiles = waterTiles.slice(0, rippleCount);

  if (waterTiles.length === 0) return null;
  return (
    <group>
      {buckets.map((bucket, index) => <WaterBucket key={index} tiles={bucket} bucketIndex={index} motionProfile={motionProfile} profile={profile} />)}
      {glintTiles.map((tile, index) => <WaterRipple key={`${tile.q}:${tile.r}:ripple`} tile={tile} index={index} motionProfile={motionProfile} />)}
    </group>
  );
}
