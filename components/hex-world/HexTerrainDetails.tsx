"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import { deterministicVisualRatio, HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Placement = {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: [number, number, number];
};

function DetailBatch({
  placements,
  children,
  castShadow = false,
}: {
  placements: Placement[];
  children: React.ReactNode;
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((placement, index) => {
      dummy.position.set(placement.x, placement.y, placement.z);
      dummy.rotation.set(0, placement.rotation, 0);
      dummy.scale.set(...placement.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, placements]);

  if (placements.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, placements.length]}
      castShadow={castShadow}
      receiveShadow
      raycast={() => {}}
    >
      {children}
    </instancedMesh>
  );
}

export function HexTerrainDetails({
  tiles,
  seed,
  profile,
}: {
  tiles: HexTileDTO[];
  seed: string;
  profile: HexQualityProfile;
}) {
  const details = useMemo(() => {
    const grass: Placement[] = [];
    const flecks: Placement[] = [];
    const soilRows: Placement[] = [];
    const density = profile.ambientDensity;
    const maxPerKind = profile.name === 'high' ? 160 : profile.name === 'medium' ? 96 : 42;

    for (const tile of tiles) {
      if (!tile.unlocked) continue;
      const ratio = deterministicVisualRatio(seed, tile.q, tile.r, 'terrain-detail');
      const world = axialToWorld(tile, 1, tile.height);
      const angle = deterministicVisualRatio(seed, tile.q, tile.r, 'terrain-angle') * Math.PI * 2;
      const offsetRadius = 0.18 + deterministicVisualRatio(seed, tile.q, tile.r, 'terrain-radius') * 0.28;
      const x = world.x + Math.cos(angle) * offsetRadius;
      const z = world.z + Math.sin(angle) * offsetRadius;

      if (tile.terrainType === 'grass' && ratio < 0.58 * density && grass.length < maxPerKind) {
        const height = 0.12 + deterministicVisualRatio(seed, tile.q, tile.r, 'grass-height') * 0.12;
        grass.push({ x, y: world.y + 0.11, z, rotation: angle, scale: [0.08, height, 0.08] });
      }

      if ((tile.terrainType === 'grass' || tile.terrainType === 'stone') && ratio > 0.3 && ratio < 0.72 * density + 0.2 && flecks.length < maxPerKind) {
        const size = 0.07 + deterministicVisualRatio(seed, tile.q, tile.r, 'fleck-size') * 0.07;
        flecks.push({ x, y: world.y + 0.075, z, rotation: angle, scale: [size * 1.4, size * 0.45, size] });
      }

      if (tile.terrainType === 'soil' && ratio < 0.74 * density && soilRows.length < maxPerKind) {
        soilRows.push({ x: world.x, y: world.y + 0.08, z: world.z, rotation: Math.PI / 6, scale: [0.62, 0.03, 0.045] });
      }
    }

    return { grass, flecks, soilRows };
  }, [profile.ambientDensity, profile.name, seed, tiles]);

  return (
    <group>
      <DetailBatch placements={details.grass} castShadow>
        <coneGeometry args={[1, 2.8, 5]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.grass} roughness={1} />
      </DetailBatch>
      <DetailBatch placements={details.flecks}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.terrain.stone.dark} roughness={1} />
      </DetailBatch>
      <DetailBatch placements={details.soilRows}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.terrain.soil.dark} roughness={1} />
      </DetailBatch>
    </group>
  );
}
