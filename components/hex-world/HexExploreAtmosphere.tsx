"use client";

import React from 'react';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import { HEX_VISUAL_THEME, type HexVisualEnvironment } from '@/lib/hex-world/visual-theme';

function DistantIsland({ position, scale, canopy = false }: { position: [number, number, number]; scale: number; canopy?: boolean }) {
  return (
    <group position={position} scale={scale} raycast={() => {}}>
      <mesh position={[0, -0.8, 0]} rotation={[0.18, 0.28, 0]}>
        <coneGeometry args={[2.3, 3.4, 9]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.explore.atmosphere.distantRock} roughness={1} />
      </mesh>
      <mesh position={[0, 0.72, 0]} scale={[1.65, 0.42, 1.42]}>
        <sphereGeometry args={[1.35, 9, 6]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.explore.atmosphere.distantGrass} roughness={0.96} />
      </mesh>
      {canopy && <mesh position={[0.4, 1.75, -0.1]} scale={[0.75, 0.85, 0.75]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leafDark} roughness={0.96} /></mesh>}
    </group>
  );
}

export function HexExploreAtmosphere({
  profile,
  environment,
}: {
  profile: HexQualityProfile;
  environment: HexVisualEnvironment;
}) {
  const evening = environment.evening > 0.35;
  const rainy = environment.weather === 'rainy';
  const fogColor = evening ? HEX_VISUAL_THEME.explore.atmosphere.fogEvening : rainy ? HEX_VISUAL_THEME.atmosphere.rain : HEX_VISUAL_THEME.explore.atmosphere.fogDay;
  const fogNear = profile.name === 'mobile' ? 11 : 13;
  const fogFar = profile.name === 'high' ? 48 : profile.name === 'medium' ? 42 : 34;

  return (
    <>
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      <group name="explore-distant-floating-islands">
        <DistantIsland position={[-18, 4.5, -28]} scale={1.5} canopy />
        <DistantIsland position={[18, 6.4, -32]} scale={1.15} canopy={profile.name !== 'mobile'} />
        {profile.name === 'high' && <DistantIsland position={[30, 9, -48]} scale={0.9} />}
      </group>
      <group name="explore-horizon-clouds" position={[0, 5, -38]} raycast={() => {}}>
        {Array.from({ length: profile.name === 'high' ? 6 : profile.name === 'medium' ? 4 : 2 }, (_, index) => (
          <mesh key={index} position={[(index - 2.5) * 7, (index % 2) * 1.1, -(index % 3) * 2]} scale={[3.8, 1.25, 2.1]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={HEX_VISUAL_THEME.explore.atmosphere.cloud} transparent opacity={0.5} depthWrite={false} roughness={1} />
          </mesh>
        ))}
      </group>
    </>
  );
}
