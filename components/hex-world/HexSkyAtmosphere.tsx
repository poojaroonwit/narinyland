"use client";

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HexQualityProfile } from '@/lib/hex-world/quality';

const CLOUDS = [
  [-9, -4.2, -8, 3.4], [-2, -5.1, -11, 4.1], [8, -4.7, -7, 3.6],
  [11, -5.4, 3, 4.5], [5, -4.4, 11, 3.1], [-6, -5.2, 10, 4.2], [-12, -4.8, 2, 3.7],
] as const;

export function HexSkyAtmosphere({ profile }: { profile: HexQualityProfile }) {
  const groupRef = useRef<THREE.Group>(null);
  const visibleCount = profile.cloudLayers === 3 ? 7 : profile.cloudLayers === 2 ? 5 : 3;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.x = Math.sin(clock.elapsedTime * 0.035) * 0.45;
    groupRef.current.position.z = Math.cos(clock.elapsedTime * 0.028) * 0.25;
  });

  return (
    <>
      <color attach="background" args={['#dfeff0']} />
      <fog attach="fog" args={['#dfeff0', 28, 64]} />
      <group ref={groupRef}>
        {CLOUDS.slice(0, visibleCount).map(([x, y, z, scale], index) => {
          const layer = index % Math.max(1, profile.cloudLayers);
          return (
            <mesh
              key={index}
              position={[x * (1 + layer * 0.04), y - layer * 0.5, z * (1 + layer * 0.04)]}
              scale={[scale, scale * (0.38 + layer * 0.03), scale * 0.72]}
            >
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial
                color="#f8fbf7"
                transparent
                opacity={0.5 - layer * 0.05}
                roughness={1}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>
    </>
  );
}
