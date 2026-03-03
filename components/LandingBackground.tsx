"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';

const Globe: React.FC = () => {
  const globeRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const R = 5;

  const { useTexture } = require('@react-three/drei');
  const colorMap = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');

  useFrame(() => {
    if (globeRef.current) globeRef.current.rotation.y += 0.0005;
    if (atmosphereRef.current) atmosphereRef.current.rotation.y += 0.0006;
  });

  return (
    <group>
      <mesh ref={globeRef}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial 
            map={colorMap} 
            transparent 
            opacity={0.8}
            roughness={0.8}
        />
      </mesh>
      
      <mesh ref={atmosphereRef}>
         <sphereGeometry args={[R * 1.05, 32, 32]} />
         <meshStandardMaterial 
            color="#ec4899" 
            transparent 
            opacity={0.05} 
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
         />
      </mesh>
    </group>
  );
};

const Heart: React.FC<{ position: [number, number, number], scale: number, delay: number }> = ({ position, scale, delay }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
            meshRef.current.position.y += Math.sin(state.clock.elapsedTime + delay) * 0.005;
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
            <mesh ref={meshRef} position={position} scale={[scale, scale, scale]}>
                <torusGeometry args={[1, 0.4, 16, 32]} />
                <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.5} transparent opacity={0.6} />
            </mesh>
        </Float>
    );
};

export default function LandingBackground() {
  const hearts = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20 - 10
      ] as [number, number, number],
      scale: 0.2 + Math.random() * 0.3,
      delay: Math.random() * 10
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-gradient-to-br from-pink-50 via-white to-pink-100">
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <Globe />
        {hearts.map((h, i) => (
            <Heart key={i} {...h} />
        ))}
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] pointer-events-none" />
    </div>
  );
}
