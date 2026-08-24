"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getExploreDecorationSamples, type ExploreDecorationKind, type ExploreDecorationSample } from '@/lib/hex-world/explore-decoration';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

function ExploreDecorBatch({
  samples,
  kind,
  reducedMotion,
}: {
  samples: ExploreDecorationSample[];
  kind: Exclude<ExploreDecorationKind, 'turf' | 'path'>;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const apply = (sway = 0) => {
    const mesh = ref.current;
    if (!mesh) return;
    samples.forEach((sample, index) => {
      dummy.position.set(sample.x, sample.y, sample.z);
      dummy.rotation.set(kind === 'flower' || kind === 'reed' ? sway : 0, sample.rotation, kind === 'shrub' ? sway * 0.4 : sway);
      const scale = sample.scale;
      if (kind === 'rock') dummy.scale.set(scale * 0.2, scale * 0.16, scale * 0.24);
      else if (kind === 'flower') dummy.scale.set(scale * 0.11, scale * 0.34, scale * 0.11);
      else if (kind === 'reed') dummy.scale.set(scale * 0.07, scale * 0.42, scale * 0.07);
      else dummy.scale.set(scale * 0.28, scale * 0.25, scale * 0.28);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const color = kind === 'rock'
        ? new THREE.Color(sample.tone > 0.5 ? HEX_VISUAL_THEME.terrain.stone.accent : HEX_VISUAL_THEME.terrain.stone.base)
        : kind === 'flower'
          ? new THREE.Color(HEX_VISUAL_THEME.vegetation.flower[Math.min(HEX_VISUAL_THEME.vegetation.flower.length - 1, Math.floor(sample.tone * HEX_VISUAL_THEME.vegetation.flower.length))])
          : kind === 'reed'
            ? new THREE.Color(HEX_VISUAL_THEME.vegetation.grass)
            : new THREE.Color(sample.tone > 0.52 ? HEX_VISUAL_THEME.vegetation.leafLight : HEX_VISUAL_THEME.vegetation.leafDark);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    apply(0);
  // apply derives only from stable samples/kind and object refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples, kind]);

  useFrame(({ clock }) => {
    if (reducedMotion || !samples.length || document.visibilityState === 'hidden' || (kind !== 'flower' && kind !== 'reed' && kind !== 'shrub')) return;
    apply(Math.sin(clock.elapsedTime * 1.05 + kind.length) * 0.025);
  });

  if (!samples.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, samples.length]} castShadow={kind !== 'flower' && kind !== 'reed'} receiveShadow={kind === 'rock'} raycast={() => {}}>
      {kind === 'rock' && <dodecahedronGeometry args={[1, 0]} />}
      {kind === 'shrub' && <dodecahedronGeometry args={[1, 0]} />}
      {kind === 'flower' && <coneGeometry args={[0.7, 2.1, 6]} />}
      {kind === 'reed' && <cylinderGeometry args={[0.28, 0.42, 2.3, 5]} />}
      <meshStandardMaterial roughness={kind === 'rock' ? 1 : 0.92} metalness={0} />
    </instancedMesh>
  );
}

export function HexExploreEnvironmentLayer({
  tiles,
  seed,
  profile,
  reducedMotion,
}: {
  tiles: HexTileDTO[];
  seed: string;
  profile: HexQualityProfile;
  reducedMotion: boolean;
}) {
  const samples = useMemo(() => getExploreDecorationSamples({ seed, tiles, profile }), [profile, seed, tiles]);
  const byKind = useMemo(() => ({
    flower: samples.filter((sample) => sample.kind === 'flower'),
    shrub: samples.filter((sample) => sample.kind === 'shrub'),
    rock: samples.filter((sample) => sample.kind === 'rock'),
    reed: samples.filter((sample) => sample.kind === 'reed'),
  }), [samples]);

  return (
    <group name="explore-environment-layer">
      <ExploreDecorBatch samples={byKind.flower} kind="flower" reducedMotion={reducedMotion} />
      <ExploreDecorBatch samples={byKind.shrub} kind="shrub" reducedMotion={reducedMotion} />
      <ExploreDecorBatch samples={byKind.rock} kind="rock" reducedMotion={reducedMotion} />
      <ExploreDecorBatch samples={byKind.reed} kind="reed" reducedMotion={reducedMotion} />
    </group>
  );
}
