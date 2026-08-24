"use client";

import React from 'react';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean };

function materialProps(ghost = false) {
  return { transparent: ghost, opacity: ghost ? 0.5 : 1, roughness: 0.86 } as const;
}

function ReedCluster({ x, z, ghost }: { x: number; z: number; ghost: boolean }) {
  const material = materialProps(ghost);
  return (
    <group position={[x, 0.15, z]}>
      {[-0.08, 0.02, 0.1].map((offset, index) => (
        <mesh key={offset} position={[offset, 0.2 + index * 0.025, (index - 1) * 0.035]} rotation={[0, 0, offset * 1.6]}>
          <cylinderGeometry args={[0.018, 0.027, 0.42 + index * 0.04, 5]} />
          <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.grass} {...material} />
        </mesh>
      ))}
    </group>
  );
}

function LilyPad({ x, z, scale = 1, ghost }: { x: number; z: number; scale?: number; ghost: boolean }) {
  return (
    <group position={[x, 0.185, z]} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0.4]}>
        <circleGeometry args={[0.19, 12, 0.25, Math.PI * 1.72]} />
        <meshStandardMaterial color="#6f9c69" {...materialProps(ghost)} roughness={0.92} />
      </mesh>
      <mesh position={[0.03, 0.035, 0.02]}><sphereGeometry args={[0.045, 7, 5]} /><meshStandardMaterial color="#efb4c0" {...materialProps(ghost)} /></mesh>
    </group>
  );
}

export function HexNatureModel({ buildingKey, ghost = false, selected = false }: Props) {
  const material = materialProps(ghost);
  switch (buildingKey) {
    case 'tree':
      return (
        <group scale={selected ? 1.03 : 1}>
          <mesh position={[0, 0.53, 0]} castShadow><cylinderGeometry args={[0.14, 0.24, 1.06, 7]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.trunk} {...material} roughness={0.94} /></mesh>
          <mesh position={[-0.32, 1.18, 0.07]} scale={[1.06, 0.96, 1]} castShadow><dodecahedronGeometry args={[0.57, 0]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leafLight} {...material} /></mesh>
          <mesh position={[0.31, 1.22, 0]} scale={[0.98, 1.05, 1]} castShadow><dodecahedronGeometry args={[0.55, 0]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leaf} {...material} /></mesh>
          <mesh position={[0.03, 1.55, -0.08]} scale={[1.04, 1.08, 0.98]} castShadow><dodecahedronGeometry args={[0.61, 0]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.leafDark} {...material} /></mesh>
          <mesh position={[-0.02, 0.2, 0.08]} rotation={[0, 0.8, 0]}><torusGeometry args={[0.26, 0.04, 5, 12, Math.PI * 1.25]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.trunkDark} {...material} /></mesh>
        </group>
      );
    case 'flower_patch':
      return (
        <group scale={selected ? 1.03 : 1}>
          {[[-0.34, -0.2], [0.28, -0.2], [-0.12, 0.2], [0.35, 0.22], [0.02, -0.02]].map(([x, z], index) => (
            <group key={`${x}:${z}`} position={[x, 0, z]}>
              <mesh position={[0, 0.2 + (index % 2) * 0.025, 0]}><cylinderGeometry args={[0.024, 0.034, 0.4 + (index % 2) * 0.05, 5]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.grass} {...material} /></mesh>
              <mesh position={[0, 0.44 + (index % 2) * 0.05, 0]} rotation={[0, index * 0.6, 0]}><dodecahedronGeometry args={[0.12 + (index % 3) * 0.008, 0]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.flower[index % HEX_VISUAL_THEME.vegetation.flower.length]} {...material} roughness={0.8} /></mesh>
            </group>
          ))}
        </group>
      );
    case 'pond':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.025, 0]} scale={[1.5, 0.13, 1.12]} receiveShadow><cylinderGeometry args={[0.79, 0.86, 0.3, 18]} /><meshStandardMaterial color={HEX_VISUAL_THEME.water.bank} roughness={0.98} transparent={ghost} opacity={ghost ? 0.45 : 1} /></mesh>
          <mesh position={[0, 0.105, 0]} scale={[1.34, 0.06, 0.96]}><cylinderGeometry args={[0.72, 0.76, 0.14, 20]} /><meshStandardMaterial color={HEX_VISUAL_THEME.water.surface} metalness={0.01} roughness={0.46} transparent opacity={ghost ? 0.4 : 0.76} /></mesh>
          <mesh position={[0, 0.132, 0]} scale={[1.1, 0.018, 0.74]}><cylinderGeometry args={[0.7, 0.72, 0.08, 20]} /><meshStandardMaterial color={HEX_VISUAL_THEME.water.shallow} transparent opacity={ghost ? 0.2 : 0.2} roughness={0.38} depthWrite={false} /></mesh>
          {[[-0.98, 0.45], [0.9, -0.32], [0.62, 0.62], [-0.7, -0.55]].map(([x, z], index) => <mesh key={index} position={[x, 0.19, z]} rotation={[0.2, index * 0.8, 0.1]} scale={[1 + index * 0.04, 0.8, 1]}><dodecahedronGeometry args={[0.18 + index * 0.022, 0]} /><meshStandardMaterial color={index % 2 ? HEX_VISUAL_THEME.terrain.stone.base : HEX_VISUAL_THEME.terrain.stone.accent} {...material} /></mesh>)}
          <ReedCluster x={-0.76} z={-0.36} ghost={ghost} />
          <ReedCluster x={0.72} z={0.39} ghost={ghost} />
          <LilyPad x={-0.24} z={0.12} scale={0.92} ghost={ghost} />
          <LilyPad x={0.36} z={-0.18} scale={0.72} ghost={ghost} />
        </group>
      );
    case 'garden_patch':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.07, 0]} receiveShadow><cylinderGeometry args={[0.82, 0.86, 0.17, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.terrain.soil.base} {...material} roughness={0.98} /></mesh>
          {[-0.4, -0.2, 0, 0.2, 0.4].map((x, index) => (
            <mesh key={x} position={[x, 0.17 + (index % 2) * 0.008, 0]}>
              <boxGeometry args={[0.055, 0.04, 1.18]} />
              <meshStandardMaterial color={index % 2 ? HEX_VISUAL_THEME.terrain.soil.dark : '#825d43'} {...material} roughness={1} />
            </mesh>
          ))}
          <mesh position={[0, 0.115, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.64, 0.72, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...material} roughness={1} /></mesh>
        </group>
      );
    default:
      return null;
  }
}
