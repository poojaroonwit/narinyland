"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { hexKey } from '@/lib/hex-world/hex-grid';
import { expSmoothingAlpha, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import { getHexTileTransform, getTerrainDisplayColor, HEX_TILE_DEPTH } from '@/lib/hex-world/rendering';
import type { HexCoord, HexTerrainType, HexTileDTO } from '@/lib/hex-world/types';

type Props = {
  tiles: HexTileDTO[];
  profile: HexQualityProfile;
  motionProfile: HexMotionProfile;
  hoveredKey?: string | null;
  selectedKey?: string | null;
  validKeys?: Set<string>;
  invalidKeys?: Set<string>;
  expansionKeys?: Set<string>;
  riseKeys?: Set<string>;
  onHover?: (coord: HexCoord | null) => void;
  onSelect?: (coord: HexCoord) => void;
};

function stateFor(tile: HexTileDTO, props: Omit<Props, 'tiles' | 'onHover' | 'onSelect' | 'profile' | 'motionProfile'>) {
  const key = hexKey(tile);
  if (props.invalidKeys?.has(key)) return 'invalid' as const;
  if (props.validKeys?.has(key)) return 'valid' as const;
  if (props.expansionKeys?.has(key)) return 'expansion' as const;
  if (props.selectedKey === key) return 'selected' as const;
  if (props.hoveredKey === key) return 'hovered' as const;
  return 'normal' as const;
}

function TerrainBatch({ terrain, tiles, ...props }: { terrain: HexTerrainType; tiles: HexTileDTO[] } & Omit<Props, 'tiles'>) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const liftByKey = useRef(new Map<string, number>());
  const needsSettle = useRef(true);
  const riseStartedAt = useRef<number | null>(null);
  const riseSignature = [...(props.riseKeys ?? [])].sort().join('|');

  const applyTransforms = (progress = 1, delta = 0) => {
    const mesh = ref.current;
    if (!mesh) return false;
    const alpha = delta > 0 ? expSmoothingAlpha(delta, props.motionProfile.hoverResponse) : 0;
    let stillSettling = false;

    tiles.forEach((tile, index) => {
      const transform = getHexTileTransform(tile);
      const key = hexKey(tile);
      const rising = props.riseKeys?.has(key) ?? false;
      const eased = 1 - Math.pow(1 - progress, 3);
      const targetLift = props.hoveredKey === key ? 0.055 : props.selectedKey === key ? 0.035 : 0;
      const currentLift = liftByKey.current.get(key) ?? 0;
      const nextLift = delta > 0 ? THREE.MathUtils.lerp(currentLift, targetLift, alpha) : currentLift;
      liftByKey.current.set(key, Math.abs(nextLift - targetLift) < 0.0008 ? targetLift : nextLift);
      if (Math.abs(nextLift - targetLift) >= 0.0008) stillSettling = true;

      const targetY = transform.position.y - HEX_TILE_DEPTH / 2 + nextLift;
      const y = rising ? targetY - (1 - eased) * 5 : targetY;
      const scaleY = rising ? Math.max(0.12, eased) : 1;
      dummy.position.set(transform.position.x, y, transform.position.z);
      dummy.rotation.set(0, Math.PI / 6, 0);
      dummy.scale.set(transform.scale.x, scaleY, transform.scale.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, new THREE.Color(getTerrainDisplayColor({
        terrainType: tile.terrainType,
        q: tile.q,
        r: tile.r,
        state: stateFor(tile, props),
        materialVariation: props.profile.materialVariation,
      })));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return stillSettling;
  };

  useLayoutEffect(() => {
    riseStartedAt.current = null;
    needsSettle.current = true;
    applyTransforms(props.riseKeys?.size ? 0 : 1, 0);
  // Set content signatures and interactive keys are the intentional animation dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, terrain, props.hoveredKey, props.selectedKey, props.validKeys, props.invalidKeys, props.expansionKeys, props.profile.materialVariation, riseSignature]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const hasRise = !!props.riseKeys?.size;
    if (!needsSettle.current && !hasRise) return;
    let progress = 1;
    if (hasRise) {
      if (riseStartedAt.current === null) riseStartedAt.current = state.clock.getElapsedTime();
      const elapsed = state.clock.getElapsedTime() - riseStartedAt.current;
      progress = Math.min(1, elapsed / 0.85);
    }
    const stillSettling = applyTransforms(progress, delta);
    needsSettle.current = stillSettling || progress < 1;
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
      <meshStandardMaterial roughness={terrain === 'water' ? 0.42 : 0.92} metalness={0} transparent={terrain === 'water'} opacity={terrain === 'water' ? 0.78 : 1} />
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
