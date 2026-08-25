"use client";

import React, { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { BuildingTier } from '@/lib/building-progression';
import { getPBRTextureSet } from '@/lib/hex-world/pbr/quality-assets';
import { configurePBRTextureBundle, type HexPBRTextureBundle } from '@/lib/hex-world/pbr/terrain-materials';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

type Props = { buildingKey: string; ghost?: boolean; selected?: boolean; tier?: BuildingTier };
type TierKind = 'home' | 'barn' | 'storage' | 'workshop';

const WOOD_SET = getPBRTextureSet('wood', 'medium');
const PLASTER_SET = getPBRTextureSet('plaster', 'medium');
const ROOF_SET = getPBRTextureSet('roof', 'medium');
const STONE_SET = getPBRTextureSet('cliff', 'medium');
const NORMAL_SCALE = new THREE.Vector2(0.34, 0.34);

type TextureSet = typeof WOOD_SET;

function useBuildingTextureBundle(paths: TextureSet, repeat: [number, number]): HexPBRTextureBundle {
  const loaded = useTexture([paths.baseColor, paths.normal, paths.roughness]) as THREE.Texture[];
  const bundle = useMemo(() => configurePBRTextureBundle({
    baseColor: loaded[0].clone(),
    normal: loaded[1].clone(),
    roughness: loaded[2].clone(),
  }, repeat, 4), [loaded, repeat]);

  useEffect(() => () => {
    bundle.baseColor.dispose();
    bundle.normal.dispose();
    bundle.roughness.dispose();
  }, [bundle]);

  return bundle;
}

type Materials = {
  wood: HexPBRTextureBundle;
  plaster: HexPBRTextureBundle;
  roof: HexPBRTextureBundle;
  stone: HexPBRTextureBundle;
};

function TexturedMaterial({ bundle, ghost, roughness = 0.94, tint = '#ffffff' }: { bundle: HexPBRTextureBundle; ghost: boolean; roughness?: number; tint?: string }) {
  return <meshStandardMaterial
    color={ghost ? '#dce9df' : tint}
    map={bundle.baseColor}
    normalMap={bundle.normal}
    normalScale={NORMAL_SCALE}
    roughnessMap={bundle.roughness}
    roughness={roughness}
    metalness={0}
    transparent={ghost}
    opacity={ghost ? 0.5 : 1}
    depthWrite={!ghost}
  />;
}

function StoneFoundation({ width, depth, ghost, materials }: { width: number; depth: number; ghost: boolean; materials: Materials }) {
  return <mesh position={[0, 0.09, 0]} receiveShadow castShadow>
    <boxGeometry args={[width, 0.18, depth]} />
    <TexturedMaterial bundle={materials.stone} ghost={ghost} roughness={1} />
  </mesh>;
}

function WallPanel({ position, size, surface, ghost, materials }: {
  position: [number, number, number]; size: [number, number, number]; surface: 'wood' | 'plaster'; ghost: boolean; materials: Materials;
}) {
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={size} />
    <TexturedMaterial bundle={materials[surface]} ghost={ghost} roughness={surface === 'wood' ? 0.96 : 0.92} />
  </mesh>;
}

function TimberBeam({ position, size, rotation = [0, 0, 0], ghost, materials }: {
  position: [number, number, number]; size: [number, number, number]; rotation?: [number, number, number]; ghost: boolean; materials: Materials;
}) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size} />
    <TexturedMaterial bundle={materials.wood} ghost={ghost} roughness={0.97} tint="#7b5a43" />
  </mesh>;
}

function GablePanel({ width, height, position, rotationY = 0, surface, ghost, materials }: {
  width: number; height: number; position: [number, number, number]; rotationY?: number; surface: 'wood' | 'plaster'; ghost: boolean; materials: Materials;
}) {
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute([
      -width / 2, 0, 0,
      width / 2, 0, 0,
      0, height, 0,
    ], 3));
    next.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    next.setIndex([0, 1, 2]);
    next.computeVertexNormals();
    return next;
  }, [height, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} position={position} rotation={[0, rotationY, 0]} castShadow>
    <TexturedMaterial bundle={materials[surface]} ghost={ghost} roughness={surface === 'wood' ? 0.96 : 0.92} />
  </mesh>;
}

