"use client";

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HomesteadLifeState } from '@/lib/homestead-life-engine';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import { getCropSilhouetteKind, getCropStageScale, getCropVisualStage } from '@/lib/hex-world/crop-visuals';
import { getCropVisualSamples } from '@/lib/hex-world/living-homestead';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

const CROP_OFFSETS: Array<[number, number]> = [
  [-0.32, -0.16], [0.3, -0.18], [0.02, 0.28], [-0.38, 0.26], [0.38, 0.24], [0, -0.38],
];

const CROP_PALETTES: Record<string, { leaf: string; fruit: string }> = {
  carrot: { leaf: '#58884f', fruit: '#e58b45' },
  lettuce: { leaf: '#82aa63', fruit: '#a9ca83' },
  tomato: { leaf: '#659154', fruit: '#d75c50' },
  strawberry: { leaf: '#668f54', fruit: '#d85d72' },
  corn: { leaf: '#748e4b', fruit: '#e7c552' },
  pumpkin: { leaf: '#66854b', fruit: '#d57c31' },
  potato: { leaf: '#718752', fruit: '#b59568' },
  cabbage: { leaf: '#75966f', fruit: '#a0bd98' },
};

type Sample = ReturnType<typeof getCropVisualSamples>[number];

function Leaf({ position, rotation, scale, color }: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow raycast={() => {}}>
      <sphereGeometry args={[0.13, 7, 5]} />
      <meshStandardMaterial color={color} roughness={0.96} />
    </mesh>
  );
}

function UniversalSprout({ color, scale }: { color: string; scale: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.14, 0]} castShadow raycast={() => {}}><cylinderGeometry args={[0.025, 0.035, 0.28, 5]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
      <Leaf position={[-0.07, 0.23, 0]} rotation={[0.1, 0, -0.7]} scale={[0.72, 0.4, 0.78]} color={color} />
      <Leaf position={[0.07, 0.25, 0.01]} rotation={[-0.1, 0, 0.7]} scale={[0.72, 0.4, 0.78]} color={color} />
    </group>
  );
}

function RootCrop({ palette, stageScale, ready }: { palette: { leaf: string; fruit: string }; stageScale: number; ready: boolean }) {
  return (
    <group scale={stageScale}>
      {[[-0.08, -0.45], [0, 0], [0.08, 0.45]].map(([x, tilt], index) => (
        <mesh key={index} position={[x, 0.3 + index * 0.025, 0]} rotation={[0, 0, tilt]} castShadow raycast={() => {}}>
          <coneGeometry args={[0.105, 0.42, 5]} />
          <meshStandardMaterial color={palette.leaf} roughness={0.96} />
        </mesh>
      ))}
      {ready && <mesh position={[0, 0.105, 0.035]} rotation={[0, 0, Math.PI]} castShadow raycast={() => {}}><coneGeometry args={[0.095, 0.26, 7]} /><meshStandardMaterial color={palette.fruit} roughness={0.88} /></mesh>}
    </group>
  );
}

function LeafyCrop({ palette, stageScale, ready }: { palette: { leaf: string; fruit: string }; stageScale: number; ready: boolean }) {
  const leaves = [[-0.12, 0.18, 0.02], [0.12, 0.2, 0], [0, 0.25, 0.1], [-0.02, 0.28, -0.09]] as const;
  return (
    <group scale={stageScale}>
      {leaves.map(([x, y, z], index) => <Leaf key={index} position={[x, y, z]} rotation={[0.15, index * 1.2, (index - 1.5) * 0.35]} scale={[1.2, 0.72, 1.3]} color={index % 2 ? palette.leaf : HEX_VISUAL_THEME.vegetation.leafLight} />)}
      {ready && <mesh position={[0, 0.28, 0]} scale={[1.15, 0.8, 1.15]} castShadow raycast={() => {}}><dodecahedronGeometry args={[0.16, 0]} /><meshStandardMaterial color={palette.fruit} roughness={0.94} /></mesh>}
    </group>
  );
}

function VineCrop({ palette, stageScale, ready }: { palette: { leaf: string; fruit: string }; stageScale: number; ready: boolean }) {
  return (
    <group scale={stageScale}>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0.4]} raycast={() => {}}><torusGeometry args={[0.19, 0.025, 5, 12, Math.PI * 1.55]} /><meshStandardMaterial color={palette.leaf} roughness={1} /></mesh>
      <Leaf position={[-0.16, 0.18, 0.02]} rotation={[0, 0.3, -0.3]} scale={[1.05, 0.58, 1.18]} color={palette.leaf} />
      <Leaf position={[0.14, 0.17, -0.03]} rotation={[0, -0.5, 0.32]} scale={[0.95, 0.55, 1.1]} color={HEX_VISUAL_THEME.vegetation.leafLight} />
      {ready && <mesh position={[0.04, 0.18, 0.04]} scale={[1.25, 0.82, 1.1]} castShadow raycast={() => {}}><sphereGeometry args={[0.16, 9, 7]} /><meshStandardMaterial color={palette.fruit} roughness={0.9} /></mesh>}
    </group>
  );
}

