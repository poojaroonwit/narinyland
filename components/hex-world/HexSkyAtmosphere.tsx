"use client";

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';

const CLOUDS = [
  [-9, -4.2, -8, 3.4], [-2, -5.1, -11, 4.1], [8, -4.7, -7, 3.6],
  [11, -5.4, 3, 4.5], [5, -4.4, 11, 3.1], [-6, -5.2, 10, 4.2], [-12, -4.8, 2, 3.7],
] as const;

function Cloud({ x, y, z, scale, layer, profile, motionProfile, index }: {
  x: number; y: number; z: number; scale: number; layer: number; index: number;
  profile: HexQualityProfile; motionProfile: HexMotionProfile;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const baseX = x * (1 + layer * 0.04);
  const baseY = y - layer * 0.5;
  const baseZ = z * (1 + layer * 0.04);
  useFrame(({ clock }) => {
    if (!ref.current || document.visibilityState === 'hidden') return;
    const strength = profile.cloudParallaxScale * motionProfile.ambientScale;
    const phase = index * 0.91;
    const speed = 0.024 + layer * 0.012 + (index % 3) * 0.004;
    ref.current.position.x = baseX + Math.sin(clock.elapsedTime * speed + phase) * (0.25 + layer * 0.11) * strength;
    ref.current.position.y = baseY + Math.cos(clock.elapsedTime * speed * 0.73 + phase) * 0.08 * strength;
    ref.current.position.z = baseZ + Math.cos(clock.elapsedTime * speed * 0.61 + phase) * 0.14 * strength;
  });
  return (
    <mesh ref={ref} position={[baseX, baseY, baseZ]} scale={[scale, scale * (0.38 + layer * 0.03), scale * 0.72]}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color="#fbfcf8" transparent opacity={0.48 - layer * 0.045} roughness={1} depthWrite={false} />
    </mesh>
  );
}

export function HexSkyAtmosphere({ profile, motionProfile }: { profile: HexQualityProfile; motionProfile: HexMotionProfile }) {
  const visibleCount = profile.cloudLayers === 3 ? 7 : profile.cloudLayers === 2 ? 5 : 3;
  return (
    <>
      <color attach="background" args={['#dceef0']} />
      <fog attach="fog" args={['#dceef0', 29, 66]} />
      <group>
        {CLOUDS.slice(0, visibleCount).map(([x, y, z, scale], index) => {
          const layer = index % Math.max(1, profile.cloudLayers);
          return <Cloud key={index} x={x} y={y} z={z} scale={scale} layer={layer} index={index} profile={profile} motionProfile={motionProfile} />;
        })}
      </group>
    </>
  );
}
