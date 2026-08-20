"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { HEX_TILE_DEPTH } from '@/lib/hex-world/rendering';
import type { HexExpansionDTO } from '@/lib/hex-world/types';

function ExpansionCluster({ expansion, selected, onSelect }: { expansion: HexExpansionDTO; selected: boolean; onSelect: (key: string) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    expansion.tiles.forEach((tile, index) => {
      const position = axialToWorld(tile, 1, -0.12);
      dummy.position.set(position.x, position.y - HEX_TILE_DEPTH / 2, position.z);
      dummy.rotation.set(0, Math.PI / 6, 0);
      dummy.scale.set(0.94, selected ? 0.62 : 0.48, 0.94);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, expansion.tiles, selected]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, expansion.tiles.length]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(expansion.expansionKey);
      }}
    >
      <cylinderGeometry args={[1, 1, HEX_TILE_DEPTH, 6]} />
      <meshStandardMaterial color={selected ? '#f5cc76' : '#dfa94c'} transparent opacity={selected ? 0.72 : 0.4} roughness={0.82} depthWrite={false} />
    </instancedMesh>
  );
}

export function HexExpansionClusters({ expansions, selectedKey, onSelect }: {
  expansions: HexExpansionDTO[];
  selectedKey?: string | null;
  onSelect: (key: string) => void;
}) {
  return <group>{expansions.map((expansion) => <ExpansionCluster key={expansion.expansionKey} expansion={expansion} selected={expansion.expansionKey === selectedKey} onSelect={onSelect} />)}</group>;
}
