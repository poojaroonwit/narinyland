"use client";

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';

function hashRatio(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

export function HexWorldParticles({ seed, profile, motionProfile }: { seed: string; profile: HexQualityProfile; motionProfile: HexMotionProfile }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(profile.particleCount * 3);
    for (let index = 0; index < profile.particleCount; index += 1) {
      const radius = 5 + hashRatio(`${seed}:${index}:radius`) * 13;
      const angle = hashRatio(`${seed}:${index}:angle`) * Math.PI * 2;
      array[index * 3] = Math.cos(angle) * radius;
      array[index * 3 + 1] = 0.8 + hashRatio(`${seed}:${index}:height`) * 5.5;
      array[index * 3 + 2] = Math.sin(angle) * radius;
    }
    return array;
  }, [profile.particleCount, seed]);

  useFrame(({ clock }) => {
    const points = ref.current;
    if (!points || motionProfile.ambientScale <= 0 || document.visibilityState === 'hidden') return;
    points.rotation.y = clock.elapsedTime * 0.012 * profile.windStrength * motionProfile.ambientScale;
    points.position.y = Math.sin(clock.elapsedTime * 0.22) * 0.08 * motionProfile.ambientScale;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fff0bd" size={0.075} transparent opacity={0.38} depthWrite={false} sizeAttenuation />
    </points>
  );
}
