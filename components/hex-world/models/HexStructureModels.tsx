"use client";

import React from 'react';
import type { BuildingTier } from '@/lib/building-progression';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean; tier?: BuildingTier };
type TierKind = 'home' | 'barn' | 'storage' | 'workshop';

function materialProps(ghost = false) {
  return { transparent: ghost, opacity: ghost ? 0.5 : 1, roughness: 0.84 } as const;
}

function Foundation({ width, depth, ghost }: { width: number; depth: number; ghost?: boolean }) {
  return (
    <mesh position={[0, 0.08, 0]} receiveShadow>
      <boxGeometry args={[width, 0.16, depth]} />
      <meshStandardMaterial color={HEX_VISUAL_THEME.structures.stoneBase} {...materialProps(ghost)} roughness={1} />
    </mesh>
  );
}

function RoofTrim({ width, depth, y, ghost, color = HEX_VISUAL_THEME.structures.trim }: { width: number; depth: number; y: number; ghost?: boolean; color?: string }) {
  const material = materialProps(ghost);
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, depth / 2]} castShadow><boxGeometry args={[width, 0.1, 0.12]} /><meshStandardMaterial color={color} {...material} /></mesh>
      <mesh position={[0, 0, -depth / 2]} castShadow><boxGeometry args={[width, 0.1, 0.12]} /><meshStandardMaterial color={color} {...material} /></mesh>
      <mesh position={[width / 2, 0, 0]} castShadow><boxGeometry args={[0.12, 0.1, depth]} /><meshStandardMaterial color={color} {...material} /></mesh>
      <mesh position={[-width / 2, 0, 0]} castShadow><boxGeometry args={[0.12, 0.1, depth]} /><meshStandardMaterial color={color} {...material} /></mesh>
    </group>
  );
}

function Window({ position, ghost }: { position: [number, number, number]; ghost?: boolean }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.4, 0.42, 0.07]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.trim} {...materialProps(ghost)} /></mesh>
      <mesh position={[0, 0, 0.045]}><boxGeometry args={[0.3, 0.32, 0.04]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.window} emissive={HEX_VISUAL_THEME.structures.windowGlow} emissiveIntensity={ghost ? 0.12 : 0.52} transparent={ghost} opacity={ghost ? 0.5 : 1} roughness={0.48} /></mesh>
      <mesh position={[0, 0, 0.072]}><boxGeometry args={[0.035, 0.32, 0.02]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...materialProps(ghost)} /></mesh>
      <mesh position={[0, 0, 0.074]}><boxGeometry args={[0.3, 0.035, 0.02]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...materialProps(ghost)} /></mesh>
    </group>
  );
}

function DoorFrame({ position, width = 0.56, height = 0.86, ghost }: { position: [number, number, number]; width?: number; height?: number; ghost?: boolean }) {
  const material = materialProps(ghost);
  return (
    <group position={position}>
      <mesh position={[-width / 2, 0, 0]}><boxGeometry args={[0.09, height, 0.08]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.trim} {...material} /></mesh>
      <mesh position={[width / 2, 0, 0]}><boxGeometry args={[0.09, height, 0.08]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.trim} {...material} /></mesh>
      <mesh position={[0, height / 2, 0]}><boxGeometry args={[width + 0.09, 0.09, 0.08]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.trim} {...material} /></mesh>
    </group>
  );
}

