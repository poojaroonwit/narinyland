"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getExploreDecorationSamples, type ExploreDecorationSample } from '@/lib/hex-world/explore-decoration';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

function GroundBatch({ samples, kind }: { samples: ExploreDecorationSample[]; kind: 'turf' | 'path' }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    samples.forEach((sample, index) => {
      dummy.position.set(sample.x, sample.y, sample.z);
      dummy.rotation.set(0, sample.rotation, 0);
      if (kind === 'turf') dummy.scale.set(sample.scale * 0.72, 0.32, sample.scale * 0.58);
      else dummy.scale.set(sample.scale * 0.5, 0.42, sample.scale * 0.38);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const palette = kind === 'turf' ? HEX_VISUAL_THEME.terrain.grass : HEX_VISUAL_THEME.terrain.stone;
      const color = new THREE.Color(sample.tone > 0.66 ? palette.accent : sample.tone > 0.32 ? palette.base : palette.dark);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy, kind, samples]);

  if (!samples.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, samples.length]} receiveShadow raycast={() => {}}>
      {kind === 'turf'
        ? <cylinderGeometry args={[0.72, 0.82, 0.055, 7]} />
        : <cylinderGeometry args={[0.64, 0.7, 0.065, 8]} />}
      <meshStandardMaterial roughness={kind === 'turf' ? 0.96 : 1} metalness={0} />
    </instancedMesh>
  );
}

export function HexExploreGroundLayer({
  tiles,
  seed,
  profile,
}: {
  tiles: HexTileDTO[];
  seed: string;
  profile: HexQualityProfile;
}) {
  const samples = useMemo(() => getExploreDecorationSamples({ seed, tiles, profile }), [profile, seed, tiles]);
  const turf = useMemo(() => samples.filter((sample) => sample.kind === 'turf'), [samples]);
  const path = useMemo(() => samples.filter((sample) => sample.kind === 'path'), [samples]);
  return (
    <group name="explore-ground-layer">
      <GroundBatch samples={turf} kind="turf" />
      <GroundBatch samples={path} kind="path" />
    </group>
  );
}
