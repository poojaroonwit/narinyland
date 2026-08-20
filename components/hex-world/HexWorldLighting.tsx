"use client";

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import type { HexQualityProfile } from '@/lib/hex-world/quality';

export function HexWorldLighting({ profile }: { profile: HexQualityProfile }) {
  return (
    <>
      <hemisphereLight intensity={1.08} color="#fff7df" groundColor="#728d69" />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[11, 21, 9]}
        intensity={2.25}
        color="#fff0ce"
        castShadow
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
        shadow-bias={-0.0002}
      />
      <ContactShadows
        position={[0, -0.55, 0]}
        opacity={0.2}
        scale={40}
        blur={2.8}
        far={12}
        resolution={profile.contactShadowResolution}
      />
    </>
  );
}
