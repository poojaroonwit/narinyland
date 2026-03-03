"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Rolling hill / ground plane
const Ground: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
    <planeGeometry args={[60, 60, 32, 32]} />
    <meshStandardMaterial color="#a7f3d0" roughness={1} />
  </mesh>
);

// Simple stylised tree trunk + canopy
const GardenTree: React.FC<{ position: [number, number, number]; scale?: number; color?: string }> = ({
  position, scale = 1, color = '#f472b6'
}) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.04;
    }
  });
  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 8]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>
      {/* canopy */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[1.1, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.4, 1.5, 0.3]} castShadow>
        <sphereGeometry args={[0.7, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} transparent opacity={0.9} />
      </mesh>
      <mesh position={[-0.3, 1.6, -0.2]} castShadow>
        <sphereGeometry args={[0.65, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} transparent opacity={0.9} />
      </mesh>
    </group>
  );
};

// Floating petal / blossom
const Petal: React.FC<{ position: [number, number, number]; delay: number }> = ({ position, delay }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + delay;
    ref.current.position.y = position[1] + Math.sin(t * 0.7) * 0.8;
    ref.current.position.x = position[0] + Math.sin(t * 0.4) * 0.5;
    ref.current.rotation.z += 0.01;
    ref.current.rotation.y += 0.008;
  });
  return (
    <mesh ref={ref} position={position}>
      <planeGeometry args={[0.18, 0.22]} />
      <meshStandardMaterial color="#fce7f3" side={THREE.DoubleSide} transparent opacity={0.85} />
    </mesh>
  );
};

// Small floating heart
const FloatingHeart: React.FC<{ position: [number, number, number]; delay: number }> = ({ position, delay }) => (
  <Float speed={1.5 + delay * 0.3} floatIntensity={1.2} rotationIntensity={0.5}>
    <mesh position={position} scale={0.25 + delay * 0.05}>
      <torusGeometry args={[1, 0.5, 12, 24]} />
      <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.6} transparent opacity={0.7} />
    </mesh>
  </Float>
);

export default function LandingBackground() {
  const petals = useMemo(() =>
    Array.from({ length: 18 }).map((_, i) => ({
      position: [(Math.random() - 0.5) * 14, 1 + Math.random() * 5, (Math.random() - 0.5) * 8 - 2] as [number, number, number],
      delay: i * 0.7
    })), []);

  const hearts = useMemo(() =>
    Array.from({ length: 6 }).map((_, i) => ({
      position: [(Math.random() - 0.5) * 12, 2 + Math.random() * 4, (Math.random() - 0.5) * 6 - 2] as [number, number, number],
      delay: i * 0.5
    })), []);

  return (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-pink-100 via-rose-50 to-emerald-50">
      <Canvas shadows camera={{ position: [0, 3, 10], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow color="#fff5e6" />
        <pointLight position={[-5, 5, -5]} intensity={0.4} color="#fce7f3" />

        <Ground />

        {/* Main large sakura tree centre */}
        <GardenTree position={[0, -1.5, -2]} scale={1.6} color="#f9a8d4" />
        {/* Side trees */}
        <GardenTree position={[-5, -1.5, -3]} scale={1.1} color="#f472b6" />
        <GardenTree position={[5.5, -1.5, -4]} scale={1.3} color="#fda4af" />
        <GardenTree position={[-8, -1.5, -6]} scale={0.9} color="#fb7185" />
        <GardenTree position={[8, -1.5, -5]} scale={1.0} color="#f9a8d4" />
        {/* Small accent trees */}
        <GardenTree position={[3, -1.5, 1]} scale={0.7} color="#bbf7d0" />
        <GardenTree position={[-3.5, -1.5, 0.5]} scale={0.65} color="#6ee7b7" />

        {/* Floating petals */}
        {petals.map((p, i) => <Petal key={i} {...p} />)}

        {/* Floating hearts */}
        {hearts.map((h, i) => <FloatingHeart key={i} {...h} />)}

        {/* Sparkle particles */}
        <Sparkles count={60} scale={[16, 8, 8]} size={1.5} speed={0.3} color="#fce7f3" />
      </Canvas>
      <div className="absolute inset-0 bg-white/10 pointer-events-none" />
    </div>
  );
}
