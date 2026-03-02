import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Interaction } from '../types';

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

const Globe: React.FC<{ timeline: Interaction[], onFlagClick: (item: Interaction) => void }> = ({ timeline, onFlagClick }) => {
  const globeRef = useRef<THREE.Mesh>(null);
  const R = 5; // Radius of globe

  // Auto-rotate globe slightly
  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group>
      {/* The Earth */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial 
          color="#1e3a8a" // Deep blue oceany color
          wireframe={true} 
          transparent={true} 
          opacity={0.3} 
        />
      </mesh>
      
      {/* Inner solid Earth to prevent seeing completely through */}
      <mesh>
         <sphereGeometry args={[R * 0.98, 32, 32]} />
         <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Markers */}
      {timeline.filter(t => t.latitude !== undefined && t.longitude !== undefined).map((item) => {
        const pos = latLngToVector3(item.latitude!, item.longitude!, R);
        
        // Calculate rotation so marker points outward perpendicular to sphere surface
        const lookAtTarget = pos.clone().multiplyScalar(2);
        
        return (
          <group 
            key={item.id} 
            position={pos} 
            onClick={(e) => {
               e.stopPropagation();
               onFlagClick(item);
            }}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}
          >
             <mesh position={[0, 0, 0]}>
                 <sphereGeometry args={[0.15, 16, 16]} />
                 <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.5} />
             </mesh>
             
             {/* Simple HTML label floating above marker */}
             <Html center distanceFactor={15} position={[0, 0.3, 0]}>
                <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full whitespace-nowrap pointer-events-none truncate max-w-[150px] border border-pink-500/30">
                   {item.location || item.text}
                </div>
             </Html>
          </group>
        );
      })}
    </group>
  );
};

export default function World3D({ timeline, onFlagClick }: World3DProps) {
  return (
    <div className="w-full h-full bg-slate-900 absolute inset-0 z-0 flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={20} />
        <Globe timeline={timeline} onFlagClick={onFlagClick} />
      </Canvas>
      <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
         <h1 className="text-white font-pacifico text-3xl md:text-5xl opacity-80 drop-shadow-lg">Our World of Memories</h1>
         <p className="text-white/60 text-sm mt-2 font-bold uppercase tracking-widest">Spin the globe to explore</p>
      </div>
    </div>
  );
}
