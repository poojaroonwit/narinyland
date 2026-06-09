"use client";

import * as React from 'react';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameLoop } from './useGameLoop';

export function SpawnIn({
  children,
  delay = 0,
  position = [0, 0, 0],
}: {
  children: React.ReactNode;
  delay?: number;
  position?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);
  const completed = useRef(false);
  const duration = 0.65;

  useGameLoop((_, __, elapsed) => {
    if (completed.current) return;

    if (startTime.current === null) {
      if (elapsed < delay) {
        groupRef.current?.scale.setScalar(0);
        sphereRef.current?.scale.setScalar(0);
        return;
      }
      startTime.current = elapsed;
    }

    const progress = Math.min((elapsed - startTime.current) / duration, 1);
    const easeOutQuint = 1 - Math.pow(1 - progress, 5);
    groupRef.current?.scale.setScalar(easeOutQuint);

    if (sphereRef.current) {
      const sphereScale = progress < 0.25 ? progress / 0.25 : Math.max(0, 1 - (progress - 0.25) / 0.35);
      sphereRef.current.scale.setScalar(sphereScale * 0.6);
    }

    if (progress >= 1) completed.current = true;
  });

  return (
    <group position={position}>
      <mesh ref={sphereRef} scale={0}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#ec4899" transparent opacity={0.55} />
      </mesh>
      <group ref={groupRef} scale={[0, 0, 0]}>
        {children}
      </group>
    </group>
  );
}