function PitchedRoof({ width, depth, y, ghost, materials, slope = 0.52 }: {
  width: number; depth: number; y: number; ghost: boolean; materials: Materials; slope?: number;
}) {
  const panelWidth = width * 0.62;
  const xOffset = width * 0.235;
  return <group position={[0, y, 0]}>
    <mesh position={[-xOffset, 0, 0]} rotation={[0, 0, slope]} castShadow receiveShadow>
      <boxGeometry args={[panelWidth, 0.1, depth * 1.12]} />
      <TexturedMaterial bundle={materials.roof} ghost={ghost} roughness={0.94} />
    </mesh>
    <mesh position={[xOffset, 0, 0]} rotation={[0, 0, -slope]} castShadow receiveShadow>
      <boxGeometry args={[panelWidth, 0.1, depth * 1.12]} />
      <TexturedMaterial bundle={materials.roof} ghost={ghost} roughness={0.94} />
    </mesh>
    <TimberBeam position={[0, 0.18, 0]} size={[0.09, 0.1, depth * 1.14]} ghost={ghost} materials={materials} />
  </group>;
}

function NaturalWindow({ position, ghost, materials, width = 0.38, height = 0.4 }: {
  position: [number, number, number]; ghost: boolean; materials: Materials; width?: number; height?: number;
}) {
  return <group position={position}>
    <mesh castShadow>
      <boxGeometry args={[width + 0.1, height + 0.1, 0.065]} />
      <TexturedMaterial bundle={materials.wood} ghost={ghost} roughness={0.96} />
    </mesh>
    <mesh position={[0, 0, 0.048]}>
      <boxGeometry args={[width, height, 0.035]} />
      <meshPhysicalMaterial
        color={HEX_VISUAL_THEME.structures.glass}
        emissive={HEX_VISUAL_THEME.structures.windowGlow}
        emissiveIntensity={ghost ? 0.03 : 0.08}
        metalness={0}
        roughness={0.12}
        transmission={ghost ? 0.05 : 0.24}
        ior={1.45}
        transparent
        opacity={ghost ? 0.3 : 0.68}
        depthWrite={false}
      />
    </mesh>
    <TimberBeam position={[0, 0, 0.075]} size={[0.024, height, 0.02]} ghost={ghost} materials={materials} />
    <TimberBeam position={[0, 0, 0.078]} size={[width, 0.024, 0.02]} ghost={ghost} materials={materials} />
  </group>;
}

function Door({ position, width, height, ghost, materials, double = false }: {
  position: [number, number, number]; width: number; height: number; ghost: boolean; materials: Materials; double?: boolean;
}) {
  return <group position={position}>
    <mesh castShadow>
      <boxGeometry args={[width, height, 0.075]} />
      <TexturedMaterial bundle={materials.wood} ghost={ghost} roughness={0.97} tint="#74513c" />
    </mesh>
    {double && <TimberBeam position={[0, 0, 0.055]} size={[0.045, height * 0.96, 0.025]} ghost={ghost} materials={materials} />}
    <TimberBeam position={[-width / 2 - 0.055, 0, 0]} size={[0.08, height + 0.1, 0.09]} ghost={ghost} materials={materials} />
    <TimberBeam position={[width / 2 + 0.055, 0, 0]} size={[0.08, height + 0.1, 0.09]} ghost={ghost} materials={materials} />
    <TimberBeam position={[0, height / 2 + 0.045, 0]} size={[width + 0.18, 0.08, 0.09]} ghost={ghost} materials={materials} />
    {!double && <mesh position={[width * 0.34, 0, 0.06]}>
      <sphereGeometry args={[0.035, 8, 6]} />
      <meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.58} roughness={0.38} />
    </mesh>}
  </group>;
}

