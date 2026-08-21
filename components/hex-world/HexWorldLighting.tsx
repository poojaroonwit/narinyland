"use client";

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import type { HexQualityProfile } from '@/lib/hex-world/quality';

export function HexWorldLighting({ profile }: { profile: HexQualityProfile }) {
  return (
    <>
      <hemisphereLight intensity={1.03} color="#fff8ea" groundColor="#718974" />
      <ambientLight intensity={0.28} color="#f4f7ef" />
      <directionalLight
        position={[11, 21, 9]}
        intensity={2.35}
        color="#ffe9bd"
        castShadow
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.015}
      />
      <ContactShadows
        position={[0, -0.55, 0]}
        opacity={0.18}
        scale={40}
        blur={3.2}
        far={12}
        resolution={profile.contactShadowResolution}
      />
    </>
  );
}
