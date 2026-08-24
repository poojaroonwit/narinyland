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
    const blades: Placement[] = [];
    const flecks: Placement[] = [];
    const soilRows: Placement[] = [];
    const maxFlecks = profile.name === 'high' ? 220 : profile.name === 'medium' ? 128 : 56;

    for (const tile of tiles) {
      if (!tile.unlocked) continue;
      const world = axialToWorld(tile, 1, tile.height);

      if (tile.terrainType === 'grass') {
        for (let index = 0; index < profile.groundCoverPerTile; index += 1) {
          const angle = deterministicVisualRatio(seed, tile.q, tile.r, `blade-angle:${index}`) * Math.PI * 2;
          const radius = 0.13 + deterministicVisualRatio(seed, tile.q, tile.r, `blade-radius:${index}`) * 0.55;
          const height = 0.72 + deterministicVisualRatio(seed, tile.q, tile.r, `blade-height:${index}`) * 0.5;
          const width = 0.74 + deterministicVisualRatio(seed, tile.q, tile.r, `blade-width:${index}`) * 0.42;
          blades.push({
            x: world.x + Math.cos(angle) * radius,
            y: world.y + 0.16 * height,
            z: world.z + Math.sin(angle) * radius,
            rotation: angle,
            scale: [width, height, 1],
          });
        }
      }

      const stoneRatio = deterministicVisualRatio(seed, tile.q, tile.r, 'stone-fleck');
      if ((tile.terrainType === 'grass' || tile.terrainType === 'stone') && stoneRatio > 0.46 && flecks.length < maxFlecks) {
        const angle = deterministicVisualRatio(seed, tile.q, tile.r, 'stone-angle') * Math.PI * 2;
        const radius = 0.2 + deterministicVisualRatio(seed, tile.q, tile.r, 'stone-radius') * 0.44;
        const size = 0.045 + deterministicVisualRatio(seed, tile.q, tile.r, 'stone-size') * 0.06;
        flecks.push({
          x: world.x + Math.cos(angle) * radius,
          y: world.y + 0.055,
          z: world.z + Math.sin(angle) * radius,
          rotation: angle,
          scale: [size * 1.55, size * 0.52, size],
        });
      }

      if (tile.terrainType === 'soil') {
        const rowRotation = Math.PI / 6 + (deterministicVisualRatio(seed, tile.q, tile.r, 'soil-row') - 0.5) * 0.12;
        soilRows.push({
          x: world.x,
          y: world.y + 0.045,
          z: world.z,
          rotation: rowRotation,
          scale: [0.68, 0.018, 0.032],
        });
      }
    }

    return { blades, flecks, soilRows };
  }, [profile.groundCoverPerTile, profile.name, seed, tiles]);

  return (
    <group>
      <DetailBatch placements={details.blades} castShadow={profile.name === 'high'}>
        <planeGeometry args={[0.055, 0.28]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.grass} roughness={1} side={THREE.DoubleSide} />
      </DetailBatch>
      <DetailBatch placements={details.flecks}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.terrain.stone.dark} roughness={1} />
      </DetailBatch>
      <DetailBatch placements={details.soilRows}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.terrain.soil.dark} roughness={1} />
      </DetailBatch>
    </group>
  );
}
