"use client";

import { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { LeafInstance } from './shared';
import { useGameLoop } from '../../game-engine-3d';

export const InstancedLeaves = ({ leaves, windFactor, quality }: { leaves: LeafInstance[], windFactor: number, quality: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const segs = quality === 'low' ? 3 : (quality === 'medium' ? 4 : 5);

  useLayoutEffect(() => {
    if (!meshRef.current || leaves.length === 0) return;

    if (!meshRef.current.instanceColor || meshRef.current.instanceColor.count !== leaves.length) {
       meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(leaves.length * 3), 3);
    }
    
    leaves.forEach((leaf, i) => {
      dummy.position.set(leaf.position[0], leaf.position[1], leaf.position[2]);
      dummy.rotation.set(leaf.rotX || 0, leaf.rotY || 0, leaf.rotZ || 0);
      const s = leaf.scale;
      // Ellipsoid: wide, tall, thin — leaf-like proportions
      dummy.scale.set(s, s * 1.3, s * 0.25);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, new THREE.Color(leaf.color));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    
    if (meshRef.current.material) {
        (meshRef.current.material as THREE.Material).needsUpdate = true;
    }
  }, [dummy, leaves]);

  useGameLoop((state) => {
    if (!meshRef.current || quality === 'low' || leaves.length === 0) return;
    const t = state.clock.getElapsedTime();
    
    leaves.forEach((leaf, i) => {
        // Enhanced wind animation with individual sensitivity
        const windEffect = windFactor * leaf.windSensitivity;
        const turbulence = Math.sin(t * leaf.flutterSpeed + leaf.offset) * leaf.turbulence;
        
        // Position with turbulence
        const offsetY = leaf.position[1] + Math.sin(t * 0.5 * windEffect + leaf.offset) * (0.03 * windFactor) + turbulence * 0.02;
        const offsetX = Math.cos(t * 0.7 * windEffect + leaf.offset * 1.3) * turbulence * 0.015;
        const offsetZ = Math.sin(t * 0.9 * windEffect + leaf.offset * 0.7) * turbulence * 0.015;
        dummy.position.set(leaf.position[0] + offsetX, offsetY, leaf.position[2] + offsetZ);
        
        // Rotation with flutter
        const rotX = (leaf.rotX || 0) + Math.sin(t * 0.8 * windEffect + leaf.offset) * (0.08 * windFactor) + turbulence * 0.05;
        const rotY = (leaf.rotY || 0) + Math.cos(t * 0.6 * windEffect + leaf.offset * 1.1) * (0.04 * windFactor);
        const rotZ = (leaf.rotZ || 0) + Math.sin(t * 0.7 * windEffect + leaf.offset * 0.9) * (0.1 * windFactor) + turbulence * 0.06;
        dummy.rotation.set(rotX, rotY, rotZ);
        
        // Scale with slight breathing effect
        const s = leaf.scale * (1 + turbulence * 0.1);
        dummy.scale.set(s, s * 1.3, s * 0.25);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (leaves.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, leaves.length]} castShadow={quality !== 'low'} receiveShadow={quality !== 'low'}>
      <sphereGeometry args={[0.5, segs, segs]} />
      <meshStandardMaterial 
        color="white" 
        roughness={0.75} 
      />
    </instancedMesh>
  );
};

// Structural Tree Branch with attached leaves
