"use client";

import React from 'react';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean };

function materialProps(ghost = false) {
  return { transparent: ghost, opacity: ghost ? 0.5 : 1, roughness: 0.9 } as const;
}

export function HexDecorModel({ buildingKey, ghost = false, selected = false }: Props) {
  const material = materialProps(ghost);
  switch (buildingKey) {
    case 'bench':
      return (
        <group scale={selected ? 1.03 : 1}>
          <mesh position={[0, 0.34, 0]} castShadow><boxGeometry args={[1.02, 0.14, 0.34]} /><meshStandardMaterial color="#a97850" {...material} /></mesh>
          <mesh position={[0, 0.67, -0.16]} castShadow><boxGeometry args={[1.02, 0.4, 0.11]} /><meshStandardMaterial color="#b98a61" {...material} /></mesh>
          {[-0.38, 0.38].map((x) => <mesh key={x} position={[x, 0.15, 0]}><boxGeometry args={[0.1, 0.34, 0.1]} /><meshStandardMaterial color="#80604a" {...material} /></mesh>)}
        </group>
      );
    case 'lamp':
      return (
        <group scale={selected ? 1.03 : 1}>
          <mesh position={[0, 0.58, 0]} castShadow><cylinderGeometry args={[0.05, 0.09, 1.16, 8]} /><meshStandardMaterial color="#60645f" {...material} /></mesh>
          <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.2, 12, 8]} /><meshStandardMaterial color="#ffe1a2" emissive="#ffd27b" emissiveIntensity={ghost ? 0.25 : 1.05} transparent={ghost} opacity={ghost ? 0.5 : 1} roughness={0.58} /></mesh>
          <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.16, 0.2, 0.12, 8]} /><meshStandardMaterial color="#76776e" {...material} /></mesh>
        </group>
      );
    case 'fence':
      return (
        <group scale={selected ? 1.02 : 1}>
          {[-0.48, 0.48].map((x) => <mesh key={x} position={[x, 0.43, 0]} castShadow><boxGeometry args={[0.14, 0.86, 0.14]} /><meshStandardMaterial color="#956b4d" {...material} /></mesh>)}
          {[0.28, 0.58].map((y) => <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[1.16, 0.12, 0.12]} /><meshStandardMaterial color="#b78860" {...material} /></mesh>)}
        </group>
      );
    case 'stone_path':
      return (
        <group scale={selected ? 1.02 : 1}>
          {[-0.34, 0, 0.34].map((x, index) => <mesh key={x} position={[x, 0.06, (index - 1) * 0.09]} rotation={[0, index * 0.28, 0]} receiveShadow><cylinderGeometry args={[0.3, 0.34, 0.12, 8]} /><meshStandardMaterial color={index === 1 ? '#bbb7ab' : '#aaa89f'} {...material} /></mesh>)}
        </group>
      );
    default:
      return null;
  }
}
