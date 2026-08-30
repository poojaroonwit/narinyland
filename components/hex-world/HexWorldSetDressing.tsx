"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  buildHexWorldSetDressing,
  getHexAmbientLifeCount,
  type HexSetDressingKind,
  type HexSetDressingPlacement,
} from '@/lib/hex-world/set-dressing';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import type { HexViewMode } from '@/lib/hex-world/view-mode';

const KINDS: readonly HexSetDressingKind[] = [
  'fence',
  'lantern',
  'fallenLog',
  'mushroomCluster',
  'wildflowerPatch',
  'stoneCluster',
];

const MATERIAL: Record<HexSetDressingKind, { color: string; roughness: number; emissive?: string }> = {
  fence: { color: '#9b7352', roughness: 0.94 },
  lantern: { color: '#f0c878', roughness: 0.62, emissive: '#d99d45' },
  fallenLog: { color: '#73523d', roughness: 1 },
  mushroomCluster: { color: '#c97769', roughness: 0.9 },
  wildflowerPatch: { color: '#e7a3b5', roughness: 0.92 },
  stoneCluster: { color: '#8e938a', roughness: 1 },
};

function yOffset(kind: HexSetDressingKind): number {
  if (kind === 'lantern') return 0.24;
  if (kind === 'fence') return 0.13;
  if (kind === 'fallenLog') return 0.12;
  if (kind === 'mushroomCluster') return 0.11;
  if (kind === 'wildflowerPatch') return 0.08;
  return 0.1;
}

function applyPlacement(
  dummy: THREE.Object3D,
  placement: HexSetDressingPlacement,
  kind: HexSetDressingKind,
  time = 0,
) {
  const breeze = kind === 'wildflowerPatch' || kind === 'mushroomCluster'
    ? Math.sin(time * 0.85 + placement.motionPhase) * 0.045
    : 0;
  dummy.position.set(placement.x, placement.y + yOffset(kind), placement.z);
  if (kind === 'fallenLog') dummy.rotation.set(0, placement.rotation, Math.PI / 2 + breeze * 0.25);
  else dummy.rotation.set(breeze, placement.rotation, breeze * 0.7);
  dummy.scale.setScalar(placement.scale);
  dummy.updateMatrix();
}

function SetDressingBatch({
  kind,
  placements,
  profile,
  reducedMotion,
}: {
  kind: HexSetDressingKind;
  placements: HexSetDressingPlacement[];
  profile: HexQualityProfile;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const animated = kind === 'wildflowerPatch' || kind === 'mushroomCluster';

  const apply = (time = 0) => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((placement, index) => {
      applyPlacement(dummy, placement, kind, time);
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    apply(0);
  // The transform batch is derived only from deterministic presentation placements.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements, kind]);

  useFrame(({ clock }) => {
    if (!animated || reducedMotion || document.visibilityState === 'hidden') return;
    apply(clock.elapsedTime);
  });

  if (!placements.length) return null;
  const material = MATERIAL[kind];
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, placements.length]}
      castShadow={profile.name !== 'mobile' && kind !== 'wildflowerPatch'}
      receiveShadow={kind !== 'lantern'}
      raycast={() => {}}
    >
      {kind === 'fence' && <boxGeometry args={[0.9, 0.28, 0.09]} />}
      {kind === 'lantern' && <cylinderGeometry args={[0.075, 0.095, 0.5, 7]} />}
      {kind === 'fallenLog' && <cylinderGeometry args={[0.13, 0.16, 0.82, 8]} />}
      {kind === 'mushroomCluster' && <coneGeometry args={[0.16, 0.25, 7]} />}
      {kind === 'wildflowerPatch' && <sphereGeometry args={[0.13, 7, 5]} />}
      {kind === 'stoneCluster' && <dodecahedronGeometry args={[0.19, 0]} />}
      <meshStandardMaterial
        color={material.color}
        roughness={material.roughness}
        metalness={0}
        emissive={material.emissive}
        emissiveIntensity={kind === 'lantern' ? 0.7 : 0}
      />
    </instancedMesh>
  );
}

function AmbientLife({
  placements,
  profile,
  presentation,
  reducedMotion,
}: {
  placements: HexSetDressingPlacement[];
  profile: HexQualityProfile;
  presentation: HexViewMode;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = placements.length ? getHexAmbientLifeCount(profile, presentation) : 0;
  const base = useMemo(() => {
    const values = new Float32Array(count * 4);
    for (let index = 0; index < count; index += 1) {
      const anchor = placements[index % placements.length];
      const phase = anchor.motionPhase + index * 0.79;
      values[index * 4] = anchor.x + Math.sin(phase * 1.7) * 0.45;
      values[index * 4 + 1] = anchor.y + 0.32 + (index % 4) * 0.08;
      values[index * 4 + 2] = anchor.z + Math.cos(phase * 1.3) * 0.45;
      values[index * 4 + 3] = phase;
    }
    return values;
  }, [count, placements]);
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      values[index * 3] = base[index * 4];
      values[index * 3 + 1] = base[index * 4 + 1];
      values[index * 3 + 2] = base[index * 4 + 2];
    }
    return values;
  }, [base, count]);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    if (!points || reducedMotion || document.visibilityState === 'hidden') return;
    const attribute = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const time = clock.elapsedTime;
    for (let index = 0; index < count; index += 1) {
      const baseIndex = index * 4;
      const phase = base[baseIndex + 3];
      attribute.setXYZ(
        index,
        base[baseIndex] + Math.sin(time * 0.42 + phase) * 0.28,
        base[baseIndex + 1] + Math.sin(time * 0.9 + phase * 1.4) * 0.12,
        base[baseIndex + 2] + Math.cos(time * 0.36 + phase) * 0.28,
      );
    }
    attribute.needsUpdate = true;
  });

  if (!count) return null;
  return (
    <points ref={pointsRef} raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#f2d98b"
        size={presentation === 'person' ? 0.075 : 0.06}
        transparent
        opacity={0.68}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export function HexWorldSetDressing({
  tiles,
  buildings,
  seed,
  profile,
  presentation,
  reducedMotion,
}: {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  seed: string;
  profile: HexQualityProfile;
  presentation: HexViewMode;
  reducedMotion: boolean;
}) {
  const placements = useMemo(
    () => buildHexWorldSetDressing({ tiles, buildings, seed, profile, presentation }),
    [buildings, presentation, profile, seed, tiles],
  );
  const buckets = useMemo(() => {
    const result = new Map<HexSetDressingKind, HexSetDressingPlacement[]>(KINDS.map((kind) => [kind, []]));
    for (const placement of placements) result.get(placement.kind)!.push(placement);
    return result;
  }, [placements]);

  return (
    <group name={`hex-world-set-dressing-${presentation}`}>
      {KINDS.map((kind) => (
        <SetDressingBatch
          key={kind}
          kind={kind}
          placements={buckets.get(kind) ?? []}
          profile={profile}
          reducedMotion={reducedMotion}
        />
      ))}
      <AmbientLife
        placements={placements}
        profile={profile}
        presentation={presentation}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
