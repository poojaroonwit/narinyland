"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { hexKey } from '@/lib/hex-world/hex-grid';
import { getHexTileTransform, HEX_TERRAIN_COLORS, HEX_TILE_DEPTH } from '@/lib/hex-world/rendering';
import type { HexCoord, HexTerrainType, HexTileDTO } from '@/lib/hex-world/types';

type Props = {
  tiles: HexTileDTO[];
  hoveredKey?: string | null;
  selectedKey?: string | null;
  validKeys?: Set<string>;
  invalidKeys?: Set<string>;
  expansionKeys?: Set<string>;
  riseKeys?: Set<string>;
  onHover?: (coord: HexCoord | null) => void;
  onSelect?: (coord: HexCoord) => void;
};

function colorFor(tile: HexTileDTO, props: Omit<Props, 'tiles' | 'onHover' | 'onSelect'>) {
  const key = hexKey(tile);
  if (props.invalidKeys?.has(key)) return '#df7770';
  if (props.validKeys?.has(key)) return '#7fcf8e';
  if (props.expansionKeys?.has(key)) return '#e4b45d';
  if (props.selectedKey === key) return '#f8f6ea';
  if (props.hoveredKey === key) return '#b9d8a0';
  return HEX_TERRAIN_COLORS[tile.terrainType];
}

function TerrainBatch({ terrain, tiles, ...props }: { terrain: HexTerrainType; tiles: HexTileDTO[] } & Omit<Props, 'tiles'>) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const riseStartedAt = useRef<number | null>(null);
  const riseSignature = [...(props.riseKeys ?? [])].sort().join('|');

  const applyTransforms = (progress = 1) => {
    const mesh = ref.current;
    if (!mesh) return;
    tiles.forEach((tile, index) => {
      const transform = getHexTileTransform(tile);
      const rising = props.riseKeys?.has(hexKey(tile)) ?? false;
      const eased = 1 - Math.pow(1 - progress, 3);
      const targetY = transform.position.y - HEX_TILE_DEPTH / 2;
      const y = rising ? targetY - (1 - eased) * 5 : targetY;
      const scaleY = rising ? Math.max(0.12, eased) : 1;
      dummy.position.set(transform.position.x, y, transform.position.z);
      dummy.rotation.set(0, Math.PI / 6, 0);
      dummy.scale.set(transform.scale.x, scaleY, transform.scale.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, new THREE.Color(colorFor(tile, props)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    riseStartedAt.current = null;
    applyTransforms(props.riseKeys?.size ? 0 : 1);
  // riseSignature intentionally represents Set content identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, terrain, props.hoveredKey, props.selectedKey, props.validKeys, props.invalidKeys, props.expansionKeys, riseSignature]);

  useFrame((state) => {
    if (!props.riseKeys?.size || !ref.current) return;
    if (riseStartedAt.current === null) riseStartedAt.current = state.clock.getElapsedTime();
    const elapsed = state.clock.getElapsedTime() - riseStartedAt.current;
    const progress = Math.min(1, elapsed / 0.85);
    applyTransforms(progress);
  });

  if (tiles.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, tiles.length]}
      castShadow={terrain !== 'water'}
      receiveShadow
      onPointerMove={(event) => {
        event.stopPropagation();
        const tile = event.instanceId === undefined ? null : tiles[event.instanceId];
        props.onHover?.(tile ? { q: tile.q, r: tile.r } : null);
      }}
      onPointerOut={() => props.onHover?.(null)}
      onClick={(event) => {
        event.stopPropagation();
        if (event.instanceId === undefined) return;
        const tile = tiles[event.instanceId];
        props.onSelect?.({ q: tile.q, r: tile.r });
      }}
    >
      <cylinderGeometry args={[1, 1, HEX_TILE_DEPTH, 6]} />
      <meshStandardMaterial roughness={terrain === 'water' ? 0.35 : 0.94} metalness={0} transparent={terrain === 'water'} opacity={terrain === 'water' ? 0.82 : 1} />
    </instancedMesh>
  );
}

export function HexTileInstances(props: Props) {
  const groups = useMemo(() => {
    const grouped: Record<HexTerrainType, HexTileDTO[]> = { grass: [], soil: [], stone: [], water: [] };
    for (const tile of props.tiles) grouped[tile.terrainType].push(tile);
    return grouped;
  }, [props.tiles]);

  const { tiles: _tiles, ...shared } = props;
  return <>{(Object.keys(groups) as HexTerrainType[]).map((terrain) => <TerrainBatch key={terrain} terrain={terrain} tiles={groups[terrain]} {...shared} />)}</>;
}
