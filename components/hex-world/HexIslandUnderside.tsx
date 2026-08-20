"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getUnlockedIslandBounds } from '@/lib/hex-world/camera';
import { getVisualVariation } from '@/lib/hex-world/visual-variation';
import type { HexTileDTO } from '@/lib/hex-world/types';

export function HexIslandUnderside({ tiles, seed }: { tiles: HexTileDTO[]; seed: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const placements = useMemo(() => {
    const bounds = getUnlockedIslandBounds(tiles);
    const count = 10;
    return Array.from({ length: count }, (_, index) => {
      const variation = getVisualVariation(seed, { q: index * 2 - 9, r: 5 - index });
      const angle = (index / count) * Math.PI * 2 + variation.rotation * 0.08;
      const ring = bounds.radius * (0.18 + (index % 3) * 0.08);
      return {
        x: bounds.center[0] + Math.cos(angle) * ring,
        y: -1.9 - (index % 4) * 0.38,
        z: bounds.center[2] + Math.sin(angle) * ring,
        rotation: variation.rotation,
        scale: [
          1.55 + variation.scale * 0.55,
          2.1 + (index % 3) * 0.55,
          1.45 + variation.scale * 0.5,
        ] as [number, number, number],
      };
    });
  }, [seed, tiles]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((placement, index) => {
      dummy.position.set(placement.x, placement.y, placement.z);
      dummy.rotation.set(0.12, placement.rotation, 0.08);
      dummy.scale.set(...placement.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, placements]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#726d5f" roughness={1} />
    </instancedMesh>
  );
}
