"use client";

import React from 'react';
import type { BuildingTier } from '@/lib/building-progression';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean; tier?: BuildingTier };
type TierKind = 'home' | 'barn' | 'storage' | 'workshop';

type MaterialProps = {
  transparent: boolean;
  opacity: number;
  roughness: number;
};

function materialProps(ghost = false, roughness = 0.88): MaterialProps {
  return { transparent: ghost, opacity: ghost ? 0.48 : 1, roughness };
}

function StoneFoundation({ width, depth, ghost }: { width: number; depth: number; ghost?: boolean }) {
  const material = materialProps(ghost, 1);
  return (
    <group>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[width, 0.16, depth]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.structures.stoneBase} {...material} />
      </mesh>
      {[-0.75, -0.25, 0.25, 0.75].map((ratio, index) => (
        <mesh key={`stone-front-${ratio}`} position={[ratio * width * 0.46, 0.11 + (index % 2) * 0.018, depth * 0.51]} scale={[0.9 + (index % 2) * 0.14, 0.7, 0.65]}>
          <icosahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color={index % 2 ? HEX_VISUAL_THEME.terrain.stone.base : HEX_VISUAL_THEME.terrain.stone.dark} {...material} />
        </mesh>
      ))}
    </group>
  );
}

function WallPanel({
  position,
  size,
  color,
  ghost,
  siding = false,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  ghost?: boolean;
  siding?: boolean;
}) {
  const material = materialProps(ghost, 0.94);
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} {...material} />
      </mesh>
      {siding && [-0.34, -0.12, 0.1, 0.32].map((offset) => (
        <mesh key={offset} position={[0, offset * size[1], size[2] / 2 + 0.012]}>
          <boxGeometry args={[size[0] * 0.96, 0.025, 0.025]} />
          <meshStandardMaterial color={HEX_VISUAL_THEME.structures.trim} {...materialProps(ghost, 0.98)} />
        </mesh>
      ))}
    </group>
  );
}

function TimberBeam({
  position,
  size,
  rotation = [0, 0, 0],
  ghost,
  dark = false,
}: {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  ghost?: boolean;
  dark?: boolean;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={dark ? HEX_VISUAL_THEME.structures.darkWood : HEX_VISUAL_THEME.structures.wood} {...materialProps(ghost, 0.96)} />
    </mesh>
  );
}

function PitchedRoof({
  width,
  depth,
  y,
  color,
  ghost,
  slope = 0.52,
}: {
  width: number;
  depth: number;
  y: number;
  color: string;
  ghost?: boolean;
  slope?: number;
}) {
  const panelWidth = width * 0.6;
  const xOffset = width * 0.235;
  const roofMaterial = materialProps(ghost, 0.92);
  return (
    <group position={[0, y, 0]}>
      <mesh position={[-xOffset, 0, 0]} rotation={[0, 0, slope]} castShadow>
        <boxGeometry args={[panelWidth, 0.1, depth * 1.12]} />
        <meshStandardMaterial color={color} {...roofMaterial} />
      </mesh>
      <mesh position={[xOffset, 0, 0]} rotation={[0, 0, -slope]} castShadow>
        <boxGeometry args={[panelWidth, 0.1, depth * 1.12]} />
        <meshStandardMaterial color={color} {...roofMaterial} />
      </mesh>
      <TimberBeam position={[0, 0.18, 0]} size={[0.09, 0.1, depth * 1.14]} ghost={ghost} dark />
      <TimberBeam position={[-width * 0.51, -0.13, 0]} size={[0.08, 0.09, depth * 1.14]} ghost={ghost} />
      <TimberBeam position={[width * 0.51, -0.13, 0]} size={[0.08, 0.09, depth * 1.14]} ghost={ghost} />
    </group>
  );
}

function NaturalWindow({ position, ghost, width = 0.38, height = 0.4 }: { position: [number, number, number]; ghost?: boolean; width?: number; height?: number }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width + 0.1, height + 0.1, 0.065]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...materialProps(ghost, 0.96)} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[width, height, 0.035]} />
        <meshStandardMaterial
          color={HEX_VISUAL_THEME.structures.glass}
          emissive={HEX_VISUAL_THEME.structures.windowGlow}
          emissiveIntensity={ghost ? 0.04 : 0.1}
          metalness={0}
          roughness={0.2}
          transparent
          opacity={ghost ? 0.32 : 0.72}
        />
      </mesh>
      <TimberBeam position={[0, 0, 0.075]} size={[0.025, height, 0.02]} ghost={ghost} dark />
      <TimberBeam position={[0, 0, 0.078]} size={[width, 0.025, 0.02]} ghost={ghost} dark />
    </group>
  );
}

