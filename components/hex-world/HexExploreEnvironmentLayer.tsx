"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getExploreDecorationSamples, type ExploreDecorationSample } from '@/lib/hex-world/explore-decoration';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type MicrofloraKind = 'flower' | 'reed';

function ExploreMicrofloraBatch({
  samples,
  kind,
  reducedMotion,
}: {
  samples: ExploreDecorationSample[];
  kind: MicrofloraKind;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const apply = (sway = 0) => {
    const mesh = ref.current;
    if (!mesh) return;
    samples.forEach((sample, index) => {
      dummy.position.set(sample.x, sample.y, sample.z);
      dummy.rotation.set(sway, sample.rotation, sway * 0.7);
      const scale = sample.scale;
      if (kind === 'flower') dummy.scale.set(scale * 0.12, scale * 0.09, scale * 0.12);
      else dummy.scale.set(scale * 0.055, scale * 0.4, scale * 0.055);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const color = kind === 'flower'
        ? new THREE.Color(HEX_VISUAL_THEME.vegetation.flower[Math.min(HEX_VISUAL_THEME.vegetation.flower.length - 1, Math.floor(sample.tone * HEX_VISUAL_THEME.vegetation.flower.length))])
        : new THREE.Color(sample.tone > 0.55 ? HEX_VISUAL_THEME.vegetation.leafLight : HEX_VISUAL_THEME.vegetation.grass);
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
    if (reducedMotion || !samples.length || document.visibilityState === 'hidden') return;
    apply(Math.sin(clock.elapsedTime * 0.9 + kind.length) * 0.022);
  });

  if (!samples.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, samples.length]} raycast={() => {}}>
      {kind === 'flower' && <sphereGeometry args={[1, 6, 4]} />}
      {kind === 'reed' && <cylinderGeometry args={[0.28, 0.4, 2.3, 5]} />}
      <meshStandardMaterial roughness={0.94} metalness={0} />
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
    reed: samples.filter((sample) => sample.kind === 'reed'),
  }), [samples]);

  return (
    <group name="explore-microflora-layer">
      <ExploreMicrofloraBatch samples={byKind.flower} kind="flower" reducedMotion={reducedMotion} />
      <ExploreMicrofloraBatch samples={byKind.reed} kind="reed" reducedMotion={reducedMotion} />
    </group>
  );
}
