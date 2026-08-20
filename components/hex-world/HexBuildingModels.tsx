"use client";

import React from 'react';

export function HexBuildingModel({ buildingKey, ghost = false }: { buildingKey: string; ghost?: boolean }) {
  const material = { transparent: ghost, opacity: ghost ? 0.55 : 1, roughness: 0.88 };

  if (buildingKey === 'home') return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[1.7, 1.1, 1.45]} /><meshStandardMaterial color="#f2dfbd" {...material} /></mesh>
      <mesh position={[0, 1.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.35, 0.9, 4]} /><meshStandardMaterial color="#c96f5b" {...material} /></mesh>
      <mesh position={[0, 0.48, 0.74]}><boxGeometry args={[0.38, 0.72, 0.08]} /><meshStandardMaterial color="#8f6247" {...material} /></mesh>
    </group>
  );
  if (buildingKey === 'storage') return (
    <group><mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[1.25, 0.9, 1.05]} /><meshStandardMaterial color="#d7b781" {...material} /></mesh><mesh position={[0, 1, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1, 0.65, 4]} /><meshStandardMaterial color="#9a6d51" {...material} /></mesh></group>
  );
  if (buildingKey === 'workshop') return (
    <group><mesh position={[0, 0.52, 0]} castShadow><boxGeometry args={[1.55, 1.05, 1.25]} /><meshStandardMaterial color="#e3cfa7" {...material} /></mesh><mesh position={[0, 1.25, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.2, 0.72, 4]} /><meshStandardMaterial color="#6f8e7d" {...material} /></mesh><mesh position={[0.5, 1.45, -0.25]}><boxGeometry args={[0.2, 0.75, 0.2]} /><meshStandardMaterial color="#8f6247" {...material} /></mesh></group>
  );
  if (buildingKey === 'tree') return (
    <group><mesh position={[0, 0.48, 0]} castShadow><cylinderGeometry args={[0.13, 0.2, 0.95, 7]} /><meshStandardMaterial color="#8b6548" {...material} /></mesh>{[[-0.25, 1.15, 0], [0.25, 1.2, 0.05], [0, 1.45, -0.1]].map((p, i) => <mesh key={i} position={p as [number, number, number]} castShadow><dodecahedronGeometry args={[0.55, 0]} /><meshStandardMaterial color={i === 2 ? '#76985e' : '#88a96c'} {...material} /></mesh>)}</group>
  );
  if (buildingKey === 'flower_patch') return (
    <group>{[[-0.25, 0, -0.15], [0.22, 0, -0.12], [0, 0, 0.25]].map((p, i) => <group key={i} position={p as [number, number, number]}><mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.025, 0.035, 0.4, 5]} /><meshStandardMaterial color="#658653" {...material} /></mesh><mesh position={[0, 0.43, 0]}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color={['#e8a1ad', '#f2c178', '#b9a1d8'][i]} {...material} /></mesh></group>)}</group>
  );
  if (buildingKey === 'pond') return <mesh position={[0, 0.08, 0]} scale={[1.35, 0.12, 1]}><cylinderGeometry args={[0.72, 0.8, 0.35, 16]} /><meshStandardMaterial color="#6dc7c5" metalness={0.05} roughness={0.35} transparent opacity={ghost ? 0.45 : 0.78} /></mesh>;
  if (buildingKey === 'bench') return <group><mesh position={[0, 0.34, 0]}><boxGeometry args={[0.95, 0.14, 0.32]} /><meshStandardMaterial color="#a87952" {...material} /></mesh><mesh position={[0, 0.65, -0.15]}><boxGeometry args={[0.95, 0.4, 0.11]} /><meshStandardMaterial color="#b98b63" {...material} /></mesh></group>;
  if (buildingKey === 'lamp') return <group><mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.05, 0.08, 1.1, 8]} /><meshStandardMaterial color="#5d625f" {...material} /></mesh><mesh position={[0, 1.18, 0]}><sphereGeometry args={[0.19, 10, 8]} /><meshStandardMaterial color="#ffe0a0" emissive="#ffd687" emissiveIntensity={ghost ? 0.3 : 1} transparent={ghost} opacity={ghost ? 0.55 : 1} /></mesh></group>;
  if (buildingKey === 'fence') return <group><mesh position={[0, 0.35, 0]}><boxGeometry args={[1.2, 0.12, 0.12]} /><meshStandardMaterial color="#b98960" {...material} /></mesh>{[-0.5, 0.5].map((x) => <mesh key={x} position={[x, 0.42, 0]}><boxGeometry args={[0.13, 0.85, 0.13]} /><meshStandardMaterial color="#9a6f50" {...material} /></mesh>)}</group>;
  if (buildingKey === 'stone_path') return <group>{[-0.28, 0, 0.28].map((x, i) => <mesh key={i} position={[x, 0.06, (i - 1) * 0.07]} rotation={[0, i * 0.35, 0]}><cylinderGeometry args={[0.3, 0.32, 0.12, 7]} /><meshStandardMaterial color="#aaa89f" {...material} /></mesh>)}</group>;
  if (buildingKey === 'garden_patch') return <group><mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.78, 0.8, 0.16, 6]} /><meshStandardMaterial color="#9f7457" {...material} /></mesh>{[-0.28, 0, 0.28].map((x) => <mesh key={x} position={[x, 0.17, 0]}><boxGeometry args={[0.08, 0.05, 1.1]} /><meshStandardMaterial color="#7d5d49" {...material} /></mesh>)}</group>;
  return null;
}