function Door({ position, width, height, ghost, double = false }: { position: [number, number, number]; width: number; height: number; ghost?: boolean; double?: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width, height, 0.075]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} {...materialProps(ghost, 0.96)} />
      </mesh>
      {double && <TimberBeam position={[0, 0, 0.055]} size={[0.045, height * 0.96, 0.025]} ghost={ghost} />}
      <TimberBeam position={[-width / 2 - 0.055, 0, 0]} size={[0.08, height + 0.1, 0.09]} ghost={ghost} />
      <TimberBeam position={[width / 2 + 0.055, 0, 0]} size={[0.08, height + 0.1, 0.09]} ghost={ghost} />
      <TimberBeam position={[0, height / 2 + 0.045, 0]} size={[width + 0.18, 0.08, 0.09]} ghost={ghost} />
      {!double && <mesh position={[width * 0.34, 0, 0.06]}><sphereGeometry args={[0.035, 8, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.35} roughness={0.55} /></mesh>}
    </group>
  );
}

function Porch({ width, depth, ghost }: { width: number; depth: number; ghost?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.22, depth * 0.58]} receiveShadow>
        <boxGeometry args={[width, 0.12, 0.62]} />
        <meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...materialProps(ghost, 0.98)} />
      </mesh>
      <TimberBeam position={[-width * 0.42, 0.48, depth * 0.72]} size={[0.08, 0.62, 0.08]} ghost={ghost} />
      <TimberBeam position={[width * 0.42, 0.48, depth * 0.72]} size={[0.08, 0.62, 0.08]} ghost={ghost} />
    </group>
  );
}

