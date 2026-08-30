"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getUnlockedIslandBounds } from '@/lib/hex-world/camera';
import { buildFloatingIslandFragmentPlacements } from '@/lib/hex-world/floating-island-composition';
import { getPBRModelPathForQuality } from '@/lib/hex-world/pbr/quality-assets';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

type ModelPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  matrix: THREE.Matrix4;
};

function cloneRockMaterial(material: THREE.Material): THREE.Material {
  const clone = material.clone();
  clone.transparent = false;
  clone.opacity = 1;
  clone.depthWrite = true;
  clone.needsUpdate = true;
  return clone;
}

export function HexPBRFloatingFragments({
  tiles,
  seed,
  profile,
}: {
  tiles: HexTileDTO[];
  seed: string;
  profile: HexQualityProfile;
}) {
  const path = getPBRModelPathForQuality('rockSet', profile.name);
  const gltf = useGLTF(path);
  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const normalizer = useMemo(() => new THREE.Matrix4(), []);
  const finalMatrix = useMemo(() => new THREE.Matrix4(), []);
  const bounds = useMemo(() => getUnlockedIslandBounds(tiles), [tiles]);
  const placements = useMemo(
    () => buildFloatingIslandFragmentPlacements({ bounds, seed, quality: profile.name }),
    [bounds, profile.name, seed],
  );

  const model = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const modelBounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = modelBounds.getSize(new THREE.Vector3());
    const center = modelBounds.getCenter(new THREE.Vector3());
    const baseScale = 1 / Math.max(0.001, Math.max(size.x, size.y, size.z));
    normalizer.makeTranslation(-center.x, -center.y, -center.z);

    const parts: ModelPart[] = [];
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.geometry) return;
      const material = Array.isArray(object.material)
        ? object.material.map(cloneRockMaterial)
        : cloneRockMaterial(object.material);
      parts.push({ geometry: object.geometry, material, matrix: object.matrixWorld.clone() });
    });
    return { parts, baseScale };
  }, [gltf.scene, normalizer]);

  useLayoutEffect(() => {
    model.parts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      placements.forEach((placement, index) => {
        dummy.position.set(...placement.position);
        dummy.rotation.set(...placement.rotation);
        dummy.scale.setScalar(placement.scale * model.baseScale * 2.2);
        dummy.updateMatrix();
        finalMatrix.copy(dummy.matrix).multiply(normalizer).multiply(part.matrix);
        mesh.setMatrixAt(index, finalMatrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [dummy, finalMatrix, model.baseScale, model.parts, normalizer, placements]);

  useLayoutEffect(() => () => {
    for (const part of model.parts) {
      const materials = Array.isArray(part.material) ? part.material : [part.material];
      for (const material of materials) material.dispose();
    }
  }, [model.parts]);

  if (!model.parts.length) return null;
  return (
    <group>
      {model.parts.map((part, partIndex) => (
        <instancedMesh
          key={`floating-rock-${partIndex}`}
          ref={(node) => { meshRefs.current[partIndex] = node; }}
          args={[part.geometry, part.material, placements.length]}
          castShadow={profile.name !== 'mobile'}
          receiveShadow
          raycast={() => {}}
        />
      ))}
    </group>
  );
}
