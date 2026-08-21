"use client";

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import type { HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexCoord, HexTileDTO } from '@/lib/hex-world/types';

export function HexSelectionEffects({
  tiles,
  selectedCoord,
  validKeys,
  invalidKeys,
  motionProfile,
  invalidPulseNonce = 0,
}: {
  tiles: HexTileDTO[];
  selectedCoord?: HexCoord | null;
  validKeys?: Set<string>;
  invalidKeys?: Set<string>;
  motionProfile: HexMotionProfile;
  invalidPulseNonce?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const invalidStartedAt = useRef<number | null>(null);
  const tileByKey = useMemo(() => new Map(tiles.map((tile) => [hexKey(tile), tile])), [tiles]);
  const selected = selectedCoord ? tileByKey.get(hexKey(selectedCoord)) : null;
  const position = selected ? axialToWorld(selected, 1, selected.height + 0.11) : null;
  const state = selectedCoord ? (invalidKeys?.has(hexKey(selectedCoord)) ? 'invalid' : validKeys?.has(hexKey(selectedCoord)) ? 'valid' : 'selected') : null;
  const color = state === 'invalid' ? '#cf716d' : state === 'valid' ? '#6faf79' : '#fff4d8';

  useEffect(() => {
    invalidStartedAt.current = null;
  }, [invalidPulseNonce]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !materialRef.current || !position) return;
    const basePulse = Math.sin(clock.elapsedTime * 2.1) * 0.5 + 0.5;
    let accent = 0;
    if (state === 'invalid' && invalidPulseNonce > 0) {
      if (invalidStartedAt.current === null) invalidStartedAt.current = clock.elapsedTime;
      const elapsed = clock.elapsedTime - invalidStartedAt.current;
      accent = Math.max(0, 1 - elapsed / Math.max(0.12, motionProfile.placementDurationMs / 1000));
    }
    const scale = 1 + basePulse * 0.025 * Math.min(1, motionProfile.ambientScale + 0.35) + accent * 0.025;
    groupRef.current.scale.setScalar(scale);
    materialRef.current.opacity = Math.min(0.92, 0.72 + basePulse * 0.12 + accent * 0.08);
  });

  if (!position) return null;
  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={8}>
        <ringGeometry args={[0.76, 0.9, 6]} />
        <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0.82} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
