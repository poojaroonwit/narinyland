"use client";

import React from 'react';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean };

function materialProps(ghost = false) {
  return { transparent: ghost, opacity: ghost ? 0.5 : 1, roughness: 0.85 } as const;
}

export function HexNatureModel({ buildingKey, ghost = false, selected = false }: Props) {
  const material = materialProps(ghost);
  switch (buildingKey) {
    case 'tree':
      return (
        <group scale={selected ? 1.03 : 1}>
          <mesh position={[0, 0.52, 0]} castShadow><cylinderGeometry args={[0.14, 0.23, 1.04, 7]} /><meshStandardMaterial color="#7d5d43" {...material} roughness={0.92} /></mesh>
          <mesh position={[-0.28, 1.18, 0.05]} castShadow><dodecahedronGeometry args={[0.58, 0]} /><meshStandardMaterial color="#7b9d66" {...material} /></mesh>
          <mesh position={[0.28, 1.22, 0.02]} castShadow><dodecahedronGeometry args={[0.55, 0]} /><meshStandardMaterial color="#89aa70" {...material} /></mesh>
          <mesh position={[0.02, 1.53, -0.08]} castShadow><dodecahedronGeometry args={[0.62, 0]} /><meshStandardMaterial color="#6e925c" {...material} /></mesh>
        </group>
      );
    case 'flower_patch':
      return (
        <group scale={selected ? 1.03 : 1}>
          {[[-0.34, -0.2], [0.28, -0.2], [-0.12, 0.2], [0.35, 0.22]].map(([x, z], index) => (
            <group key={`${x}:${z}`} position={[x, 0, z]}>
              <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.025, 0.035, 0.4, 5]} /><meshStandardMaterial color="#648650" {...material} /></mesh>
              <mesh position={[0, 0.44, 0]}><dodecahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color={['#df8da0', '#efbd76', '#b49bd1', '#efd29e'][index]} {...material} roughness={0.78} /></mesh>
            </group>
          ))}
        </group>
      );
    case 'pond':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.03, 0]} scale={[1.45, 0.12, 1.08]} receiveShadow><cylinderGeometry args={[0.78, 0.84, 0.28, 18]} /><meshStandardMaterial color="#8daea4" roughness={0.96} transparent={ghost} opacity={ghost ? 0.45 : 1} /></mesh>
          <mesh position={[0, 0.12, 0]} scale={[1.34, 0.06, 0.96]}><cylinderGeometry args={[0.72, 0.76, 0.14, 20]} /><meshStandardMaterial color="#69c3c0" metalness={0.01} roughness={0.5} transparent opacity={ghost ? 0.4 : 0.78} /></mesh>
          {[[-0.95, 0.45], [0.9, -0.3], [0.62, 0.58]].map(([x, z], index) => <mesh key={index} position={[x, 0.18, z]} rotation={[0.2, index * 0.8, 0.1]}><dodecahedronGeometry args={[0.2 + index * 0.035, 0]} /><meshStandardMaterial color="#aaa89d" {...material} /></mesh>)}
          {[[-0.72, -0.35], [0.72, 0.36]].map(([x, z], index) => <group key={index} position={[x, 0.15, z]}>{[-0.08, 0.08].map((offset) => <mesh key={offset} position={[offset, 0.22, 0]} rotation={[0, 0, offset * 2]}><cylinderGeometry args={[0.025, 0.035, 0.44, 5]} /><meshStandardMaterial color="#638251" {...material} /></mesh>)}</group>)}
        </group>
      );
    case 'garden_patch':
      return (
        <group scale={selected ? 1.02 : 1}>
          <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.8, 0.84, 0.16, 6]} /><meshStandardMaterial color="#9c7354" {...material} roughness={0.94} /></mesh>
          {[-0.3, 0, 0.3].map((x) => <mesh key={x} position={[x, 0.2, 0]}><boxGeometry args={[0.07, 0.05, 1.12]} /><meshStandardMaterial color="#765740" {...material} /></mesh>)}
          {[-0.42, 0, 0.42].flatMap((x) => [-0.3, 0.3].map((z) => <mesh key={`${x}:${z}`} position={[x, 0.36, z]}><coneGeometry args={[0.11, 0.35, 5]} /><meshStandardMaterial color="#6e955b" {...material} /></mesh>))}
        </group>
      );
    default:
      return null;
  }
}
