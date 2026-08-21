"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { deterministicMotionPhase, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexConfirmedVisualEvent } from '@/lib/hex-world/visual-events';

const MAX_PARTICLES = 20;

export function HexPlacementEffects({ event, quality, motionProfile, seed }: {
  event: HexConfirmedVisualEvent;
  quality: HexQualityProfile;
  motionProfile: HexMotionProfile;
  seed: string;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const startedAt = useRef<number | null>(null);
  const active = useRef(false);
  const positions = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);

  useLayoutEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    if (!event || event.kind === 'rotated') {
      geometry.setDrawRange(0, 0);
      active.current = false;
      return;
    }

    const coord = event.kind === 'expanded' ? event.coords[0] : event.coord;
    if (!coord) {
      geometry.setDrawRange(0, 0);
      active.current = false;
      return;
    }
    const origin = axialToWorld(coord, 1, 0.35);
    const count = Math.min(MAX_PARTICLES, quality.placementParticleCount);
    for (let index = 0; index < count; index += 1) {
      const phase = deterministicMotionPhase(`${seed}:${event.nonce}:${index}`);
      const radius = 0.08 + (index % 5) * 0.055;
      positions[index * 3] = origin.x + Math.cos(phase) * radius;
      positions[index * 3 + 1] = origin.y + (index % 4) * 0.035;
      positions[index * 3 + 2] = origin.z + Math.sin(phase) * radius;
    }
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
    geometry.setDrawRange(0, count);
    startedAt.current = null;
    active.current = count > 0;
    if (pointsRef.current) pointsRef.current.position.y = 0;
    if (materialRef.current) materialRef.current.opacity = 0.5;
  }, [event, positions, quality.placementParticleCount, seed]);

  useFrame(({ clock }) => {
    if (!active.current || !pointsRef.current || !materialRef.current) return;
    if (startedAt.current === null) startedAt.current = clock.elapsedTime;
    const duration = Math.max(0.08, motionProfile.placementDurationMs / 1000);
    const progress = Math.min(1, (clock.elapsedTime - startedAt.current) / duration);
    pointsRef.current.position.y = progress * 0.3 * Math.max(0.25, motionProfile.ambientScale);
    materialRef.current.opacity = (1 - progress) * 0.52;
    materialRef.current.size = 0.07 + progress * 0.035;
    if (progress >= 1) {
      active.current = false;
      geometryRef.current?.setDrawRange(0, 0);
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={materialRef} color="#f5df9b" size={0.075} transparent opacity={0} depthWrite={false} sizeAttenuation />
    </points>
  );
}
