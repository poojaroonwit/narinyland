"use client";

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';

/**
 * Every completed two-person story adds a lantern to the couple's real 3D world.
 * Decorative only: does not alter tile selection or authoritative world state.
 */
export function HexStoryLanterns({
  count,
  tiles,
  buildings,
  reducedMotion,
}: {
  count: number;
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const visibleCount = Math.min(14, Math.max(0, Math.floor(count)));
  const center = useMemo(() => {
    const home = buildings[0];
    const tile = home
      ? tiles.find((item) => item.q === home.anchorQ && item.r === home.anchorR)
      : tiles.find((item) => item.q === 0 && item.r === 0) || tiles[0];
    return tile ? axialToWorld({ q: tile.q, r: tile.r }, 1, tile.height + 2.65) : { x: 0, y: 2.65, z: 0 };
  }, [tiles, buildings]);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    const time = clock.elapsedTime;
    group.current.position.y = center.y + Math.sin(time * 0.65) * 0.08;
    group.current.rotation.y = Math.sin(time * 0.17) * 0.09;
  });

  if (visibleCount === 0) return null;
  return (
    <group ref={group} position={[center.x, center.y, center.z]} name="couple-story-lanterns">
      {Array.from({ length: visibleCount }, (_, index) => {
        // Position more lanterns in wider spirals as the couple's story grows.
        const angle = index * 2.3999632;
        const radius = 0.78 + 0.36 * Math.sqrt(index);
        const height = 0.18 * Math.sin(index * 1.9);
        return (
          <group key={index} position={[Math.cos(angle) * radius, height, Math.sin(angle) * radius]} scale={0.7 + index * 0.013}>
            <mesh>
              <cylinderGeometry args={[0.19, 0.17, 0.39, 8]} />
              <meshStandardMaterial color={index % 2 === 0 ? '#ffddb3' : '#fbd8ed'} emissive="#ffc371" emissiveIntensity={0.8} roughness={0.7} transparent opacity={0.9} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <coneGeometry args={[0.2, 0.11, 8]} />
              <meshStandardMaterial color="#805b78" roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.045, 8]} />
              <meshStandardMaterial color="#805b78" roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
