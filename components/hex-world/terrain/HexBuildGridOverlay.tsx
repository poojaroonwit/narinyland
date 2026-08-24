"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import type { HexCoord, HexExpansionPlacementPreview, HexTileDTO } from '@/lib/hex-world/types';

const GUIDE_COLORS = {
  valid: '#76b77f',
  invalid: '#c96f68',
  expansion: '#c89b4c',
} as const;

type GuideKind = keyof typeof GUIDE_COLORS;

type GuidePlacement = HexCoord & { y: number };

function GridBatch({ placements, kind }: { placements: GuidePlacement[]; kind: GuideKind }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((coord, index) => {
      const world = axialToWorld(coord, 1, coord.y + 0.105);
      dummy.position.set(world.x, world.y, world.z);
      dummy.rotation.set(-Math.PI / 2, 0, Math.PI / 6);
      dummy.scale.setScalar(0.96);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, placements]);

  if (!placements.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} raycast={() => {}}>
      <ringGeometry args={[0.78, 0.9, 6]} />
      <meshBasicMaterial color={GUIDE_COLORS[kind]} transparent opacity={kind === 'invalid' ? 0.62 : 0.48} depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

export function HexBuildGridOverlay({
  tiles,
  validKeys,
  invalidKeys,
  expansionPlacementPreview,
}: {
  tiles: HexTileDTO[];
  validKeys?: Set<string>;
  invalidKeys?: Set<string>;
  expansionPlacementPreview?: HexExpansionPlacementPreview | null;
}) {
  const heightByKey = useMemo(() => new Map(tiles.map((tile) => [hexKey(tile), tile.height])), [tiles]);
  const guides = useMemo(() => {
    const fromKeys = (keys?: Set<string>): GuidePlacement[] => {
      if (!keys?.size) return [];
      return tiles
        .filter((tile) => keys.has(hexKey(tile)))
        .map((tile) => ({ q: tile.q, r: tile.r, y: tile.height }));
    };
    const expansion: GuidePlacement[] = (expansionPlacementPreview?.tiles ?? []).map((coord) => ({
      ...coord,
      y: heightByKey.get(hexKey(coord)) ?? 0,
    }));
    return {
      valid: fromKeys(validKeys),
      invalid: fromKeys(invalidKeys),
      expansion,
    };
  }, [expansionPlacementPreview, heightByKey, invalidKeys, tiles, validKeys]);

  return (
    <group>
      <GridBatch placements={guides.valid} kind="valid" />
      <GridBatch placements={guides.invalid} kind="invalid" />
      <GridBatch placements={guides.expansion} kind="expansion" />
    </group>
  );
}