function Porch({ width, depth, ghost, materials }: { width: number; depth: number; ghost: boolean; materials: Materials }) {
  return <group>
    <mesh position={[0, 0.22, depth * 0.58]} receiveShadow castShadow>
      <boxGeometry args={[width, 0.12, 0.62]} />
      <TexturedMaterial bundle={materials.wood} ghost={ghost} roughness={0.98} />
    </mesh>
    <TimberBeam position={[-width * 0.42, 0.48, depth * 0.72]} size={[0.08, 0.62, 0.08]} ghost={ghost} materials={materials} />
    <TimberBeam position={[width * 0.42, 0.48, depth * 0.72]} size={[0.08, 0.62, 0.08]} ghost={ghost} materials={materials} />
  </group>;
}

function StoneChimney({ position, ghost, materials }: { position: [number, number, number]; ghost: boolean; materials: Materials }) {
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={[0.28, 0.82, 0.28]} />
    <TexturedMaterial bundle={materials.stone} ghost={ghost} roughness={0.99} />
  </mesh>;
}

function MetalVent({ position, ghost }: { position: [number, number, number]; ghost: boolean }) {
  return <group position={position}>
    <mesh castShadow>
      <boxGeometry args={[0.2, 0.76, 0.2]} />
      <meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.62} roughness={0.38} transparent={ghost} opacity={ghost ? 0.45 : 1} />
    </mesh>
    <mesh position={[0, 0.42, 0]}>
      <cylinderGeometry args={[0.14, 0.18, 0.16, 10]} />
      <meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.68} roughness={0.34} transparent={ghost} opacity={ghost ? 0.45 : 1} />
    </mesh>
  </group>;
}

