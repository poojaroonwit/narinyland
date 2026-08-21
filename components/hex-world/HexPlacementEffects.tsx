"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { deterministicMotionPhase, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexConfirmedVisualEvent } from '@/lib/hex-world/visual-events';

const MAX_PARTICLES = 20;

function effectOrigin(event: NonNullable<HexConfirmedVisualEvent>) {
  if (event.kind === 'rotated') return null;
  if (event.kind !== 'expanded') return axialToWorld(event.coord, 1, 0.35);
  if (event.coords.length === 0) return null;
  const positions = event.coords.map((coord) => axialToWorld(coord, 1, 0.25));
  return {
    x: positions.reduce((sum, item) => sum + item.x, 0) / positions.length,
    y: positions.reduce((sum, item) => sum + item.y, 0) / positions.length,
    z: positions.reduce((sum, item) => sum + item.z, 0) / positions.length,
  };
}

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
  const expanded = useRef(false);
  const positions = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);

  useLayoutEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    if (!event || event.kind === 'rotated') {
      geometry.setDrawRange(0, 0);
      active.current = false;
      expanded.current = false;
      return;
    }

    const origin = effectOrigin(event);
    if (!origin) {
      geometry.setDrawRange(0, 0);
      active.current = false;
      expanded.current = false;
      return;
    }
    expanded.current = event.kind === 'expanded';
    const count = Math.min(MAX_PARTICLES, event.kind === 'expanded' ? Math.max(4, Math.floor(quality.placementParticleCount * 0.75)) : quality.placementParticleCount);
    for (let index = 0; index < count; index += 1) {
      const phase = deterministicMotionPhase(`${seed}:${event.nonce}:${index}`);
      const radiusBase = event.kind === 'expanded' ? 0.35 : 0.08;
      const radius = radiusBase + (index % 5) * (event.kind === 'expanded' ? 0.12 : 0.055);
      positions[index * 3] = origin.x + Math.cos(phase) * radius;
      positions[index * 3 + 1] = origin.y + (index % 4) * (event.kind === 'expanded' ? 0.05 : 0.035);
      positions[index * 3 + 2] = origin.z + Math.sin(phase) * radius;
    }
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
    geometry.setDrawRange(0, count);
    startedAt.current = null;
    active.current = count > 0;
    if (pointsRef.current) pointsRef.current.position.y = 0;
    if (materialRef.current) {
      materialRef.current.opacity = event.kind === 'expanded' ? 0.34 : 0.5;
      materialRef.current.color.set(event.kind === 'expanded' ? '#f3f4e9' : '#f5df9b');
    }
  }, [event, positions, quality.placementParticleCount, seed]);

  useFrame(({ clock }) => {
    if (!active.current || !pointsRef.current || !materialRef.current || document.visibilityState === 'hidden') return;
    if (startedAt.current === null) startedAt.current = clock.elapsedTime;
    const durationMs = expanded.current ? motionProfile.expansionDurationMs : motionProfile.placementDurationMs;
    const duration = Math.max(0.08, durationMs / 1000);
    const progress = Math.min(1, (clock.elapsedTime - startedAt.current) / duration);
    const travel = expanded.current ? 0.18 : 0.3;
    pointsRef.current.position.y = progress * travel * Math.max(0.2, motionProfile.ambientScale);
    materialRef.current.opacity = (1 - progress) * (expanded.current ? 0.34 : 0.52);
    materialRef.current.size = (expanded.current ? 0.11 : 0.07) + progress * 0.035;
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
