"use client";

import React, { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const HexPlayerAvatar = forwardRef<THREE.Group, {
  moving: boolean;
  reducedMotion: boolean;
}>(function HexPlayerAvatar({ moving, reducedMotion }, ref) {
  const bodyRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!bodyRef.current) return;
    const bob = moving && !reducedMotion ? Math.sin(clock.elapsedTime * 8) * 0.035 : 0;
    bodyRef.current.position.y = bob;
  });

  return (
    <group ref={ref} scale={0.9}>
      <group ref={bodyRef}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <capsuleGeometry args={[0.17, 0.36, 5, 8]} />
          <meshStandardMaterial color="#4f8f78" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.82, 0]} castShadow>
          <sphereGeometry args={[0.19, 10, 8]} />
          <meshStandardMaterial color="#e5b58c" roughness={1} />
        </mesh>
        <mesh position={[0, 0.94, -0.025]} castShadow>
          <sphereGeometry args={[0.188, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
          <meshStandardMaterial color="#493d35" roughness={1} />
        </mesh>
        <mesh position={[-0.08, 0.81, 0.17]}>
          <sphereGeometry args={[0.018, 5, 4]} />
          <meshStandardMaterial color="#302925" roughness={1} />
        </mesh>
        <mesh position={[0.08, 0.81, 0.17]}>
          <sphereGeometry args={[0.018, 5, 4]} />
          <meshStandardMaterial color="#302925" roughness={1} />
        </mesh>
        <mesh position={[0, 0.73, 0.185]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.035, 0.08, 5]} />
          <meshStandardMaterial color="#d49b77" roughness={1} />
        </mesh>
        <mesh position={[-0.075, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.048, 0.058, 0.36, 6]} />
          <meshStandardMaterial color="#665f59" roughness={1} />
        </mesh>
        <mesh position={[0.075, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.048, 0.058, 0.36, 6]} />
          <meshStandardMaterial color="#665f59" roughness={1} />
        </mesh>
        <mesh position={[-0.075, -0.095, 0.055]} castShadow>
          <boxGeometry args={[0.11, 0.07, 0.22]} />
          <meshStandardMaterial color="#4d4540" roughness={1} />
        </mesh>
        <mesh position={[0.075, -0.095, 0.055]} castShadow>
          <boxGeometry args={[0.11, 0.07, 0.22]} />
          <meshStandardMaterial color="#4d4540" roughness={1} />
        </mesh>
      </group>
    </group>
  );
});
