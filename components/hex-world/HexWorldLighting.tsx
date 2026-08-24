"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { expSmoothingAlpha, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexViewMode } from '@/lib/hex-world/view-mode';
import { HEX_VISUAL_THEME, type HexVisualEnvironment } from '@/lib/hex-world/visual-theme';

export function HexWorldLighting({
  profile,
  motionProfile,
  environment,
  viewMode = 'world',
}: {
  profile: HexQualityProfile;
  motionProfile: HexMotionProfile;
  environment?: HexVisualEnvironment;
  viewMode?: HexViewMode;
}) {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const initializedRef = useRef(false);
  const daylight = environment?.daylight ?? 1;
  const rainy = environment?.weather === 'rainy';
  const evening = environment?.evening ?? 0;
  const explore = viewMode === 'person';
  const sunIntensity = (rainy ? 1.75 : explore ? 2.62 : 2.45) * (0.72 + daylight * 0.28);
  const hemisphereIntensity = (rainy ? 0.88 : 0.98) * (explore ? 0.86 : 1);
  const ambientIntensity = (0.2 + evening * 0.06) * (explore ? 0.78 : 1);
  const sunColorValue = rainy ? '#f3e8d4' : HEX_VISUAL_THEME.structures.window;
  const hemisphereColorValue = rainy ? '#e8f1f1' : explore ? '#eaf3ee' : '#fff5df';
  const hemisphereGroundValue = explore ? '#536d60' : '#667f71';
  const ambientColorValue = explore ? '#dce9e5' : '#edf3ef';
  const targetSunColor = useMemo(() => new THREE.Color(sunColorValue), [sunColorValue]);
  const targetHemisphereColor = useMemo(() => new THREE.Color(hemisphereColorValue), [hemisphereColorValue]);
  const targetHemisphereGround = useMemo(() => new THREE.Color(hemisphereGroundValue), [hemisphereGroundValue]);
  const targetAmbientColor = useMemo(() => new THREE.Color(ambientColorValue), [ambientColorValue]);

  useLayoutEffect(() => {
    if (initializedRef.current) return;
    const directional = directionalRef.current;
    const hemisphere = hemisphereRef.current;
    const ambient = ambientRef.current;
    if (!directional || !hemisphere || !ambient) return;
    directional.intensity = sunIntensity;
    directional.color.copy(targetSunColor);
    hemisphere.intensity = hemisphereIntensity;
    hemisphere.color.copy(targetHemisphereColor);
    hemisphere.groundColor.copy(targetHemisphereGround);
    ambient.intensity = ambientIntensity;
    ambient.color.copy(targetAmbientColor);
    initializedRef.current = true;
  }, [ambientIntensity, hemisphereIntensity, sunIntensity, targetAmbientColor, targetHemisphereColor, targetHemisphereGround, targetSunColor]);

  useFrame((_, delta) => {
    const directional = directionalRef.current;
    const hemisphere = hemisphereRef.current;
    const ambient = ambientRef.current;
    if (!directional || !hemisphere || !ambient || document.visibilityState === 'hidden') return;
    const alpha = expSmoothingAlpha(delta, motionProfile.lightingResponse);
    directional.intensity = THREE.MathUtils.lerp(directional.intensity, sunIntensity, alpha);
    directional.color.lerp(targetSunColor, alpha);
    hemisphere.intensity = THREE.MathUtils.lerp(hemisphere.intensity, hemisphereIntensity, alpha);
    hemisphere.color.lerp(targetHemisphereColor, alpha);
    hemisphere.groundColor.lerp(targetHemisphereGround, alpha);
    ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, ambientIntensity, alpha);
    ambient.color.lerp(targetAmbientColor, alpha);
  });

  const contactOpacity = explore
    ? profile.name === 'mobile' ? 0.17 : rainy ? 0.22 : 0.29
    : rainy ? 0.19 : 0.22;
  const contactBlur = explore
    ? profile.name === 'high' ? 2.8 : 3.4
    : profile.name === 'high' ? 3.2 : 3.8;

  return (
    <>
      <hemisphereLight ref={hemisphereRef} intensity={1} color="#ffffff" groundColor="#667f71" />
      <ambientLight ref={ambientRef} intensity={0.2} color="#edf3ef" />
      <directionalLight
        ref={directionalRef}
        position={explore ? [9, 16, 6] : [12, 20, 8]}
        intensity={1}
        color="#ffffff"
        castShadow
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
        shadow-bias={-0.00014}
        shadow-normalBias={0.02}
      />
      <ContactShadows
        position={[0, -0.53, 0]}
        opacity={contactOpacity}
        scale={42}
        blur={contactBlur}
        far={explore ? 10 : 13}
        resolution={profile.contactShadowResolution}
      />
    </>
  );
}
