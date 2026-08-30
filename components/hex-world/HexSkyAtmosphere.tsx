"use client";

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import { HEX_VISUAL_THEME, type HexVisualEnvironment } from '@/lib/hex-world/visual-theme';

const BELOW_ISLAND_CLOUDS = [
  [-9, -6.4, -8, 3.4], [-2, -8.1, -11, 4.1], [8, -7.0, -7, 3.6],
  [11, -9.2, 3, 4.5], [5, -6.8, 11, 3.1], [-6, -8.7, 10, 4.2], [-12, -10.0, 2, 3.7],
] as const;

function Cloud({ x, y, z, scale, layer, profile, motionProfile, index, tint }: {
  x: number; y: number; z: number; scale: number; layer: number; index: number;
  profile: HexQualityProfile; motionProfile: HexMotionProfile; tint: string;
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
    <mesh ref={ref} position={[baseX, baseY, baseZ]} scale={[scale, scale * (0.34 + layer * 0.025), scale * 0.72]} raycast={() => {}}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color={tint} transparent opacity={0.36 - layer * 0.035} roughness={1} depthWrite={false} />
    </mesh>
  );
}

function BelowIslandHaze({ profile, rainy }: { profile: HexQualityProfile; rainy: boolean }) {
  const layers = profile.name === 'high' ? 3 : profile.name === 'medium' ? 2 : 1;
  return (
    <group raycast={() => {}}>
      {Array.from({ length: layers }, (_, index) => {
        const y = -5.2 - index * 2.35;
        const size = 21 + index * 7;
        const opacity = (rainy ? 0.105 : 0.072) - index * 0.011;
        return (
          <mesh key={index} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, index * 0.2]} scale={[1.25, 0.82, 1]}>
            <circleGeometry args={[size, 32]} />
            <meshBasicMaterial color={HEX_VISUAL_THEME.atmosphere.horizonHaze} transparent opacity={Math.max(0.032, opacity)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function moodColor(environment?: HexVisualEnvironment) {
  const base = new THREE.Color(HEX_VISUAL_THEME.atmosphere.day);
  if (!environment) return `#${base.getHexString()}`;
  const season = new THREE.Color(HEX_VISUAL_THEME.atmosphere[environment.season]);
  base.lerp(season, 0.18);
  if (environment.weather === 'rainy') base.lerp(new THREE.Color(HEX_VISUAL_THEME.atmosphere.rain), 0.58);
  else if (environment.weather === 'cloudy') base.lerp(new THREE.Color(HEX_VISUAL_THEME.atmosphere.cloudy), 0.42);
  else if (environment.weather === 'breezy') base.lerp(new THREE.Color(HEX_VISUAL_THEME.atmosphere.breezy), 0.24);
  base.lerp(new THREE.Color(HEX_VISUAL_THEME.atmosphere.evening), environment.evening * 0.38);
  return `#${base.getHexString()}`;
}

export function HexSkyAtmosphere({
  profile,
  motionProfile,
  environment,
}: {
  profile: HexQualityProfile;
  motionProfile: HexMotionProfile;
  environment?: HexVisualEnvironment;
}) {
  const visibleCount = profile.cloudLayers === 3 ? 7 : profile.cloudLayers === 2 ? 5 : 3;
  const background = React.useMemo(() => moodColor(environment), [environment]);
  const fog = React.useMemo(() => {
    const color = new THREE.Color(background);
    color.lerp(new THREE.Color(HEX_VISUAL_THEME.atmosphere.horizonHaze), 0.26);
    return `#${color.getHexString()}`;
  }, [background]);
  const cloudTint = environment?.weather === 'rainy' ? '#dfe5e2' : environment?.evening ? '#e9e1d7' : '#edf0ea';
  const rainy = environment?.weather === 'rainy';

  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[fog, rainy ? 22 : 27, rainy ? 58 : 64]} />
      <BelowIslandHaze profile={profile} rainy={rainy} />
      <group>
        {BELOW_ISLAND_CLOUDS.slice(0, visibleCount).map(([x, y, z, scale], index) => {
          const layer = index % Math.max(1, profile.cloudLayers);
          return <Cloud key={index} x={x} y={y} z={z} scale={scale} layer={layer} index={index} profile={profile} motionProfile={motionProfile} tint={cloudTint} />;
        })}
      </group>
    </>
  );
}
