"use client";

import React from 'react';
import type { HexQualityProfile } from '@/lib/hex-world/quality';

const CLOUDS = [
  [-9, -4.2, -8, 3.4], [-2, -5.1, -11, 4.1], [8, -4.7, -7, 3.6],
  [11, -5.4, 3, 4.5], [5, -4.4, 11, 3.1], [-6, -5.2, 10, 4.2], [-12, -4.8, 2, 3.7],
] as const;

export function HexSkyAtmosphere({ profile }: { profile: HexQualityProfile }) {
  const visibleClouds = CLOUDS.slice(0, profile.cloudLayers === 3 ? 7 : profile.cloudLayers === 2 ? 5 : 3);
  return (
    <>
      <color attach="background" args={['#dfeff0']} />
      <fog attach="fog" args={['#dfeff0', 28, 64]} />
      <group>
        {visibleClouds.map(([x, y, z, scale], index) => (
          <mesh key={index} position={[x, y, z]} scale={[scale, scale * 0.42, scale * 0.72]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#f8fbf7" transparent opacity={0.56} roughness={1} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}
