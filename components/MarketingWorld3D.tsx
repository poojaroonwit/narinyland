"use client";

import * as React from 'react';
import { useRef } from 'react';
import { 
  ScrollControls, 
  Scroll, 
  useScroll, 
  PerspectiveCamera, 
} from '@react-three/drei';
import * as THREE from 'three';
import { Tree } from './3d/Tree';
import { Pet3D } from './3d/Pet';
import { Fireflies } from './3d/Environment';
import { GameEngine3D, useGameLoop } from './game-engine-3d';

// Monochrome Theme for the Archive look
const ARCHIVE_THEME = {
  trunk: "#000000",
  leaves: ["#000000", "#111111", "#222222", "#333333"],
  ground: "#ffffff", // Pure white for high contrast
  grid: "#000000",
};

function TechnicalGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  useGameLoop((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group position={[0, -20, -30]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[45, 64, 64]} />
        <meshStandardMaterial 
          color="#000000" 
          wireframe 
          transparent 
          opacity={0.03} 
        />
      </mesh>
      {/* Internal core glow */}
      <mesh>
        <sphereGeometry args={[44.5, 32, 32]} />
        <meshStandardMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.5} 
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function Scene({ quality = 'high' }: { quality?: string }) {
  const scroll = useScroll();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const treeRef = useRef<THREE.Group>(null);
  const petRef = useRef<THREE.Group>(null);

  // Camera positions for scrollytelling
  // 0.0: Hero (Overview)
  // 0.3: Tree Feature (Zoom into Canopy)
  // 0.6: Pet/Nari (Zoom into Ground level)
  // 1.0: Timeline/Final (Zoom out to see whole Garden)
  
  useGameLoop((state) => {
    const offset = scroll.offset;
    
    // Smoothly interpolate camera position based on scroll
    if (cameraRef.current) {
      if (offset < 0.25) {
        // Hero to Tree
        const t = offset / 0.25;
        cameraRef.current.position.set(
            THREE.MathUtils.lerp(12, 6, t),
            THREE.MathUtils.lerp(10, 4, t),
            THREE.MathUtils.lerp(18, 10, t)
        );
        cameraRef.current.lookAt(0, 3, 0);
      } else if (offset < 0.6) {
        // Tree to Pet
        const t = (offset - 0.25) / 0.35;
        cameraRef.current.position.set(
            THREE.MathUtils.lerp(6, -5, t),
            THREE.MathUtils.lerp(4, 2, t),
            THREE.MathUtils.lerp(10, 8, t)
        );
        cameraRef.current.lookAt(0, 1.5, 0);
      } else if (offset < 0.85) {
        // Pet to Globe View
        const t = (offset - 0.6) / 0.25;
        cameraRef.current.position.set(
            THREE.MathUtils.lerp(-5, 0, t),
            THREE.MathUtils.lerp(2, -5, t),
            THREE.MathUtils.lerp(8, 25, t)
        );
        cameraRef.current.lookAt(0, -10, -20);
      } else {
        // Final Overview
        const t = (offset - 0.85) / 0.15;
        cameraRef.current.position.set(
            0,
            THREE.MathUtils.lerp(-5, 15, t),
            THREE.MathUtils.lerp(25, 35, t)
        );
        cameraRef.current.lookAt(0, 0, 0);
      }
    }

    // Gentle tree sway
    if (treeRef.current) {
        treeRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <>
      <PerspectiveCamera 
        makeDefault 
        ref={cameraRef} 
        position={[10, 8, 15]} 
        fov={45} 
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#ffffff" />

      <TechnicalGlobe />

      {/* Ground Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={ARCHIVE_THEME.ground} roughness={1} />
      </mesh>
      
      <gridHelper args={[200, 100, "#000000", "#000000"]} position={[0, 0.01, 0]}>
        <meshBasicMaterial attach="material" color="#000000" transparent opacity={0.03} />
      </gridHelper>

      {/* World Elements */}
      <group ref={treeRef}>
        <Tree 
            scale={1} 
            leafCount={2000} 
            theme={ARCHIVE_THEME} 
            quality={quality} 
            treeHeight={1.4}
        />
      </group>

      <Pet3D 
        ref={petRef}
        petType="cat" 
        emotion="happy" 
        theme={ARCHIVE_THEME} 
        startPos={[3, 0, 2]} 
        quality={quality}
      />

      <Fireflies count={quality === 'high' ? 60 : 30} quality={quality} color="#000000" />

      {/* Atmospheric Effects */}
      <fog attach="fog" args={["#ffffff", 15, 60]} />
    </>
  );
}

export default function MarketingWorld3D({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 w-full h-full z-0 bg-[#ffffff]">
      <GameEngine3D quality="high" dpr={1.5} alpha>
        <ScrollControls pages={5} damping={0.3} distance={1}>
          <Scene />
          <Scroll html>
            <div className="w-screen">
                {children}
            </div>
          </Scroll>
        </ScrollControls>
      </GameEngine3D>
    </div>
  );
}
