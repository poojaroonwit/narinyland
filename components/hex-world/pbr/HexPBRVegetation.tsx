"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { HexMotionProfile } from '@/lib/hex-world/motion';
import { getPBRModelPathForQuality, type HexPBRModelName } from '@/lib/hex-world/pbr/quality-assets';
import { buildPBRVegetationScatter, type HexPBRVegetationKind, type HexPBRVegetationPlacement } from '@/lib/hex-world/pbr/vegetation-scatter';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';

type ModelPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  matrix: THREE.Matrix4;
};

const TARGET_HEIGHT: Record<HexPBRVegetationKind, number> = {
  tree: 2.4,
  shrub: 0.92,
  fern: 0.62,
  grassTuft: 0.38,
  rockSet: 0.58,
  stump: 0.52,
};

const WIND_AMPLITUDE: Record<HexPBRVegetationKind, number> = {
  tree: 0.018,
  shrub: 0.024,
  fern: 0.042,
  grassTuft: 0.052,
  rockSet: 0,
  stump: 0,
};

function modelName(kind: HexPBRVegetationKind): HexPBRModelName {
  return kind;
}

function cloneMaskedMaterial(material: THREE.Material): THREE.Material {
  const clone = material.clone();
  clone.alphaTest = Math.max(clone.alphaTest ?? 0, 0.35);
  clone.transparent = false;
  clone.depthWrite = true;
  clone.needsUpdate = true;
  return clone;
}

function PBRInstancedGLTF({
  kind,
  placements,
  profile,
  motionProfile,
}: {
  kind: HexPBRVegetationKind;
  placements: HexPBRVegetationPlacement[];
  profile: HexQualityProfile;
  motionProfile: HexMotionProfile;
}) {
  const path = getPBRModelPathForQuality(modelName(kind), profile.name);
  const gltf = useGLTF(path);
  const partRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const normalizer = useMemo(() => new THREE.Matrix4(), []);
  const finalMatrix = useMemo(() => new THREE.Matrix4(), []);

  const model = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = TARGET_HEIGHT[kind] / Math.max(0.001, size.y);
    normalizer.makeTranslation(-center.x, -bounds.min.y, -center.z);
    const parts: ModelPart[] = [];
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.geometry) return;
      const material = Array.isArray(object.material)
        ? object.material.map(cloneMaskedMaterial)
        : cloneMaskedMaterial(object.material);
      parts.push({ geometry: object.geometry, material, matrix: object.matrixWorld.clone() });
    });
    return { parts, scale };
  }, [gltf.scene, kind, normalizer]);

  useLayoutEffect(() => () => {
    for (const part of model.parts) {
      const materials = Array.isArray(part.material) ? part.material : [part.material];
      for (const material of materials) material.dispose();
    }
  }, [model.parts]);

  const applyTransforms = (time = 0) => {
    const amplitude = WIND_AMPLITUDE[kind];
    model.parts.forEach((part, partIndex) => {
      const mesh = partRefs.current[partIndex];
      if (!mesh) return;
      placements.forEach((placement, index) => {
        const primary = Math.sin(time * 0.66 + placement.windPhase);
        const secondary = Math.sin(time * 0.31 + placement.windPhase * 1.83);
        const sway = amplitude * motionProfile.worldWindScale * (
          primary + secondary * 0.35 * motionProfile.worldWindSecondaryScale
        );
        dummy.position.set(placement.x, placement.y, placement.z);
        dummy.rotation.set(sway * 0.32, placement.rotation, sway);
        dummy.scale.setScalar(placement.scale * model.scale);
        dummy.updateMatrix();
        finalMatrix.copy(dummy.matrix).multiply(normalizer).multiply(part.matrix);
        mesh.setMatrixAt(index, finalMatrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  useLayoutEffect(() => {
    applyTransforms(0);
  // Transform inputs are all captured from deterministic placement/model values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements, model.parts, model.scale]);

  useFrame(({ clock }) => {
    if (WIND_AMPLITUDE[kind] <= 0 || document.visibilityState === 'hidden') return;
    applyTransforms(clock.elapsedTime);
  });

  if (!placements.length || !model.parts.length) return null;
  return (
    <group>
      {model.parts.map((part, partIndex) => (
        <instancedMesh
          key={`${kind}-${partIndex}`}
          ref={(node) => { partRefs.current[partIndex] = node; }}
          args={[part.geometry, part.material, placements.length]}
          castShadow={profile.name !== 'mobile' && kind !== 'grassTuft'}
          receiveShadow
          raycast={() => {}}
        />
      ))}
    </group>
  );
}

const KINDS: readonly HexPBRVegetationKind[] = ['tree', 'shrub', 'fern', 'grassTuft', 'rockSet', 'stump'];

export function HexPBRVegetation({
  tiles,
  buildings,
  seed,
  profile,
  motionProfile,
}: {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  seed: string;
  profile: HexQualityProfile;
  motionProfile: HexMotionProfile;
}) {
  const scatter = useMemo(
    () => buildPBRVegetationScatter({ tiles, buildings, seed, profile }),
    [buildings, profile, seed, tiles],
  );
  const buckets = useMemo(() => {
    const result = new Map<HexPBRVegetationKind, HexPBRVegetationPlacement[]>(KINDS.map((kind) => [kind, []]));
    for (const placement of scatter) result.get(placement.kind)!.push(placement);
    return result;
  }, [scatter]);

  return (
    <group>
      {KINDS.map((kind) => (
        <PBRInstancedGLTF
          key={kind}
          kind={kind}
          placements={buckets.get(kind) ?? []}
          profile={profile}
          motionProfile={motionProfile}
        />
      ))}
    </group>
  );
}
