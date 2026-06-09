import React, { useRef, useState } from 'react';
import { OrbitControls, Stars, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Interaction } from '../types';
import dynamic from 'next/dynamic';
import { GameEngine3D, useGameLoop } from './game-engine-3d';

const World2DMap = dynamic(() => import('./World2DMap'), { ssr: false });

interface World3DProps {
  timeline: Interaction[];
  onFlagClick: (item: Interaction) => void;
}

// Convert Lat/Lng to 3D Cartesian coordinates
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return new THREE.Vector3(x, y, z);
}

function CameraWatcher({ onZoomIn }: { onZoomIn: () => void }) {
  useGameLoop(({ camera }) => {
    // Zoom in threshold
    if (camera.position.length() <= 6.5) {
      onZoomIn();
    }
  });
  return null;
}

const Globe: React.FC<{ timeline: Interaction[], onFlagClick: (item: Interaction) => void }> = ({ timeline, onFlagClick }) => {
  const rotatingGroupRef = useRef<THREE.Group>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const R = 5; // Radius of globe

  // High quality earth texture
  const [colorMap, bumpMap, specularMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
  ]);

  // Auto-rotate globe AND markers together so pins stay fixed to surface
  useGameLoop(() => {
    if (rotatingGroupRef.current) {
      rotatingGroupRef.current.rotation.y += 0.001;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.0012;
    }
  });

  return (
    <group>
      {/* Light for the sun effect */}
      <pointLight position={[10, 10, 10]} intensity={2} color="#fffcf0" />

      {/* Rotating group: globe mesh + markers rotate together */}
      <group ref={rotatingGroupRef}>
        {/* The Earth */}
        <mesh receiveShadow castShadow>
          <sphereGeometry args={[R, 128, 128]} />
          <meshStandardMaterial
            map={colorMap}
            normalMap={bumpMap}
            roughnessMap={specularMap}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Markers — inside rotating group so they stay locked to the globe surface */}
        {timeline.filter(t => t.latitude !== undefined && t.longitude !== undefined).map((item) => {
          const pos = latLngToVector3(item.latitude!, item.longitude!, R);
          return (
            <group
              key={item.id}
              position={pos}
              onClick={(e) => { e.stopPropagation(); onFlagClick(item); }}
              onPointerOver={() => document.body.style.cursor = 'pointer'}
              onPointerOut={() => document.body.style.cursor = 'auto'}
            >
              <mesh>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.5} />
              </mesh>
              <Html center distanceFactor={15} position={[0, 0.3, 0]}>
                <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full whitespace-nowrap pointer-events-none truncate max-w-[150px] border border-pink-500/30">
                  {item.location || item.text}
                </div>
              </Html>
            </group>
          );
        })}
      </group>

      {/* Atmosphere / Glow — separate slow rotation */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[R * 1.02, 64, 64]} />
        <meshStandardMaterial
          color="#4ba3ff"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Clouds Layer (Subtle) */}
      <mesh rotation={[0, 0, 0.2]}>
        <sphereGeometry args={[R * 1.01, 64, 64]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default function World3D({ timeline, onFlagClick }: World3DProps) {
  const [is2DMode, setIs2DMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => {
        setIs2DMode(true);
        setIsTransitioning(false);
    }, 500); // 500ms fade
  };

  return (
    <div className={`w-full h-full bg-slate-900 absolute inset-0 z-0 flex items-center justify-center transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {!is2DMode && (
        <>
          <GameEngine3D quality="high" dpr={1.5} camera={{ position: [0, 0, 12], fov: 45 }} alpha={false}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <OrbitControls enablePan={false} minDistance={6} maxDistance={20} />
            <CameraWatcher onZoomIn={startTransition} />
            <Globe timeline={timeline} onFlagClick={onFlagClick} />
          </GameEngine3D>
          <div className="absolute top-8 left-0 right-0 text-center pointer-events-none transition-opacity duration-300">
             <h1 className="text-white font-pacifico text-3xl md:text-5xl opacity-80 drop-shadow-lg">Our World of Memories</h1>
             <p className="text-white/60 text-sm mt-2 font-bold uppercase tracking-widest">Spin the globe to explore</p>
          </div>
        </>
      )}

      {is2DMode && (
        <World2DMap 
          timeline={timeline} 
          onFlagClick={onFlagClick} 
          onZoomOut={() => setIs2DMode(false)} 
        />
      )}
    </div>
  );
}
