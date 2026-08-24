"use client";

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexViewMode } from '@/lib/hex-world/view-mode';
import { HEX_VISUAL_THEME, type HexVisualEnvironment } from '@/lib/hex-world/visual-theme';

export function HexWorldLighting({
  profile,
  environment,
  viewMode = 'world',
}: {
  profile: HexQualityProfile;
  environment?: HexVisualEnvironment;
  viewMode?: HexViewMode;
}) {
  const daylight = environment?.daylight ?? 1;
  const rainy = environment?.weather === 'rainy';
  const evening = environment?.evening ?? 0;
  const explore = viewMode === 'person';
  const sunIntensity = (rainy ? 1.75 : explore ? 2.62 : 2.45) * (0.72 + daylight * 0.28);
  const contactOpacity = profile.name === 'mobile' ? 0.17 : rainy ? 0.22 : explore ? 0.29 : 0.25;
  const hemisphereIntensity = (rainy ? 0.88 : 0.98) * (explore ? 0.86 : 1);
  const ambientIntensity = (0.2 + evening * 0.06) * (explore ? 0.78 : 1);

  return (
    <>
      <hemisphereLight
        intensity={hemisphereIntensity}
        color={rainy ? '#e8f1f1' : explore ? '#eaf3ee' : '#fff5df'}
        groundColor={explore ? '#536d60' : '#667f71'}
      />
      <ambientLight intensity={ambientIntensity} color={explore ? '#dce9e5' : '#edf3ef'} />
      <directionalLight
        position={explore ? [9, 16, 6] : [12, 20, 8]}
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
        far={explore ? 10 : 13}
        resolution={profile.contactShadowResolution}
      />
    </>
  );
}