function StructureTierDetails({ tier, kind, ghost }: { tier: BuildingTier; kind: TierKind; ghost: boolean }) {
  const material = materialProps(ghost);
  const accent = kind === 'barn' ? HEX_VISUAL_THEME.structures.warmCream : kind === 'workshop' ? HEX_VISUAL_THEME.vegetation.leafLight : kind === 'storage' ? '#c89a6e' : '#dca18c';
  return (
    <group>
      {tier >= 2 && (
        <group>
          <mesh position={[-0.78, 0.2, 1.08]} castShadow><boxGeometry args={[0.48, 0.2, 0.32]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...material} /></mesh>
          <mesh position={[-0.78, 0.38, 1.08]}><sphereGeometry args={[0.12, 7, 5]} /><meshStandardMaterial color={accent} {...material} /></mesh>
          <mesh position={[0.78, 0.2, 1.08]} castShadow><boxGeometry args={[0.48, 0.2, 0.32]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...material} /></mesh>
          <mesh position={[0.78, 0.38, 1.08]}><sphereGeometry args={[0.12, 7, 5]} /><meshStandardMaterial color={accent} {...material} /></mesh>
        </group>
      )}
      {tier >= 3 && (
        <group position={[0, 1.82, -0.5]}>
          <mesh castShadow><cylinderGeometry args={[0.04, 0.05, 0.92, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...material} /></mesh>
          <mesh position={[0.22, 0.24, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow><coneGeometry args={[0.18, 0.44, 3]} /><meshStandardMaterial color={accent} {...material} /></mesh>
          <mesh position={[0, -0.38, 0.02]}><sphereGeometry args={[0.09, 7, 5]} /><meshStandardMaterial color="#f2c36b" emissive="#e5a946" emissiveIntensity={ghost ? 0.08 : 0.28} {...material} /></mesh>
        </group>
      )}
    </group>
  );
}

function Crates({ ghost }: { ghost: boolean }) {
  const material = materialProps(ghost);
  return (
    <group position={[-1.02, 0.27, -0.48]} rotation={[0, 0.18, 0]}>
      <mesh castShadow><boxGeometry args={[0.42, 0.42, 0.42]} /><meshStandardMaterial color="#a97953" {...material} /></mesh>
      <mesh position={[0.28, -0.07, 0.12]} castShadow><boxGeometry args={[0.32, 0.3, 0.32]} /><meshStandardMaterial color="#bd8b60" {...material} /></mesh>
    </group>
  );
}

export function HexStructureModel({ buildingKey, ghost = false, selected = false, tier = 1 }: Props) {
  const material = materialProps(ghost);
  switch (buildingKey) {
    case 'home':
      return (
        <group scale={selected ? 1.02 : 1}>
          <Foundation width={2.38} depth={1.96} ghost={ghost} />
          <mesh position={[0, 0.64, 0]} castShadow receiveShadow><boxGeometry args={[2.15, 1.12, 1.72]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.cream} {...material} /></mesh>
          <mesh position={[0, 1.52, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.08, 1, 1.08]} castShadow><coneGeometry args={[1.72, 1.02, 4]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.roof} {...material} roughness={0.76} /></mesh>
          <RoofTrim width={2.28} depth={1.84} y={1.18} ghost={ghost} />
          <mesh position={[0, 0.25, 1.04]} castShadow><boxGeometry args={[1.18, 0.18, 0.58]} /><meshStandardMaterial color="#b98560" {...material} /></mesh>
          <mesh position={[0, 0.61, 0.89]}><boxGeometry args={[0.5, 0.82, 0.08]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...material} /></mesh>
          <DoorFrame position={[0, 0.62, 0.96]} ghost={ghost} />
          <Window position={[-0.7, 0.74, 0.9]} ghost={ghost} />
          <Window position={[0.7, 0.74, 0.9]} ghost={ghost} />
          <mesh position={[0.72, 1.76, -0.35]} castShadow><boxGeometry args={[0.3, 0.9, 0.3]} /><meshStandardMaterial color="#8f6d58" {...material} /></mesh>
          <group position={[-0.84, 0.2, 1.2]}><mesh><boxGeometry args={[0.56, 0.22, 0.28]} /><meshStandardMaterial color="#a56f53" {...material} /></mesh>{[-0.14, 0, 0.14].map((x) => <mesh key={x} position={[x, 0.19, 0]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#dc91a1" {...material} /></mesh>)}</group>
          <StructureTierDetails tier={tier} kind="home" ghost={ghost} />
        </group>
      );
    case 'barn':
      return (
        <group scale={selected ? 1.02 : 1}>
          <Foundation width={2.55} depth={1.98} ghost={ghost} />
          <mesh position={[0, 0.67, 0]} castShadow receiveShadow><boxGeometry args={[2.35, 1.2, 1.78]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.barn} {...material} /></mesh>
          <mesh position={[0, 1.57, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.08, 1, 1.08]} castShadow><coneGeometry args={[1.8, 1.05, 4]} /><meshStandardMaterial color="#735545" {...material} roughness={0.84} /></mesh>
          <RoofTrim width={2.48} depth={1.92} y={1.2} ghost={ghost} color={HEX_VISUAL_THEME.structures.warmCream} />
          <mesh position={[0, 0.66, 0.92]}><boxGeometry args={[0.92, 1.06, 0.08]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...material} /></mesh>
          <DoorFrame position={[0, 0.68, 0.99]} width={0.98} height={1.08} ghost={ghost} />
          <Window position={[-0.72, 0.78, 0.94]} ghost={ghost} />
          <Window position={[0.72, 0.78, 0.94]} ghost={ghost} />
          <group position={[1.16, 0.22, 0.2]}><mesh castShadow><cylinderGeometry args={[0.3, 0.35, 0.42, 12]} /><meshStandardMaterial color="#b49359" {...material} /></mesh><mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.21, 0.28, 0.18, 12]} /><meshStandardMaterial color="#d7bd78" {...material} /></mesh></group>
          <mesh position={[-1.16, 0.34, 0.34]} rotation={[0, 0.32, Math.PI / 2]} castShadow><cylinderGeometry args={[0.3, 0.34, 0.48, 12]} /><meshStandardMaterial color="#d0ad66" {...material} /></mesh>
          <StructureTierDetails tier={tier} kind="barn" ghost={ghost} />
        </group>
      );
    case 'storage':
      return (
        <group scale={selected ? 1.02 : 1}>
          <Foundation width={1.92} depth={1.5} ghost={ghost} />
          <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[1.7, 0.94, 1.3]} /><meshStandardMaterial color="#ddc193" {...material} /></mesh>
          <mesh position={[0, 1.25, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.08, 1, 1.08]} castShadow><coneGeometry args={[1.3, 0.78, 4]} /><meshStandardMaterial color="#98694e" {...material} roughness={0.78} /></mesh>
          <RoofTrim width={1.82} depth={1.42} y={1.02} ghost={ghost} />
          <mesh position={[0, 0.55, 0.68]}><boxGeometry args={[0.66, 0.84, 0.08]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...material} /></mesh>
          <DoorFrame position={[0, 0.56, 0.74]} width={0.68} height={0.86} ghost={ghost} />
          <Crates ghost={ghost} />
          <StructureTierDetails tier={tier} kind="storage" ghost={ghost} />
        </group>
      );
    case 'workshop':
      return (
        <group scale={selected ? 1.02 : 1}>
          <Foundation width={2.42} depth={1.78} ghost={ghost} />
          <mesh position={[0, 0.61, 0]} castShadow><boxGeometry args={[2.2, 1.04, 1.55]} /><meshStandardMaterial color="#e8d8b6" {...material} /></mesh>
          <mesh position={[0, 1.43, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.08, 1, 1.08]} castShadow><coneGeometry args={[1.65, 0.92, 4]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.workshopRoof} {...material} roughness={0.8} /></mesh>
          <RoofTrim width={2.32} depth={1.68} y={1.12} ghost={ghost} color="#9db49e" />
          <mesh position={[0.8, 1.8, -0.25]} castShadow><boxGeometry args={[0.28, 0.98, 0.28]} /><meshStandardMaterial color="#89664f" {...material} /></mesh>
          <mesh position={[-0.55, 0.64, 0.8]}><boxGeometry args={[0.76, 0.72, 0.08]} /><meshStandardMaterial color="#896248" {...material} /></mesh>
          <DoorFrame position={[-0.55, 0.65, 0.87]} width={0.78} height={0.74} ghost={ghost} />
          <Window position={[0.58, 0.75, 0.81]} ghost={ghost} />
          <group position={[-1.18, 0.37, -0.36]} rotation={[0, 0.25, 0]}><mesh><boxGeometry args={[0.18, 0.88, 0.18]} /><meshStandardMaterial color="#686056" {...material} /></mesh><mesh position={[0.22, 0.22, 0]} rotation={[0, 0, -0.6]}><boxGeometry args={[0.12, 0.62, 0.12]} /><meshStandardMaterial color="#997454" {...material} /></mesh></group>
          <mesh position={[1.08, 0.25, 0.5]} castShadow><boxGeometry args={[0.5, 0.3, 0.34]} /><meshStandardMaterial color="#a97953" {...material} /></mesh>
          <StructureTierDetails tier={tier} kind="workshop" ghost={ghost} />
        </group>
      );
    default:
      return null;
  }
}
