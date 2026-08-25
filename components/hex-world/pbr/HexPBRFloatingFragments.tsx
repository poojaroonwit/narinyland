"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getPBRModelPathForQuality } from '@/lib/hex-world/pbr/quality-assets';
import type { HexQualityProfile } from '@/lib/hex-world/quality';

type FragmentPlacement = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

type ModelPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  matrix: THREE.Matrix4;
};

const FRAGMENTS: readonly FragmentPlacement[] = [
  { position: [-9, -2.4, 2], rotation: [0.2, 0, 0.12], scale: 0.7 },
  { position: [9, -3.1, 4], rotation: [0.14, 0.8, -0.08], scale: 0.55 },
  { position: [6, -2.2, -10], rotation: [-0.12, 1.6, 0.16], scale: 0.45 },
  { position: [-6, -3.5, -9], rotation: [0.16, 2.4, -0.1], scale: 0.5 },
] as const;

function cloneRockMaterial(material: THREE.Material): THREE.Material {
  const clone = material.clone();
  clone.transparent = false;
  clone.opacity = 1;
  clone.depthWrite = true;
  clone.needsUpdate = true;
  return clone;
}

export function HexPBRFloatingFragments({ profile }: { profile: HexQualityProfile }) {
  const path = getPBRModelPathForQuality('rockSet', profile.name);
  const gltf = useGLTF(path);
  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const normalizer = useMemo(() => new THREE.Matrix4(), []);
  const finalMatrix = useMemo(() => new THREE.Matrix4(), []);

  const model = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
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

  const placements = profile.name === 'mobile' ? FRAGMENTS.slice(0, 2) : FRAGMENTS;

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
