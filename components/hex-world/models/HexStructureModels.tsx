"use client";

import React from 'react';
import type { BuildingTier } from '@/lib/building-progression';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean; tier?: BuildingTier };
type TierKind = 'home' | 'barn' | 'storage' | 'workshop';

function materialProps(ghost = false) {
  return { transparent: ghost, opacity: ghost ? 0.5 : 1, roughness: 0.82 } as const;
}

function Window({ position, ghost }: { position: [number, number, number]; ghost?: boolean }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.34, 0.34, 0.06]} />
      <meshStandardMaterial color="#ffe0a4" emissive="#ffc978" emissiveIntensity={ghost ? 0.12 : 0.58} transparent={ghost} opacity={ghost ? 0.5 : 1} roughness={0.5} />
    </mesh>
  );
}

function StructureTierDetails({ tier, kind, ghost }: { tier: BuildingTier; kind: TierKind; ghost: boolean }) {
  const material = materialProps(ghost);
  const accent = kind === 'barn' ? '#ead7b5' : kind === 'workshop' ? '#97af9c' : kind === 'storage' ? '#c89a6e' : '#dca18c';
  return (
    <group>
      {tier >= 2 && (
        <group>
          <mesh position={[-0.78, 0.18, 1.06]} castShadow><boxGeometry args={[0.48, 0.18, 0.3]} /><meshStandardMaterial color="#9a704f" {...material} /></mesh>
          <mesh position={[-0.78, 0.34, 1.06]}><sphereGeometry args={[0.12, 7, 5]} /><meshStandardMaterial color={accent} {...material} /></mesh>
          <mesh position={[0.78, 0.18, 1.06]} castShadow><boxGeometry args={[0.48, 0.18, 0.3]} /><meshStandardMaterial color="#9a704f" {...material} /></mesh>
          <mesh position={[0.78, 0.34, 1.06]}><sphereGeometry args={[0.12, 7, 5]} /><meshStandardMaterial color={accent} {...material} /></mesh>
        </group>
      )}
      {tier >= 3 && (
        <group position={[0, 1.78, -0.48]}>
          <mesh castShadow><cylinderGeometry args={[0.035, 0.045, 0.92, 6]} /><meshStandardMaterial color="#6f5947" {...material} /></mesh>
          <mesh position={[0.22, 0.24, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow><coneGeometry args={[0.18, 0.44, 3]} /><meshStandardMaterial color={accent} {...material} /></mesh>
          <mesh position={[0, -0.38, 0.02]}><sphereGeometry args={[0.09, 7, 5]} /><meshStandardMaterial color="#f2c36b" emissive="#e5a946" emissiveIntensity={ghost ? 0.08 : 0.3} {...material} /></mesh>
        </group>
      )}
    </group>
  );
}

export function HexStructureModel({ buildingKey, ghost = false, selected = false, tier = 1 }: Props) {
  const material = materialProps(ghost);
  switch (buildingKey) {
    case 'home':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.58, 0]} castShadow receiveShadow><boxGeometry args={[2.15, 1.16, 1.72]} /><meshStandardMaterial color="#f5e9cf" {...material} /></mesh>
          <mesh position={[0, 1.46, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.72, 1.02, 4]} /><meshStandardMaterial color="#bd705e" {...material} roughness={0.76} /></mesh>
          <mesh position={[0, 0.2, 1.02]} castShadow><boxGeometry args={[1.15, 0.18, 0.55]} /><meshStandardMaterial color="#b98560" {...material} /></mesh>
          <mesh position={[0, 0.58, 0.89]}><boxGeometry args={[0.44, 0.78, 0.08]} /><meshStandardMaterial color="#8a6248" {...material} /></mesh>
          <Window position={[-0.7, 0.72, 0.89]} ghost={ghost} />
          <Window position={[0.7, 0.72, 0.89]} ghost={ghost} />
          <mesh position={[0.72, 1.72, -0.35]} castShadow><boxGeometry args={[0.27, 0.86, 0.27]} /><meshStandardMaterial color="#8f6d58" {...material} /></mesh>
          <group position={[-0.82, 0.18, 1.18]}>
            <mesh><boxGeometry args={[0.52, 0.22, 0.26]} /><meshStandardMaterial color="#a56f53" {...material} /></mesh>
            {[-0.14, 0, 0.14].map((x) => <mesh key={x} position={[x, 0.19, 0]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#dc91a1" {...material} /></mesh>)}
          </group>
          <StructureTierDetails tier={tier} kind="home" ghost={ghost} />
        </group>
      );
    case 'barn':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.62, 0]} castShadow receiveShadow><boxGeometry args={[2.35, 1.24, 1.78]} /><meshStandardMaterial color="#b95f4f" {...material} /></mesh>
          <mesh position={[0, 1.52, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.8, 1.05, 4]} /><meshStandardMaterial color="#765746" {...material} roughness={0.84} /></mesh>
          <mesh position={[0, 0.62, 0.92]}><boxGeometry args={[0.86, 1.02, 0.08]} /><meshStandardMaterial color="#77503c" {...material} /></mesh>
          <mesh position={[0, 0.62, 0.98]}><boxGeometry args={[0.08, 0.92, 0.08]} /><meshStandardMaterial color="#ead7b5" {...material} /></mesh>
          <mesh position={[0, 0.62, 0.99]}><boxGeometry args={[0.76, 0.08, 0.08]} /><meshStandardMaterial color="#ead7b5" {...material} /></mesh>
          <mesh position={[-0.68, 0.75, 0.93]}><boxGeometry args={[0.32, 0.32, 0.07]} /><meshStandardMaterial color="#ffe0a4" emissive="#ffc978" emissiveIntensity={ghost ? 0.08 : 0.38} {...material} /></mesh>
          <mesh position={[0.68, 0.75, 0.93]}><boxGeometry args={[0.32, 0.32, 0.07]} /><meshStandardMaterial color="#ffe0a4" emissive="#ffc978" emissiveIntensity={ghost ? 0.08 : 0.38} {...material} /></mesh>
          <group position={[1.14, 0.2, 0.2]}>
            <mesh castShadow><cylinderGeometry args={[0.28, 0.34, 0.4, 12]} /><meshStandardMaterial color="#b49359" {...material} /></mesh>
            <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.2, 0.27, 0.18, 12]} /><meshStandardMaterial color="#d7bd78" {...material} /></mesh>
          </group>
          <StructureTierDetails tier={tier} kind="barn" ghost={ghost} />
        </group>
      );
    case 'storage':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.7, 1, 1.3]} /><meshStandardMaterial color="#ddc193" {...material} /></mesh>
          <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.3, 0.78, 4]} /><meshStandardMaterial color="#98694e" {...material} roughness={0.78} /></mesh>
          <mesh position={[0, 0.5, 0.68]}><boxGeometry args={[0.62, 0.82, 0.08]} /><meshStandardMaterial color="#76533e" {...material} /></mesh>
          <mesh position={[0, 0.5, 0.73]}><boxGeometry args={[0.08, 0.82, 0.08]} /><meshStandardMaterial color="#c89a6e" {...material} /></mesh>
          <StructureTierDetails tier={tier} kind="storage" ghost={ghost} />
        </group>
      );
    case 'workshop':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[2.2, 1.1, 1.55]} /><meshStandardMaterial color="#e8d8b6" {...material} /></mesh>
          <mesh position={[0, 1.37, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.65, 0.92, 4]} /><meshStandardMaterial color="#708c77" {...material} roughness={0.8} /></mesh>
          <mesh position={[0.78, 1.75, -0.25]} castShadow><boxGeometry args={[0.26, 0.95, 0.26]} /><meshStandardMaterial color="#89664f" {...material} /></mesh>
          <mesh position={[-0.55, 0.6, 0.8]}><boxGeometry args={[0.72, 0.68, 0.08]} /><meshStandardMaterial color="#896248" {...material} /></mesh>
          <Window position={[0.56, 0.72, 0.8]} ghost={ghost} />
          <group position={[-1.15, 0.35, -0.35]} rotation={[0, 0.25, 0]}>
            <mesh><boxGeometry args={[0.18, 0.85, 0.18]} /><meshStandardMaterial color="#686056" {...material} /></mesh>
            <mesh position={[0.22, 0.22, 0]} rotation={[0, 0, -0.6]}><boxGeometry args={[0.12, 0.62, 0.12]} /><meshStandardMaterial color="#997454" {...material} /></mesh>
          </group>
          <StructureTierDetails tier={tier} kind="workshop" ghost={ghost} />
        </group>
      );
    default:
      return null;
  }
}
