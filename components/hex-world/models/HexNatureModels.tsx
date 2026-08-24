"use client";

import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getPBRModelPathForQuality, type HexPBRModelName } from '@/lib/hex-world/pbr/quality-assets';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean };

function materialProps(ghost = false, roughness = 0.9) {
  return { transparent: ghost, opacity: ghost ? 0.48 : 1, roughness } as const;
}

function LocalPBRModel({
  name,
  targetHeight,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  ghost = false,
}: {
  name: HexPBRModelName;
  targetHeight: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  ghost?: boolean;
}) {
  const path = getPBRModelPathForQuality(name, 'medium');
  const gltf = useGLTF(path);
  const normalized = useMemo(() => {
    const object = gltf.scene.clone(true);
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = materials.map((source) => {
        const material = source.clone();
        material.alphaTest = Math.max(material.alphaTest ?? 0, 0.35);
        material.transparent = ghost;
        material.opacity = ghost ? 0.5 : 1;
        material.depthWrite = true;
        material.needsUpdate = true;
        return material;
      });
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
      child.castShadow = true;
      child.receiveShadow = true;
    });
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const factor = targetHeight / Math.max(0.001, size.y);
    object.position.set(-center.x, -bounds.min.y, -center.z);
    return { object, factor };
  }, [gltf.scene, ghost, targetHeight]);

  return (
    <group position={position} rotation={rotation} scale={scale * normalized.factor}>
      <primitive object={normalized.object} />
    </group>
  );
}

function LilyPad({ x, z, scale = 1, ghost }: { x: number; z: number; scale?: number; ghost: boolean }) {
  return (
    <group position={[x, 0.13, z]} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0.4]}>
        <circleGeometry args={[0.19, 16, 0.25, Math.PI * 1.72]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leaf} {...materialProps(ghost, 0.94)} />
      </mesh>
      <mesh position={[0.03, 0.035, 0.02]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.flower[0]} {...materialProps(ghost, 0.9)} />
      </mesh>
    </group>
  );
}

function GardenBorder({ ghost }: { ghost: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.12, 0.67]}><boxGeometry args={[1.62, 0.1, 0.09]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...materialProps(ghost, 0.98)} /></mesh>
      <mesh position={[0, 0.12, -0.67]}><boxGeometry args={[1.62, 0.1, 0.09]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...materialProps(ghost, 0.98)} /></mesh>
      <mesh position={[0.77, 0.12, 0]}><boxGeometry args={[0.09, 0.1, 1.42]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...materialProps(ghost, 0.98)} /></mesh>
      <mesh position={[-0.77, 0.12, 0]}><boxGeometry args={[0.09, 0.1, 1.42]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...materialProps(ghost, 0.98)} /></mesh>
    </group>
  );
}

export function HexNatureModel({ buildingKey, ghost = false, selected = false }: Props) {
  const selectedScale = selected ? 1.025 : 1;
  switch (buildingKey) {
    case 'tree':
      return (
        <group scale={selectedScale}>
          <LocalPBRModel name="tree" targetHeight={2.45} ghost={ghost} rotation={[0, 0.4, 0]} />
          <LocalPBRModel name="stump" targetHeight={0.26} ghost={ghost} position={[0.42, 0, 0.3]} rotation={[0, 1.1, 0]} scale={0.65} />
        </group>
      );
    case 'flower_patch':
      return (
        <group scale={selectedScale}>
          <LocalPBRModel name="grassTuft" targetHeight={0.34} ghost={ghost} position={[-0.28, 0, -0.14]} rotation={[0, 0.2, 0]} scale={0.88} />
          <LocalPBRModel name="fern" targetHeight={0.42} ghost={ghost} position={[0.22, 0, 0.12]} rotation={[0, 2.1, 0]} scale={0.76} />
          <LocalPBRModel name="grassTuft" targetHeight={0.3} ghost={ghost} position={[0.35, 0, -0.24]} rotation={[0, 4.1, 0]} scale={0.72} />
        </group>
      );
    case 'pond':
      return (
        <group scale={selectedScale}>
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.48, 1.08, 1]} receiveShadow>
            <circleGeometry args={[0.86, 32]} />
            <meshStandardMaterial color={HEX_VISUAL_THEME.terrain.dampBank} roughness={1} transparent={ghost} opacity={ghost ? 0.42 : 1} />
          </mesh>
          <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.34, 0.94, 1]}>
            <circleGeometry args={[0.76, 32]} />
            <meshPhysicalMaterial color={HEX_VISUAL_THEME.water.deep} metalness={0} roughness={0.34} ior={1.33} transmission={0.1} transparent opacity={ghost ? 0.34 : 0.72} depthWrite={false} />
          </mesh>
          <mesh position={[0.12, 0.1, -0.03]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.92, 0.68, 1]}>
            <circleGeometry args={[0.62, 28]} />
            <meshStandardMaterial color={HEX_VISUAL_THEME.water.shallow} transparent opacity={ghost ? 0.12 : 0.18} roughness={0.4} depthWrite={false} />
          </mesh>
          <LocalPBRModel name="rockSet" targetHeight={0.32} ghost={ghost} position={[-0.9, 0.02, 0.42]} rotation={[0, 0.5, 0]} scale={0.82} />
          <LocalPBRModel name="rockSet" targetHeight={0.28} ghost={ghost} position={[0.84, 0.02, -0.28]} rotation={[0, 2.4, 0]} scale={0.72} />
          <LocalPBRModel name="fern" targetHeight={0.38} ghost={ghost} position={[-0.7, 0.03, -0.38]} rotation={[0, 1.2, 0]} scale={0.72} />
          <LocalPBRModel name="grassTuft" targetHeight={0.34} ghost={ghost} position={[0.65, 0.03, 0.38]} rotation={[0, 3.4, 0]} scale={0.8} />
          <LilyPad x={-0.24} z={0.12} scale={0.92} ghost={ghost} />
          <LilyPad x={0.36} z={-0.18} scale={0.72} ghost={ghost} />
        </group>
      );
    case 'garden_patch':
      return (
        <group scale={selectedScale}>
          <mesh position={[0, 0.065, 0]} receiveShadow>
            <boxGeometry args={[1.52, 0.13, 1.32]} />
            <meshStandardMaterial color={HEX_VISUAL_THEME.terrain.soil.base} {...materialProps(ghost, 0.99)} />
          </mesh>
          <GardenBorder ghost={ghost} />
          {[-0.48, -0.24, 0, 0.24, 0.48].map((x, index) => (
            <mesh key={x} position={[x, 0.14 + (index % 2) * 0.006, 0]}>
              <boxGeometry args={[0.045, 0.028, 1.08]} />
              <meshStandardMaterial color={index % 2 ? HEX_VISUAL_THEME.terrain.soil.dark : HEX_VISUAL_THEME.terrain.pathDirt} {...materialProps(ghost, 1)} />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
}
