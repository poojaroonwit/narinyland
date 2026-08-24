"use client";

import React from 'react';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean };

function materialProps(ghost = false, roughness = 0.9) {
  return { transparent: ghost, opacity: ghost ? 0.48 : 1, roughness } as const;
}

function Branch({ position, rotation, scale = 1, ghost }: { position: [number, number, number]; rotation: [number, number, number]; scale?: number; ghost: boolean }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow>
      <cylinderGeometry args={[0.045, 0.075, 0.72, 7]} />
      <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.trunkDark} {...materialProps(ghost, 0.98)} />
    </mesh>
  );
}

function LeafCluster({ position, scale, color, ghost }: { position: [number, number, number]; scale: [number, number, number]; color: string; ghost: boolean }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <icosahedronGeometry args={[0.42, 1]} />
      <meshStandardMaterial color={color} {...materialProps(ghost, 0.96)} />
    </mesh>
  );
}

function ReedCluster({ x, z, ghost }: { x: number; z: number; ghost: boolean }) {
  return (
    <group position={[x, 0.12, z]}>
      {[-0.08, 0.02, 0.1].map((offset, index) => (
        <mesh key={offset} position={[offset, 0.2 + index * 0.025, (index - 1) * 0.035]} rotation={[0, 0, offset * 1.6]}>
          <cylinderGeometry args={[0.014, 0.024, 0.42 + index * 0.04, 5]} />
          <meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.grass} {...materialProps(ghost, 1)} />
        </mesh>
      ))}
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
      <mesh position={[0.03, 0.035, 0.02]}><sphereGeometry args={[0.04, 8, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.flower[0]} {...materialProps(ghost, 0.9)} /></mesh>
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

export function HexNatureModel({ buildingKey, ghost = false }: Props) {
  switch (buildingKey) {
    case 'tree':
      return (
        <group>
          <mesh position={[0, 0.54, 0]} castShadow><cylinderGeometry args={[0.13, 0.23, 1.08, 8]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.trunk} {...materialProps(ghost, 0.98)} /></mesh>
          <Branch position={[-0.12, 0.98, 0]} rotation={[0, 0.3, 0.72]} ghost={ghost} />
          <Branch position={[0.14, 1.12, -0.03]} rotation={[0.18, Math.PI, -0.68]} scale={0.92} ghost={ghost} />
          <Branch position={[0, 1.3, 0.03]} rotation={[0.6, 0.8, 0.24]} scale={0.78} ghost={ghost} />
          <LeafCluster position={[-0.36, 1.24, 0.06]} scale={[1.08, 0.9, 0.98]} color={HEX_VISUAL_THEME.vegetation.leafLight} ghost={ghost} />
          <LeafCluster position={[0.34, 1.26, -0.03]} scale={[0.98, 1.02, 0.94]} color={HEX_VISUAL_THEME.vegetation.leaf} ghost={ghost} />
          <LeafCluster position={[-0.14, 1.53, -0.2]} scale={[0.9, 0.95, 0.88]} color={HEX_VISUAL_THEME.vegetation.leaf} ghost={ghost} />
          <LeafCluster position={[0.18, 1.57, 0.18]} scale={[0.9, 0.96, 0.9]} color={HEX_VISUAL_THEME.vegetation.leafDark} ghost={ghost} />
          <LeafCluster position={[0.02, 1.76, -0.02]} scale={[0.86, 0.9, 0.84]} color={HEX_VISUAL_THEME.vegetation.leafDark} ghost={ghost} />
          <mesh position={[-0.02, 0.18, 0.08]} rotation={[-Math.PI / 2, 0, 0.8]}><torusGeometry args={[0.24, 0.035, 6, 14, Math.PI * 1.25]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.trunkDark} {...materialProps(ghost, 1)} /></mesh>
        </group>
      );
    case 'flower_patch':
      return (
        <group>
          {[[-0.34, -0.2], [0.28, -0.2], [-0.12, 0.2], [0.35, 0.22], [0.02, -0.02]].map(([x, z], index) => (
            <group key={`${x}:${z}`} position={[x, 0, z]}>
              <mesh position={[0, 0.2 + (index % 2) * 0.025, 0]}><cylinderGeometry args={[0.018, 0.028, 0.4 + (index % 2) * 0.05, 5]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.grass} {...materialProps(ghost, 1)} /></mesh>
              {[0, 1, 2, 3, 4].map((petal) => {
                const angle = (petal / 5) * Math.PI * 2;
                return <mesh key={petal} position={[Math.cos(angle) * 0.055, 0.44 + (index % 2) * 0.05, Math.sin(angle) * 0.055]} scale={[0.07, 0.035, 0.05]}><sphereGeometry args={[1, 7, 5]} /><meshStandardMaterial color={HEX_VISUAL_THEME.vegetation.flower[index % HEX_VISUAL_THEME.vegetation.flower.length]} {...materialProps(ghost, 0.9)} /></mesh>;
              })}
            </group>
          ))}
        </group>
      );
    case 'pond':
      return (
        <group>
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
          {[[-0.98, 0.45], [0.9, -0.32], [0.62, 0.62], [-0.7, -0.55]].map(([x, z], index) => <mesh key={index} position={[x, 0.14, z]} rotation={[0.2, index * 0.8, 0.1]} scale={[1 + index * 0.04, 0.72, 1]}><icosahedronGeometry args={[0.16 + index * 0.02, 0]} /><meshStandardMaterial color={index % 2 ? HEX_VISUAL_THEME.terrain.stone.base : HEX_VISUAL_THEME.terrain.stone.accent} {...materialProps(ghost, 1)} /></mesh>)}
          <ReedCluster x={-0.76} z={-0.36} ghost={ghost} />
          <ReedCluster x={0.72} z={0.39} ghost={ghost} />
          <LilyPad x={-0.24} z={0.12} scale={0.92} ghost={ghost} />
          <LilyPad x={0.36} z={-0.18} scale={0.72} ghost={ghost} />
        </group>
      );
    case 'garden_patch':
      return (
        <group>
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