function StructureTierDetails({ tier, kind, ghost, materials }: { tier: BuildingTier; kind: TierKind; ghost: boolean; materials: Materials }) {
  const accent = kind === 'barn' ? '#b68d58' : kind === 'workshop' ? '#6e8060' : kind === 'storage' ? '#8d684c' : '#8b6254';
  return <group>
    {tier >= 2 && <>
      {[-0.76, 0.76].map((x) => <group key={x} position={[x, 0.25, 1.06]}>
        <mesh castShadow><boxGeometry args={[0.44, 0.2, 0.3]} /><TexturedMaterial bundle={materials.wood} ghost={ghost} roughness={0.97} /></mesh>
        <mesh position={[0, 0.15, 0]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color={accent} roughness={0.9} transparent={ghost} opacity={ghost ? 0.45 : 1} /></mesh>
      </group>)}
    </>}
    {tier >= 3 && <group position={[0, 1.95, -0.36]}>
      <TimberBeam position={[0, 0, 0]} size={[0.055, 0.72, 0.055]} ghost={ghost} materials={materials} />
      <mesh position={[0.14, 0.2, 0]} rotation={[0, 0, 0.18]}><boxGeometry args={[0.3, 0.16, 0.035]} /><meshStandardMaterial color={accent} roughness={0.9} transparent={ghost} opacity={ghost ? 0.45 : 1} /></mesh>
      <mesh position={[0, -0.28, 0.02]}><sphereGeometry args={[0.065, 8, 6]} /><meshStandardMaterial color={HEX_VISUAL_THEME.structures.metal} metalness={0.55} roughness={0.38} /></mesh>
    </group>}
  </group>;
}

function Crates({ ghost, materials }: { ghost: boolean; materials: Materials }) {
  return <group position={[-0.98, 0.27, -0.46]} rotation={[0, 0.18, 0]}>
    <mesh castShadow><boxGeometry args={[0.4, 0.4, 0.4]} /><TexturedMaterial bundle={materials.wood} ghost={ghost} roughness={0.98} /></mesh>
    <mesh position={[0.27, -0.06, 0.12]} castShadow><boxGeometry args={[0.3, 0.28, 0.3]} /><TexturedMaterial bundle={materials.wood} ghost={ghost} roughness={0.98} /></mesh>
  </group>;
}

function Home({ ghost, tier, materials }: { ghost: boolean; tier: BuildingTier; materials: Materials }) {
  return <group>
    <StoneFoundation width={2.38} depth={1.96} ghost={ghost} materials={materials} />
    <WallPanel position={[0, 0.66, 0]} size={[2.14, 1.12, 1.7]} surface="plaster" ghost={ghost} materials={materials} />
    <GablePanel width={2.08} height={0.58} position={[0, 1.2, 0.856]} surface="plaster" ghost={ghost} materials={materials} />
    <GablePanel width={2.08} height={0.58} position={[0, 1.2, -0.856]} rotationY={Math.PI} surface="plaster" ghost={ghost} materials={materials} />
    <TimberBeam position={[-1.02, 0.68, 0.88]} size={[0.09, 1.12, 0.09]} ghost={ghost} materials={materials} />
    <TimberBeam position={[1.02, 0.68, 0.88]} size={[0.09, 1.12, 0.09]} ghost={ghost} materials={materials} />
    <PitchedRoof width={2.28} depth={1.84} y={1.48} ghost={ghost} materials={materials} slope={0.5} />
    <Porch width={1.38} depth={1.78} ghost={ghost} materials={materials} />
    <Door position={[0, 0.65, 0.9]} width={0.48} height={0.82} ghost={ghost} materials={materials} />
    <NaturalWindow position={[-0.7, 0.76, 0.89]} ghost={ghost} materials={materials} />
    <NaturalWindow position={[0.7, 0.76, 0.89]} ghost={ghost} materials={materials} />
    <StoneChimney position={[0.7, 1.74, -0.32]} ghost={ghost} materials={materials} />
    <StructureTierDetails tier={tier} kind="home" ghost={ghost} materials={materials} />
  </group>;
}

function Barn({ ghost, tier, materials }: { ghost: boolean; tier: BuildingTier; materials: Materials }) {
  return <group>
    <StoneFoundation width={2.58} depth={2.0} ghost={ghost} materials={materials} />
    <WallPanel position={[0, 0.7, 0]} size={[2.36, 1.2, 1.78]} surface="wood" ghost={ghost} materials={materials} />
    <GablePanel width={2.3} height={0.7} position={[0, 1.28, 0.896]} surface="wood" ghost={ghost} materials={materials} />
    <GablePanel width={2.3} height={0.7} position={[0, 1.28, -0.896]} rotationY={Math.PI} surface="wood" ghost={ghost} materials={materials} />
    {[-0.82, 0, 0.82].map((x) => <TimberBeam key={x} position={[x, 0.7, 0.91]} size={[0.08, 1.18, 0.08]} ghost={ghost} materials={materials} />)}
    <PitchedRoof width={2.54} depth={1.94} y={1.6} ghost={ghost} materials={materials} slope={0.55} />
    <Door position={[0, 0.7, 0.92]} width={0.98} height={1.08} ghost={ghost} materials={materials} double />
    <NaturalWindow position={[-0.78, 0.82, 0.92]} width={0.3} height={0.34} ghost={ghost} materials={materials} />
    <NaturalWindow position={[0.78, 0.82, 0.92]} width={0.3} height={0.34} ghost={ghost} materials={materials} />
    <mesh position={[1.12, 0.24, 0.12]} castShadow><cylinderGeometry args={[0.31, 0.35, 0.4, 14]} /><TexturedMaterial bundle={materials.wood} ghost={ghost} roughness={0.99} /></mesh>
    <StructureTierDetails tier={tier} kind="barn" ghost={ghost} materials={materials} />
  </group>;
}

function Storage({ ghost, tier, materials }: { ghost: boolean; tier: BuildingTier; materials: Materials }) {
  return <group>
    <StoneFoundation width={1.92} depth={1.5} ghost={ghost} materials={materials} />
    <WallPanel position={[0, 0.56, 0]} size={[1.7, 0.94, 1.3]} surface="wood" ghost={ghost} materials={materials} />
    <GablePanel width={1.66} height={0.46} position={[0, 1.0, 0.656]} surface="wood" ghost={ghost} materials={materials} />
    <GablePanel width={1.66} height={0.46} position={[0, 1.0, -0.656]} rotationY={Math.PI} surface="wood" ghost={ghost} materials={materials} />
    <PitchedRoof width={1.84} depth={1.43} y={1.26} ghost={ghost} materials={materials} slope={0.47} />
    <Door position={[0, 0.56, 0.67]} width={0.64} height={0.84} ghost={ghost} materials={materials} />
    <TimberBeam position={[-0.76, 0.57, 0.68]} size={[0.07, 0.92, 0.07]} ghost={ghost} materials={materials} />
    <TimberBeam position={[0.76, 0.57, 0.68]} size={[0.07, 0.92, 0.07]} ghost={ghost} materials={materials} />
    <Crates ghost={ghost} materials={materials} />
    <StructureTierDetails tier={tier} kind="storage" ghost={ghost} materials={materials} />
  </group>;
}

function Workshop({ ghost, tier, materials }: { ghost: boolean; tier: BuildingTier; materials: Materials }) {
  return <group>
    <StoneFoundation width={2.42} depth={1.78} ghost={ghost} materials={materials} />
    <WallPanel position={[0, 0.62, 0]} size={[2.2, 1.04, 1.55]} surface="plaster" ghost={ghost} materials={materials} />
    <GablePanel width={2.14} height={0.54} position={[0, 1.12, 0.781]} surface="plaster" ghost={ghost} materials={materials} />
    <GablePanel width={2.14} height={0.54} position={[0, 1.12, -0.781]} rotationY={Math.PI} surface="plaster" ghost={ghost} materials={materials} />
    <PitchedRoof width={2.34} depth={1.7} y={1.43} ghost={ghost} materials={materials} slope={0.48} />
    <Door position={[-0.55, 0.63, 0.8]} width={0.72} height={0.76} ghost={ghost} materials={materials} />
    <NaturalWindow position={[0.58, 0.76, 0.8]} width={0.48} height={0.4} ghost={ghost} materials={materials} />
    <MetalVent position={[0.82, 1.63, -0.28]} ghost={ghost} />
    <TimberBeam position={[-1.02, 0.62, 0.8]} size={[0.08, 1.0, 0.08]} ghost={ghost} materials={materials} />
    <TimberBeam position={[1.02, 0.62, 0.8]} size={[0.08, 1.0, 0.08]} ghost={ghost} materials={materials} />
    <StructureTierDetails tier={tier} kind="workshop" ghost={ghost} materials={materials} />
  </group>;
}

export function HexPBRStructureModel({ buildingKey, ghost = false, selected = false, tier = 1 }: Props) {
  const wood = useBuildingTextureBundle(WOOD_SET, [2.1, 1.7]);
  const plaster = useBuildingTextureBundle(PLASTER_SET, [1.7, 1.45]);
  const roof = useBuildingTextureBundle(ROOF_SET, [2.0, 1.6]);
  const stone = useBuildingTextureBundle(STONE_SET, [1.8, 1.2]);
  const materials = useMemo(() => ({ wood, plaster, roof, stone }), [plaster, roof, stone, wood]);
  void selected;

  switch (buildingKey) {
    case 'home': return <Home ghost={ghost} tier={tier} materials={materials} />;
    case 'barn': return <Barn ghost={ghost} tier={tier} materials={materials} />;
    case 'storage': return <Storage ghost={ghost} tier={tier} materials={materials} />;
    case 'workshop': return <Workshop ghost={ghost} tier={tier} materials={materials} />;
    default: return null;
  }
}
