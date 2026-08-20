"use client";

import React from 'react';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean };

function materialProps(ghost = false) {
  return { transparent: ghost, opacity: ghost ? 0.5 : 1, roughness: 0.88 } as const;
}

function Window({ position, ghost }: { position: [number, number, number]; ghost?: boolean }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.34, 0.34, 0.06]} />
      <meshStandardMaterial color="#ffd99b" emissive="#ffc96f" emissiveIntensity={ghost ? 0.15 : 0.65} transparent={ghost} opacity={ghost ? 0.5 : 1} roughness={0.55} />
    </mesh>
  );
}

export function HexStructureModel({ buildingKey, ghost = false, selected = false }: Props) {
  const material = materialProps(ghost);
  switch (buildingKey) {
    case 'home':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.58, 0]} castShadow receiveShadow><boxGeometry args={[2.15, 1.16, 1.72]} /><meshStandardMaterial color="#f3e6c9" {...material} /></mesh>
          <mesh position={[0, 1.46, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.72, 1.02, 4]} /><meshStandardMaterial color="#bf705e" {...material} /></mesh>
          <mesh position={[0, 0.2, 1.02]} castShadow><boxGeometry args={[1.15, 0.18, 0.55]} /><meshStandardMaterial color="#b88762" {...material} /></mesh>
          <mesh position={[0, 0.58, 0.89]}><boxGeometry args={[0.44, 0.78, 0.08]} /><meshStandardMaterial color="#8f654a" {...material} /></mesh>
          <Window position={[-0.7, 0.72, 0.89]} ghost={ghost} />
          <Window position={[0.7, 0.72, 0.89]} ghost={ghost} />
          <mesh position={[0.72, 1.72, -0.35]} castShadow><boxGeometry args={[0.27, 0.86, 0.27]} /><meshStandardMaterial color="#92705c" {...material} /></mesh>
          <group position={[-0.82, 0.18, 1.18]}>
            <mesh><boxGeometry args={[0.52, 0.22, 0.26]} /><meshStandardMaterial color="#a56f53" {...material} /></mesh>
            {[-0.14, 0, 0.14].map((x) => <mesh key={x} position={[x, 0.19, 0]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#d98e9f" {...material} /></mesh>)}
          </group>
        </group>
      );
    case 'storage':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.7, 1, 1.3]} /><meshStandardMaterial color="#d9bc8b" {...material} /></mesh>
          <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.3, 0.78, 4]} /><meshStandardMaterial color="#996a50" {...material} /></mesh>
          <mesh position={[0, 0.5, 0.68]}><boxGeometry args={[0.62, 0.82, 0.08]} /><meshStandardMaterial color="#795640" {...material} /></mesh>
          <mesh position={[0, 0.5, 0.73]}><boxGeometry args={[0.08, 0.82, 0.08]} /><meshStandardMaterial color="#c89a6e" {...material} /></mesh>
        </group>
      );
    case 'workshop':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[2.2, 1.1, 1.55]} /><meshStandardMaterial color="#e5d3ab" {...material} /></mesh>
          <mesh position={[0, 1.37, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.65, 0.92, 4]} /><meshStandardMaterial color="#708e79" {...material} /></mesh>
          <mesh position={[0.78, 1.75, -0.25]} castShadow><boxGeometry args={[0.26, 0.95, 0.26]} /><meshStandardMaterial color="#8b6750" {...material} /></mesh>
          <mesh position={[-0.55, 0.6, 0.8]}><boxGeometry args={[0.72, 0.68, 0.08]} /><meshStandardMaterial color="#8d6549" {...material} /></mesh>
          <Window position={[0.56, 0.72, 0.8]} ghost={ghost} />
          <group position={[-1.15, 0.35, -0.35]} rotation={[0, 0.25, 0]}>
            <mesh><boxGeometry args={[0.18, 0.85, 0.18]} /><meshStandardMaterial color="#6d6256" {...material} /></mesh>
            <mesh position={[0.22, 0.22, 0]} rotation={[0, 0, -0.6]}><boxGeometry args={[0.12, 0.62, 0.12]} /><meshStandardMaterial color="#9b7757" {...material} /></mesh>
          </group>
        </group>
      );
    default:
      return null;
  }
}
