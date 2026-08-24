"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildNaturalTerrainMesh } from '@/lib/hex-world/natural-terrain';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

export function HexNaturalTerrain({
  tiles,
  seed,
  profile,
}: {
  tiles: HexTileDTO[];
  seed: string;
  profile: HexQualityProfile;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const meshData = useMemo(() => buildNaturalTerrainMesh(tiles, seed), [seed, tiles]);
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(meshData.positions, 3));
    next.setAttribute('color', new THREE.Float32BufferAttribute(meshData.colors, 3));
    next.setIndex(meshData.indices);
    next.computeVertexNormals();
    next.computeBoundingBox();
    next.computeBoundingSphere();
    return next;
  }, [meshData]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  if (meshData.indices.length === 0) return null;
  return (
    <mesh ref={meshRef} geometry={geometry} castShadow={profile.name !== 'mobile'} receiveShadow raycast={() => {}}>
      <meshStandardMaterial
        vertexColors
        roughness={profile.materialVariation === 'full' ? 0.9 : 0.94}
        metalness={0}
        flatShading={false}
      />
    </mesh>
  );
}
