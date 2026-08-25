"use client";

import React from 'react';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import { hexRotationToRadians } from '@/lib/hex-world/rendering';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

const SUPPORTED = new Set(['home', 'barn', 'storage', 'workshop']);

function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.34, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 0.68, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} roughness={0.95} /></mesh>
      <mesh position={[0, 0.68, 0]} castShadow><boxGeometry args={[0.18, 0.22, 0.18]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.trim} roughness={0.75} /></mesh>
      <mesh position={[0, 0.68, 0.01]} scale={0.72}><sphereGeometry args={[0.1, 7, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.explore.props.lantern} emissive={HEX_VISUAL_THEME.structures.windowGlow} emissiveIntensity={0.85} roughness={0.55} /></mesh>
    </group>
  );
}

function Planter({ position, accent = 0 }: { position: [number, number, number]; accent?: number }) {
  const flower = HEX_VISUAL_THEME.vegetation.flower[accent % HEX_VISUAL_THEME.vegetation.flower.length];
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]} castShadow><boxGeometry args={[0.46, 0.18, 0.22]} /><meshStandardMaterial color={HEX_VISUAL_THEME.explore.props.planter} roughness={0.95} /></mesh>
      {[-0.13, 0, 0.13].map((x, index) => <mesh key={x} position={[x, 0.28 + (index % 2) * 0.03, 0]} castShadow><sphereGeometry args={[0.085, 6, 4]} /><meshStandardMaterial color={index === 1 ? HEX_VISUAL_THEME.vegetation.leafLight : flower} roughness={0.9} /></mesh>)}
    </group>
  );
}

function Barrel({ position }: { position: [number, number, number] }) {
  return <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.18, 0.21, 0.42, 10]} /><meshStandardMaterial color={HEX_VISUAL_THEME.explore.props.barrel} roughness={0.96} /></mesh>;
}

function FenceRun({ position, mirror = false }: { position: [number, number, number]; mirror?: boolean }) {
  const direction = mirror ? -1 : 1;
  return (
    <group position={position} scale={[direction, 1, 1]}>
      {[0, 0.82].map((x) => <mesh key={x} position={[x, 0.34, 0]} castShadow><boxGeometry args={[0.09, 0.7, 0.09]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} roughness={0.98} /></mesh>)}
      {[0.25, 0.5].map((y) => <mesh key={y} position={[0.41, y, 0]} castShadow><boxGeometry args={[0.86, 0.08, 0.075]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} roughness={0.98} /></mesh>)}
    </group>
  );
}

function Signpost({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -0.18, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.08, 0.84, 0.08]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.darkWood} roughness={0.98} /></mesh>
      <mesh position={[0.12, 0.72, 0]} castShadow><boxGeometry args={[0.48, 0.2, 0.075]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} roughness={0.95} /></mesh>
      <mesh position={[-0.02, 0.72, 0.042]}><sphereGeometry args={[0.025, 6, 4]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.7} roughness={0.42} /></mesh>
    </group>
  );
}

function Woodpile({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -0.12, 0]}>
      {[
        [-0.2, 0.09, 0], [0.03, 0.09, 0.01], [0.25, 0.09, -0.02],
        [-0.1, 0.22, 0.02], [0.14, 0.22, -0.01],
      ].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.075, 0.09, 0.42, 8]} />
          <meshStandardMaterial color={index % 2 ? HEX_VISUAL_THEME.structures.darkWood : HEX_VISUAL_THEME.structures.wood} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function EntranceDetails({ kind, detail }: { kind: string; detail: number }) {
  const wider = kind === 'barn' || kind === 'workshop';
  const porchWidth = wider ? 1.25 : 0.95;
  return (
    <group>
      <mesh position={[0, 0.08, 1.08]} receiveShadow castShadow><boxGeometry args={[porchWidth, 0.16, 0.5]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} roughness={0.94} /></mesh>
      <mesh position={[0, -0.015, 1.43]} receiveShadow><boxGeometry args={[porchWidth * 0.82, 0.11, 0.28]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.stoneBase} roughness={1} /></mesh>
      <Lantern position={[-porchWidth * 0.62, 0.02, 1.19]} />
      <Lantern position={[porchWidth * 0.62, 0.02, 1.19]} />
      {detail >= 0.7 && <Planter position={[-porchWidth * 0.48, 0.12, 0.92]} accent={kind.length} />}
      {detail >= 0.7 && <Planter position={[porchWidth * 0.48, 0.12, 0.92]} accent={kind.length + 1} />}
      {detail >= 0.7 && <FenceRun position={[-porchWidth * 0.86, 0, 1.7]} mirror />}
      {detail >= 0.7 && <FenceRun position={[porchWidth * 0.86, 0, 1.7]} />}
      {detail >= 0.7 && <Signpost position={[porchWidth * 1.12, 0, 1.5]} />}
      {detail >= 0.95 && <Barrel position={[-porchWidth * 0.78, 0.19, 0.72]} />}
      {detail >= 0.95 && <Woodpile position={[-porchWidth * 1.03, 0.02, 0.45]} />}
      {detail >= 0.95 && <group position={[porchWidth * 0.76, 0.18, 0.72]} rotation={[0, -0.15, 0]}><mesh castShadow><boxGeometry args={[0.35, 0.34, 0.35]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.wood} roughness={0.97} /></mesh><mesh position={[0, 0.04, 0.181]}><boxGeometry args={[0.27, 0.035, 0.02]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.trim} roughness={0.8} /></mesh></group>}
    </group>
  );
}

export function HexExploreStructureDetails({
  buildings,
  tiles,
  profile,
}: {
  buildings: HexBuildingDTO[];
  tiles: HexTileDTO[];
  profile: HexQualityProfile;
}) {
  const heightByTile = new Map(tiles.map((tile) => [hexKey(tile), tile.height]));
  return (
    <group name="explore-structure-details">
      {buildings.filter((building) => SUPPORTED.has(building.buildingKey)).map((building) => {
        const height = heightByTile.get(`${building.anchorQ}:${building.anchorR}`) ?? 0;
        const world = axialToWorld({ q: building.anchorQ, r: building.anchorR }, 1, height + 0.035);
        return (
          <group key={`explore-detail-${building.id}`} position={[world.x, world.y, world.z]} rotation={[0, hexRotationToRadians(building.rotation), 0]} raycast={() => {}}>
            <EntranceDetails kind={building.buildingKey} detail={profile.exploreStructureDetail} />
          </group>
        );
      })}
    </group>
  );
}
