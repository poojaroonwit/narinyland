"use client";

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FamilyFarmState } from '@/lib/family-farm-game';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import { getCropVisualSamples } from '@/lib/hex-world/living-homestead';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import { useReducedHexMotion } from './useReducedHexMotion';

const CROP_COLORS: Record<string, { leaf: string; fruit: string }> = {
  carrot: { leaf: '#5f8f55', fruit: '#e58b45' },
  lettuce: { leaf: '#84aa64', fruit: '#a9c982' },
  tomato: { leaf: '#6f9a58', fruit: '#d85f50' },
  strawberry: { leaf: '#6f9a58', fruit: '#d65f72' },
};

const CROP_OFFSETS: Array<[number, number]> = [
  [-0.32, -0.16], [0.3, -0.18], [0.02, 0.28], [-0.38, 0.26], [0.38, 0.24], [0, -0.38],
];

const RAIN_POSITIONS = Array.from({ length: 28 }, (_, index) => {
  const column = index % 7;
  const row = Math.floor(index / 7);
  return {
    x: -7.2 + column * 2.35 + (row % 2) * 0.45,
    y: 4.6 + (index % 4) * 0.75,
    z: -5.2 + row * 3.25 + (column % 2) * 0.35,
  };
});

function CropVisual({
  sample,
  baseY,
  reducedMotion,
}: {
  sample: ReturnType<typeof getCropVisualSamples>[number];
  baseY: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const world = axialToWorld({ q: sample.anchorQ, r: sample.anchorR }, 1, baseY + 0.08);
  const [offsetX, offsetZ] = CROP_OFFSETS[sample.slot % CROP_OFFSETS.length];
  const progress = Math.max(0.12, sample.progress);
  const height = 0.18 + progress * 0.52;
  const palette = CROP_COLORS[sample.cropKey] ?? CROP_COLORS.carrot;

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion || document.visibilityState === 'hidden') return;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.25 + sample.slot) * 0.035;
  });

  return (
    <group ref={ref} position={[world.x + offsetX, world.y, world.z + offsetZ]} scale={[0.82, 0.82, 0.82]}>
      {sample.watered && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.22, 12]} />
          <meshStandardMaterial color="#7eb6bd" transparent opacity={0.34} roughness={1} />
        </mesh>
      )}
      <mesh position={[0, height * 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.055, height, 6]} />
        <meshStandardMaterial color={palette.leaf} roughness={1} />
      </mesh>
      <mesh position={[-0.09, height * 0.72, 0]} rotation={[0.15, 0, -0.7]} castShadow>
        <sphereGeometry args={[0.1 + progress * 0.035, 7, 5]} />
        <meshStandardMaterial color={palette.leaf} roughness={1} />
      </mesh>
      <mesh position={[0.09, height * 0.76, 0.02]} rotation={[-0.12, 0, 0.7]} castShadow>
        <sphereGeometry args={[0.1 + progress * 0.035, 7, 5]} />
        <meshStandardMaterial color={palette.leaf} roughness={1} />
      </mesh>
      {progress >= 0.72 && (
        <mesh position={[0.02, height * 0.58, 0.08]} castShadow>
          <sphereGeometry args={[0.075 + progress * 0.035, 8, 6]} />
          <meshStandardMaterial color={palette.fruit} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

function ChickenVisual({ index, home, baseY, fed, reducedMotion }: {
  index: number;
  home: HexBuildingDTO;
  baseY: number;
  fed: boolean;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const world = axialToWorld({ q: home.anchorQ, r: home.anchorR }, 1, baseY + 0.1);
  const angle = (index / 6) * Math.PI * 2 + 0.45;
  const radius = 1.45 + (index % 2) * 0.25;

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion || document.visibilityState === 'hidden') return;
    ref.current.position.y = world.y + 0.11 + Math.sin(clock.elapsedTime * 2.1 + index) * 0.025;
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.45 + index) * 0.35;
  });

  return (
    <group ref={ref} position={[world.x + Math.cos(angle) * radius, world.y + 0.11, world.z + Math.sin(angle) * radius]} scale={0.72}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 9, 7]} />
        <meshStandardMaterial color={fed ? '#f6e6bd' : '#f3efdf'} roughness={1} />
      </mesh>
      <mesh position={[0.13, 0.18, 0.02]} castShadow>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial color="#fffaf0" roughness={1} />
      </mesh>
      <mesh position={[0.245, 0.18, 0.02]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.055, 0.12, 5]} />
        <meshStandardMaterial color="#d9964c" roughness={1} />
      </mesh>
      <mesh position={[0.1, 0.3, 0.02]}>
        <sphereGeometry args={[0.045, 6, 5]} />
        <meshStandardMaterial color="#d86b5d" roughness={1} />
      </mesh>
    </group>
  );
}

function RainField({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion || document.visibilityState === 'hidden') return;
    ref.current.position.y = -((clock.elapsedTime * 4.2) % 3.2);
  });

  return (
    <group ref={ref}>
      {RAIN_POSITIONS.map((drop, index) => (
        <mesh key={index} position={[drop.x, drop.y, drop.z]} rotation={[0, 0, 0.08]}>
          <cylinderGeometry args={[0.012, 0.012, reducedMotion ? 0.16 : 0.34, 4]} />
          <meshBasicMaterial color="#9ac8d5" transparent opacity={0.42} />
        </mesh>
      ))}
    </group>
  );
}

export function HexLivingWorldLayer({
  state,
  buildings,
  tiles,
}: {
  state: FamilyFarmState;
  buildings: HexBuildingDTO[];
  tiles: HexTileDTO[];
}) {
  const reducedMotion = useReducedHexMotion();
  const gardenBuildings = useMemo(() => buildings.filter((building) => building.buildingKey === 'garden_patch'), [buildings]);
  const home = useMemo(() => buildings.find((building) => building.buildingKey === 'home') ?? null, [buildings]);
  const tileHeight = useMemo(() => new Map(tiles.map((tile) => [hexKey(tile), tile.height])), [tiles]);
  const crops = useMemo(() => getCropVisualSamples(state, gardenBuildings, 12), [gardenBuildings, state]);
  const chickenCount = Math.min(6, state.livestock.chickens);

  return (
    <group>
      {crops.map((sample) => (
        <CropVisual
          key={sample.plotId}
          sample={sample}
          baseY={tileHeight.get(`${sample.anchorQ}:${sample.anchorR}`) ?? 0}
          reducedMotion={reducedMotion}
        />
      ))}
      {home && Array.from({ length: chickenCount }, (_, index) => (
        <ChickenVisual
          key={`living-chicken-${index}`}
          index={index}
          home={home}
          baseY={tileHeight.get(`${home.anchorQ}:${home.anchorR}`) ?? 0}
          fed={state.livestock.fedToday}
          reducedMotion={reducedMotion}
        />
      ))}
      {state.weather === 'rainy' && <RainField reducedMotion={reducedMotion} />}
    </group>
  );
}
