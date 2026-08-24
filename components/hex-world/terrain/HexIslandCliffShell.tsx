"use client";

import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildIslandCliffMesh } from '@/lib/hex-world/island-boundary';
import { buildNaturalTerrainMesh } from '@/lib/hex-world/natural-terrain';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

export function HexIslandCliffShell({
  tiles,
  seed,
  profile,
}: {
  tiles: HexTileDTO[];
  seed: string;
  profile: HexQualityProfile;
}) {
  const terrain = useMemo(() => buildNaturalTerrainMesh(tiles, seed), [seed, tiles]);
  const shell = useMemo(() => buildIslandCliffMesh(terrain.boundaryEdges, seed), [seed, terrain.boundaryEdges]);
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(shell.positions, 3));
    next.setAttribute('color', new THREE.Float32BufferAttribute(shell.colors, 3));
    next.setIndex(shell.indices);
    next.computeVertexNormals();
    next.computeBoundingBox();
    next.computeBoundingSphere();
    return next;
  }, [shell]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  if (shell.indices.length === 0) return null;
  return (
    <mesh geometry={geometry} castShadow={profile.name !== 'mobile'} receiveShadow raycast={() => {}}>
      <meshStandardMaterial
        vertexColors
        roughness={profile.name === 'high' ? 0.94 : 0.97}
        metalness={0}
        flatShading={profile.name === 'mobile'}
      />
    </mesh>
  );
}