function StructureTierDetails({ tier, kind, ghost }: { tier: BuildingTier; kind: TierKind; ghost: boolean }) {
  const accent = kind === 'barn' ? HEX_VISUAL_THEME.structures.warmCream : kind === 'workshop' ? HEX_VISUAL_THEME.vegetation.leafLight : kind === 'storage' ? '#9a7557' : '#9d6d60';
  return (
    <group>
      {tier >= 2 && (
        <>
          <mesh position={[-0.76, 0.22, 1.06]} castShadow><boxGeometry args={[0.44, 0.2, 0.3]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...materialProps(ghost, 0.96)} /></mesh>
          <mesh position={[-0.76, 0.37, 1.06]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color={accent} {...materialProps(ghost, 0.92)} /></mesh>
          <mesh position={[0.76, 0.22, 1.06]} castShadow><boxGeometry args={[0.44, 0.2, 0.3]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} {...materialProps(ghost, 0.96)} /></mesh>
          <mesh position={[0.76, 0.37, 1.06]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color={accent} {...materialProps(ghost, 0.92)} /></mesh>
        </>
      )}
      {tier >= 3 && (
        <group position={[0, 1.95, -0.36]}>
          <TimberBeam position={[0, 0, 0]} size={[0.055, 0.72, 0.055]} ghost={ghost} dark />
          <mesh position={[0.14, 0.2, 0]} rotation={[0, 0, 0.18]}>
            <boxGeometry args={[0.3, 0.16, 0.035]} />
            <meshStandardMaterial color={accent} {...materialProps(ghost, 0.9)} />
          </mesh>
          <mesh position={[0, -0.28, 0.02]}><sphereGeometry args={[0.065, 8, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.28} roughness={0.58} /></mesh>
        </group>
      )}
    </group>
  );
}

function Crates({ ghost }: { ghost: boolean }) {
  return (
    <group position={[-0.98, 0.27, -0.46]} rotation={[0, 0.18, 0]}>
      <mesh castShadow><boxGeometry args={[0.4, 0.4, 0.4]} /><meshStandardMaterial color="#8a6349" {...materialProps(ghost, 0.96)} /></mesh>
      <mesh position={[0.27, -0.06, 0.12]} castShadow><boxGeometry args={[0.3, 0.28, 0.3]} /><meshStandardMaterial color="#9a7252" {...materialProps(ghost, 0.96)} /></mesh>
    </group>
  );
}

export function HexStructureModel({ buildingKey, ghost = false, tier = 1 }: Props) {
  switch (buildingKey) {
    case 'home':
      return (
        <group>
          <StoneFoundation width={2.38} depth={1.96} ghost={ghost} />
          <WallPanel position={[0, 0.66, 0]} size={[2.14, 1.12, 1.7]} color={HEX_VISUAL_THEME.structures.cream} ghost={ghost} siding />
          <TimberBeam position={[-1.02, 0.68, 0.88]} size={[0.09, 1.12, 0.09]} ghost={ghost} />
          <TimberBeam position={[1.02, 0.68, 0.88]} size={[0.09, 1.12, 0.09]} ghost={ghost} />
          <PitchedRoof width={2.28} depth={1.84} y={1.48} color={HEX_VISUAL_THEME.structures.roof} ghost={ghost} slope={0.5} />
          <Porch width={1.38} depth={1.78} ghost={ghost} />
          <Door position={[0, 0.65, 0.9]} width={0.48} height={0.82} ghost={ghost} />
          <NaturalWindow position={[-0.7, 0.76, 0.89]} ghost={ghost} />
          <NaturalWindow position={[0.7, 0.76, 0.89]} ghost={ghost} />
          <mesh position={[0.7, 1.74, -0.32]} castShadow><boxGeometry args={[0.28, 0.82, 0.28]} /><meshStandardMaterial color={HEX_VISUAL_THEME.terrain.cliffRock} {...materialProps(ghost, 0.98)} /></mesh>
          <StructureTierDetails tier={tier} kind="home" ghost={ghost} />
        </group>
      );
    case 'barn':
      return (
        <group>
          <StoneFoundation width={2.58} depth={2.0} ghost={ghost} />
          <WallPanel position={[0, 0.7, 0]} size={[2.36, 1.2, 1.78]} color={HEX_VISUAL_THEME.structures.barn} ghost={ghost} siding />
          {[-0.82, 0, 0.82].map((x) => <TimberBeam key={x} position={[x, 0.7, 0.91]} size={[0.08, 1.18, 0.08]} ghost={ghost} dark />)}
          <PitchedRoof width={2.54} depth={1.94} y={1.6} color={HEX_VISUAL_THEME.structures.darkWood} ghost={ghost} slope={0.55} />
          <Door position={[0, 0.7, 0.92]} width={0.98} height={1.08} ghost={ghost} double />
          <NaturalWindow position={[-0.78, 0.82, 0.92]} width={0.3} height={0.34} ghost={ghost} />
          <NaturalWindow position={[0.78, 0.82, 0.92]} width={0.3} height={0.34} ghost={ghost} />
          <mesh position={[1.12, 0.24, 0.12]} castShadow><cylinderGeometry args={[0.31, 0.35, 0.4, 14]} /><meshStandardMaterial color="#9f895b" {...materialProps(ghost, 0.98)} /></mesh>
          <StructureTierDetails tier={tier} kind="barn" ghost={ghost} />
        </group>
      );
    case 'storage':
      return (
        <group>
          <StoneFoundation width={1.92} depth={1.5} ghost={ghost} />
          <WallPanel position={[0, 0.56, 0]} size={[1.7, 0.94, 1.3]} color={HEX_VISUAL_THEME.structures.warmCream} ghost={ghost} siding />
          <PitchedRoof width={1.84} depth={1.43} y={1.26} color={HEX_VISUAL_THEME.structures.roof} ghost={ghost} slope={0.47} />
          <Door position={[0, 0.56, 0.67]} width={0.64} height={0.84} ghost={ghost} />
          <TimberBeam position={[-0.76, 0.57, 0.68]} size={[0.07, 0.92, 0.07]} ghost={ghost} />
          <TimberBeam position={[0.76, 0.57, 0.68]} size={[0.07, 0.92, 0.07]} ghost={ghost} />
          <Crates ghost={ghost} />
          <StructureTierDetails tier={tier} kind="storage" ghost={ghost} />
        </group>
      );
    case 'workshop':
      return (
        <group>
          <StoneFoundation width={2.42} depth={1.78} ghost={ghost} />
          <WallPanel position={[0, 0.62, 0]} size={[2.2, 1.04, 1.55]} color={HEX_VISUAL_THEME.structures.cream} ghost={ghost} siding />
          <PitchedRoof width={2.34} depth={1.7} y={1.43} color={HEX_VISUAL_THEME.structures.workshopRoof} ghost={ghost} slope={0.48} />
          <Door position={[-0.55, 0.63, 0.8]} width={0.72} height={0.76} ghost={ghost} />
          <NaturalWindow position={[0.58, 0.76, 0.8]} width={0.48} height={0.4} ghost={ghost} />
          <mesh position={[0.8, 1.68, -0.25]} castShadow><boxGeometry args={[0.25, 0.86, 0.25]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.08} {...materialProps(ghost, 0.86)} /></mesh>
          <TimberBeam position={[-1.02, 0.62, 0.8]} size={[0.08, 1.0, 0.08]} ghost={ghost} dark />
          <TimberBeam position={[1.02, 0.62, 0.8]} size={[0.08, 1.0, 0.08]} ghost={ghost} dark />
          <group position={[-1.16, 0.34, -0.34]} rotation={[0, 0.24, 0]}>
            <mesh><boxGeometry args={[0.18, 0.78, 0.18]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.18} {...materialProps(ghost, 0.72)} /></mesh>
            <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.13, 0.18, 0.16, 10]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.2} {...materialProps(ghost, 0.68)} /></mesh>
          </group>
          <StructureTierDetails tier={tier} kind="workshop" ghost={ghost} />
        </group>
      );
    default:
      return null;
  }
}
