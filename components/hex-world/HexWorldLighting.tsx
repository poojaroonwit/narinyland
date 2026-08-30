"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { expSmoothingAlpha, type HexMotionProfile } from '@/lib/hex-world/motion';
import {
  shouldRenderHexContactShadows,
  shouldRenderHexDirectionalShadows,
  type HexQualityProfile,
} from '@/lib/hex-world/quality';
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
  const cloudy = environment?.weather === 'cloudy';
  const evening = environment?.evening ?? 0;
  const explore = viewMode === 'person';
  const renderDirectionalShadows = shouldRenderHexDirectionalShadows(profile);
  const renderContactShadows = shouldRenderHexContactShadows(profile, viewMode);
  const sunIntensity = (rainy ? 1.34 : cloudy ? 1.58 : 1.84) * (explore ? 1.1 : 1) * (0.7 + daylight * 0.3);
  const hemisphereIntensity = (rainy ? 0.46 : cloudy ? 0.51 : 0.57) * (explore ? 0.82 : 1);
  const ambientIntensity = (0.075 + evening * 0.03) * (explore ? 0.7 : 1);
  const sunColorValue = rainy ? '#dce3df' : HEX_VISUAL_THEME.atmosphere.sunDay;
  const hemisphereColorValue = rainy ? '#cbd7d7' : explore ? '#d3ddd7' : '#dfe6df';
  const hemisphereGroundValue = explore ? '#455248' : '#59665a';
  const ambientColorValue = explore ? '#c6d1cc' : '#d8ded9';
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
    ? profile.name === 'mobile' ? 0.18 : rainy ? 0.25 : 0.34
    : rainy ? 0.19 : 0.22;
  const contactBlur = explore
    ? profile.name === 'high' ? 2.4 : 3
    : profile.name === 'high' ? 3.2 : 3.8;

  return (
    <>
      <hemisphereLight ref={hemisphereRef} intensity={0.57} color="#dfe6df" groundColor="#59665a" />
      <ambientLight ref={ambientRef} intensity={0.075} color="#d8ded9" />
      <directionalLight
        ref={directionalRef}
        position={explore ? [8, 14, 5] : [12, 20, 8]}
        intensity={1}
        color={HEX_VISUAL_THEME.atmosphere.sunDay}
        castShadow={renderDirectionalShadows}
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
        shadow-bias={-0.00014}
        shadow-normalBias={0.02}
      />
      {renderContactShadows && (
        <ContactShadows
          position={[0, -0.53, 0]}
          opacity={contactOpacity}
          scale={42}
          blur={contactBlur}
          far={13}
          resolution={profile.contactShadowResolution}
          frames={1}
        />
      )}
    </>
  );
}
