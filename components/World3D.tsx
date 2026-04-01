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

// Convert Lat/Lng to 3D Cartesian coordinates
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

function CameraWatcher({ onZoomIn, paused }: { onZoomIn: () => void; paused: boolean }) {
  useFrame(({ camera }) => {
    if (paused) return;

    if (camera.position.length() <= 6.5) {
      onZoomIn();
    }
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
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const radius = 5;

  const [colorMap, bumpMap, specularMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
  ]);

  const markers = useMemo(
    () =>
      timeline
        .filter(item => item.latitude != null && item.longitude != null && isFinite(item.latitude) && isFinite(item.longitude))
        .map(item => ({
          item,
          label: item.location || item.text,
          pos: latLngToVector3(item.latitude!, item.longitude!, radius),
        })),
    [timeline]
  );

  useFrame(() => {
    if (paused) return;

    if (rotatingGroupRef.current) {
      rotatingGroupRef.current.rotation.y += 0.001;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.0012;
    }
  });

  return (
    <group>
      <pointLight position={[10, 10, 10]} intensity={2} color="#fffcf0" />

      <group ref={rotatingGroupRef}>
        <mesh receiveShadow castShadow>
          <sphereGeometry args={[radius, 72, 72]} />
          <meshStandardMaterial
            map={colorMap}
            normalMap={bumpMap}
            roughnessMap={specularMap}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {markers.map(({ item, pos, label }) => (
          <group
            key={item.id}
            position={pos}
            onClick={(event) => {
              event.stopPropagation();
              onFlagClick(item);
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer';
              setHoveredMarkerId(item.id);
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
              setHoveredMarkerId(current => (current === item.id ? null : current));
            }}
          >
            <mesh>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.5} />
            </mesh>

            {hoveredMarkerId === item.id && (
              <Html center distanceFactor={15} position={[0, 0.3, 0]}>
                <div className="max-w-[150px] truncate rounded-full border border-pink-500/30 bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm pointer-events-none">
                  {label}
                </div>
              </Html>
            )}
          </group>
        ))}
      </group>

      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[radius * 1.02, 40, 40]} />
        <meshStandardMaterial
          color="#4ba3ff"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh rotation={[0, 0, 0.2]}>
        <sphereGeometry args={[radius * 1.01, 40, 40]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.1} side={THREE.DoubleSide} />
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
    <div
      className={`absolute inset-0 z-0 flex h-full w-full items-center justify-center bg-slate-900 transition-opacity duration-500 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {!is2DMode && (
        <>
          <Canvas
            dpr={[1, 1.5]}
            frameloop={paused ? 'demand' : 'always'}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 12], fov: 45 }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.6} />
            <OrbitControls enablePan={false} minDistance={6} maxDistance={20} enabled={!paused} />
            <CameraWatcher onZoomIn={startTransition} paused={paused} />
            <Globe timeline={timeline} onFlagClick={onFlagClick} paused={paused} />
          </Canvas>

          <div className="pointer-events-none absolute left-0 right-0 top-8 text-center transition-opacity duration-300">
            <h1 className="font-pacifico text-3xl text-white opacity-80 drop-shadow-lg md:text-5xl">Our World of Memories</h1>
            <p className="mt-2 text-sm font-bold uppercase tracking-widest text-white/60">Spin the globe to explore</p>
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
