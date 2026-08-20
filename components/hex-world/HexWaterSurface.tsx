"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

export function HexWaterSurface({ tiles, profile }: { tiles: HexTileDTO[]; profile: HexQualityProfile }) {
  const waterTiles = useMemo(() => tiles.filter((tile) => tile.unlocked && tile.terrainType === 'water'), [tiles]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    waterTiles.forEach((tile, index) => {
      const world = axialToWorld(tile, 1, tile.height + 0.075);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.set(0, Math.PI / 6, 0);
      dummy.scale.set(0.92, 0.02, 0.92);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, waterTiles]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (mesh) mesh.position.y = Math.sin(clock.elapsedTime * 1.25) * 0.012;
    if (ringRef.current) ringRef.current.rotation.y = clock.elapsedTime * 0.08;
  });

  if (waterTiles.length === 0) return null;
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, waterTiles.length]}>
        <cylinderGeometry args={[1, 1, 0.12, 6]} />
        <meshStandardMaterial color="#69c8c2" transparent opacity={0.78} metalness={0.02} roughness={0.48} depthWrite={false} />
      </instancedMesh>
      {profile.waterDetail === 'full' && (
        <group ref={ringRef}>
          {waterTiles.slice(0, 3).map((tile, index) => {
            const world = axialToWorld(tile, 1, tile.height + 0.12);
            return (
              <mesh key={`${tile.q}:${tile.r}`} position={[world.x, world.y, world.z]} rotation={[-Math.PI / 2, 0, index * 0.4]}>
                <ringGeometry args={[0.24 + index * 0.08, 0.27 + index * 0.08, 24]} />
                <meshBasicMaterial color="#d8ffff" transparent opacity={0.2} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}
