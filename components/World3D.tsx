import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Interaction } from '../types';
import dynamic from 'next/dynamic';

const World2DMap = dynamic(() => import('./World2DMap'), { ssr: false });

interface World3DProps {
  timeline: Interaction[];
  onFlagClick: (item: Interaction) => void;
  paused?: boolean;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));
  return new THREE.Vector3(x, y, z);
}

function CameraWatcher({ onZoomIn, paused }: { onZoomIn: () => void; paused?: boolean }) {
  useFrame(({ camera }) => {
    if (paused) return;
    if (camera.position.length() <= 6.5) onZoomIn();
  });

  return null;
}

const Globe: React.FC<{
  timeline: Interaction[];
  onFlagClick: (item: Interaction) => void;
  paused: boolean;
}> = ({ timeline, onFlagClick, paused }) => {
  const rotatingGroupRef = useRef<THREE.Group>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const R = 5;

  const [colorMap, bumpMap, specularMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
  ]);

  useFrame(() => {
    if (paused) return;
    if (rotatingGroupRef.current) rotatingGroupRef.current.rotation.y += 0.0012;
    if (atmosphereRef.current) atmosphereRef.current.rotation.y += 0.0015;
  });

  return (
    <group>
      <pointLight position={[10, 10, 10]} intensity={2.5} color="#ffffff" />
      <group ref={rotatingGroupRef}>
        <mesh receiveShadow castShadow>
          <sphereGeometry args={[R, 72, 72]} />
          <meshStandardMaterial
            map={colorMap}
            normalMap={bumpMap}
            roughnessMap={specularMap}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>

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
                <sphereGeometry args={[0.08, 32, 32]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
              </mesh>
              <Html center distanceFactor={15} position={[0, 0.4, 0]}>
                <div className="bg-black/90 backdrop-blur-3xl text-white text-[9px] px-3 py-1.5 rounded-pill whitespace-nowrap pointer-events-none truncate max-w-[180px] border border-white/20 font-black uppercase tracking-[0.2em] shadow-2xl">
                  {item.location || item.text}
                </div>
              </Html>
            </group>
          );
        })}
      </group>

      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[R * 1.05, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh rotation={[0, 0, 0.2]}>
        <sphereGeometry args={[R * 1.015, 64, 64]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default function World3D({ timeline, onFlagClick, paused = false }: World3DProps) {
  const [is2DMode, setIs2DMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTransition = () => {
    if (paused || isTransitioning || is2DMode) return;

    setIsTransitioning(true);
    transitionTimeoutRef.current = setTimeout(() => {
        setIs2DMode(true);
        setIsTransitioning(false);
    }, 500);
  };

  React.useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <div className={`w-full h-full bg-black absolute inset-0 z-0 flex items-center justify-center transition-opacity duration-1000 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {!is2DMode && (
        <>
          <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <Stars radius={150} depth={50} count={3000} factor={6} saturation={0} fade speed={1} />
            <OrbitControls enablePan={false} minDistance={6} maxDistance={25} enabled={!paused} />
            <CameraWatcher onZoomIn={startTransition} paused={paused} />
            <Globe timeline={timeline} onFlagClick={onFlagClick} paused={paused} />
          </Canvas>
          <div className="absolute top-16 left-0 right-0 text-center pointer-events-none space-y-4">
             <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight uppercase">ARCHIVE PERSPECTIVE</h1>
             <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.8em]">Rotate sphere to investigate shared coordinates</p>
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