function StalkCrop({ palette, stageScale, ready }: { palette: { leaf: string; fruit: string }; stageScale: number; ready: boolean }) {
  return (
    <group scale={stageScale}>
      <mesh position={[0, 0.39, 0]} castShadow raycast={() => {}}><cylinderGeometry args={[0.04, 0.06, 0.78, 6]} /><meshStandardMaterial color={palette.leaf} roughness={1} /></mesh>
      <Leaf position={[-0.11, 0.43, 0]} rotation={[0.1, 0, -0.82]} scale={[1.35, 0.42, 0.7]} color={palette.leaf} />
      <Leaf position={[0.11, 0.56, 0.01]} rotation={[-0.08, 0, 0.86]} scale={[1.3, 0.4, 0.68]} color={HEX_VISUAL_THEME.vegetation.leafLight} />
      {ready && <mesh position={[0.09, 0.51, 0.055]} rotation={[0.15, 0, -0.2]} castShadow raycast={() => {}}><capsuleGeometry args={[0.055, 0.17, 4, 7]} /><meshStandardMaterial color={palette.fruit} roughness={0.86} /></mesh>}
    </group>
  );
}

function BushCrop({ palette, stageScale, ready, cropKey }: { palette: { leaf: string; fruit: string }; stageScale: number; ready: boolean; cropKey: string }) {
  const fruitScale = cropKey === 'strawberry' ? 0.065 : 0.08;
  return (
    <group scale={stageScale}>
      <mesh position={[0, 0.29, 0]} castShadow raycast={() => {}}><cylinderGeometry args={[0.03, 0.045, 0.58, 6]} /><meshStandardMaterial color={palette.leaf} roughness={1} /></mesh>
      <Leaf position={[-0.1, 0.36, 0]} rotation={[0.12, 0, -0.65]} scale={[1, 0.62, 1]} color={palette.leaf} />
      <Leaf position={[0.1, 0.41, 0.02]} rotation={[-0.1, 0, 0.7]} scale={[1, 0.62, 1]} color={HEX_VISUAL_THEME.vegetation.leafLight} />
      <Leaf position={[0, 0.5, -0.02]} rotation={[0.2, 0.7, 0]} scale={[0.95, 0.58, 0.95]} color={palette.leaf} />
      {ready && [[-0.08, 0.34, 0.08], [0.09, 0.4, 0.07], [0.02, 0.48, 0.08]].map(([x, y, z], index) => <mesh key={index} position={[x, y, z]} castShadow raycast={() => {}}><sphereGeometry args={[fruitScale, 7, 5]} /><meshStandardMaterial color={palette.fruit} emissive={palette.fruit} emissiveIntensity={0.08} roughness={0.88} /></mesh>)}
    </group>
  );
}

function CropEnhancement({ sample, baseY, reducedMotion }: { sample: Sample; baseY: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const world = axialToWorld({ q: sample.anchorQ, r: sample.anchorR }, 1, baseY + 0.08);
  const [offsetX, offsetZ] = CROP_OFFSETS[sample.slot % CROP_OFFSETS.length];
  const stage = getCropVisualStage(sample.progress);
  const stageScale = getCropStageScale(stage);
  const kind = getCropSilhouetteKind(sample.cropKey);
  const palette = CROP_PALETTES[sample.cropKey] ?? CROP_PALETTES.carrot;
  const ready = stage === 'ready';

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion || document.visibilityState === 'hidden') return;
    if (ready) ref.current.position.y = world.y + Math.sin(clock.elapsedTime * 1.5 + sample.slot) * 0.018;
  });

  return (
    <group ref={ref} position={[world.x + offsetX, world.y, world.z + offsetZ]}>
      {sample.watered && (
        <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
          <circleGeometry args={[0.235, 12]} />
          <meshStandardMaterial color="#665042" transparent opacity={0.78} roughness={1} />
        </mesh>
      )}
      {stage === 'sprout' ? <UniversalSprout color={palette.leaf} scale={stageScale} /> : kind === 'root' ? <RootCrop palette={palette} stageScale={stageScale} ready={ready} /> : kind === 'leafy' ? <LeafyCrop palette={palette} stageScale={stageScale} ready={ready} /> : kind === 'vine' ? <VineCrop palette={palette} stageScale={stageScale} ready={ready} /> : kind === 'stalk' ? <StalkCrop palette={palette} stageScale={stageScale} ready={ready} /> : <BushCrop palette={palette} stageScale={stageScale} ready={ready} cropKey={sample.cropKey} />}
    </group>
  );
}

export function HexCropEnhancements({ state, buildings, tiles, reducedMotion }: {
  state: HomesteadLifeState;
  buildings: HexBuildingDTO[];
  tiles: HexTileDTO[];
  reducedMotion: boolean;
}) {
  const gardens = useMemo(() => buildings.filter((building) => building.buildingKey === 'garden_patch'), [buildings]);
  const samples = useMemo(() => getCropVisualSamples(state, gardens, 12), [gardens, state]);
  const heightByKey = useMemo(() => new Map(tiles.map((tile) => [hexKey(tile), tile.height])), [tiles]);

  return (
    <group>
      {samples.map((sample) => (
        <CropEnhancement
          key={`crop-enhancement:${sample.plotId}`}
          sample={sample}
          baseY={heightByKey.get(`${sample.anchorQ}:${sample.anchorR}`) ?? 0}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}
