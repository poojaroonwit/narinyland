"use client";

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import { HEX_VISUAL_THEME, type HexVisualEnvironment } from '@/lib/hex-world/visual-theme';

export function HexWorldLighting({
  profile,
  environment,
}: {
  profile: HexQualityProfile;
  environment?: HexVisualEnvironment;
}) {
  const daylight = environment?.daylight ?? 1;
  const rainy = environment?.weather === 'rainy';
  const evening = environment?.evening ?? 0;
  const sunIntensity = (rainy ? 1.75 : 2.45) * (0.72 + daylight * 0.28);
  const contactOpacity = profile.name === 'mobile' ? 0.17 : rainy ? 0.22 : 0.25;

  return (
    <>
      <hemisphereLight
        intensity={rainy ? 0.88 : 0.98}
        color={rainy ? '#e8f1f1' : '#fff5df'}
        groundColor="#667f71"
      />
      <ambientLight intensity={0.2 + evening * 0.06} color="#edf3ef" />
      <directionalLight
        position={[12, 20, 8]}
        intensity={sunIntensity}
        color={rainy ? '#f3e8d4' : HEX_VISUAL_THEME.structures.window}
        castShadow
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
        shadow-bias={-0.00014}
        shadow-normalBias={0.02}
      />
      <ContactShadows
        position={[0, -0.53, 0]}
        opacity={contactOpacity}
        scale={42}
        blur={profile.name === 'high' ? 2.8 : 3.4}
        far={13}
        resolution={profile.contactShadowResolution}
      />
    </>
  );
}
