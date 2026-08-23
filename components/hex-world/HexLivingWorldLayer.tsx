"use client";

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FarmSeason } from '@/lib/family-farm-progression';
import type { HomesteadLifeState } from '@/lib/homestead-life-engine';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import {
  getHomesteadPresencePosition,
  type HomesteadPresenceAnchor,
  type HomesteadPresenceRole,
} from '@/lib/hex-world/homestead-presence';
import { getCropVisualSamples } from '@/lib/hex-world/living-homestead';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import { useReducedHexMotion } from './useReducedHexMotion';

const CROP_COLORS: Record<string, { leaf: string; fruit: string }> = {
  carrot: { leaf: '#5f8f55', fruit: '#e58b45' },
  lettuce: { leaf: '#84aa64', fruit: '#a9c982' },
  tomato: { leaf: '#6f9a58', fruit: '#d85f50' },
  strawberry: { leaf: '#6f9a58', fruit: '#d65f72' },
  corn: { leaf: '#78924f', fruit: '#e8c85a' },
  pumpkin: { leaf: '#6b8b50', fruit: '#d88135' },
  potato: { leaf: '#748b55', fruit: '#b99a6b' },
  cabbage: { leaf: '#789b72', fruit: '#9fbe97' },
};

const CROP_OFFSETS: Array<[number, number]> = [
  [-0.32, -0.16], [0.3, -0.18], [0.02, 0.28], [-0.38, 0.26], [0.38, 0.24], [0, -0.38],
];

const RAIN_POSITIONS = Array.from({ length: 28 }, (_, index) => {
  const column = index % 7;
  const row = Math.floor(index / 7);
  return { x: -7.2 + column * 2.35 + (row % 2) * 0.45, y: 4.6 + (index % 4) * 0.75, z: -5.2 + row * 3.25 + (column % 2) * 0.35 };
});

export const SEASON_PARTICLE_COUNT = 22;
const SEASON_POSITIONS = Array.from({ length: SEASON_PARTICLE_COUNT }, (_, index) => ({
  x: -8 + ((index * 37) % 160) / 10,
  y: 1.8 + ((index * 17) % 45) / 10,
  z: -7 + ((index * 53) % 140) / 10,
  phase: (index * 0.73) % (Math.PI * 2),
}));

const PRESENCE_ROLE_BY_BUILDING: Partial<Record<string, HomesteadPresenceRole>> = {
  home: 'home',
  garden_patch: 'garden',
  pond: 'pond',
  workshop: 'workshop',
  bench: 'bench',
  barn: 'barn',
};

type PresenceId = 'partner-1' | 'partner-2' | 'child' | 'cow' | 'sheep' | 'pet';

function CropVisual({ sample, baseY, reducedMotion }: {
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
      {sample.watered && <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.22, 12]} /><meshStandardMaterial color="#7eb6bd" transparent opacity={0.34} roughness={1} /></mesh>}
      <mesh position={[0, height * 0.45, 0]} castShadow><cylinderGeometry args={[0.035, 0.055, height, 6]} /><meshStandardMaterial color={palette.leaf} roughness={1} /></mesh>
      <mesh position={[-0.09, height * 0.72, 0]} rotation={[0.15, 0, -0.7]} castShadow><sphereGeometry args={[0.1 + progress * 0.035, 7, 5]} /><meshStandardMaterial color={palette.leaf} roughness={1} /></mesh>
      <mesh position={[0.09, height * 0.76, 0.02]} rotation={[-0.12, 0, 0.7]} castShadow><sphereGeometry args={[0.1 + progress * 0.035, 7, 5]} /><meshStandardMaterial color={palette.leaf} roughness={1} /></mesh>
      {progress >= 0.72 && <mesh position={[0.02, height * 0.58, 0.08]} castShadow><sphereGeometry args={[0.075 + progress * 0.035, 8, 6]} /><meshStandardMaterial color={palette.fruit} roughness={0.9} /></mesh>}
    </group>
  );
}

function ChickenVisual({ index, home, baseY, fed, reducedMotion }: { index: number; home: HexBuildingDTO; baseY: number; fed: boolean; reducedMotion: boolean }) {
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
      <mesh castShadow><sphereGeometry args={[0.22, 9, 7]} /><meshStandardMaterial color={fed ? '#f6e6bd' : '#f3efdf'} roughness={1} /></mesh>
      <mesh position={[0.13, 0.18, 0.02]} castShadow><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#fffaf0" roughness={1} /></mesh>
      <mesh position={[0.245, 0.18, 0.02]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.055, 0.12, 5]} /><meshStandardMaterial color="#d9964c" roughness={1} /></mesh>
      <mesh position={[0.1, 0.3, 0.02]}><sphereGeometry args={[0.045, 6, 5]} /><meshStandardMaterial color="#d86b5d" roughness={1} /></mesh>
    </group>
  );
}

function usePresenceMotion({
  id,
  state,
  anchors,
  reducedMotion,
}: {
  id: PresenceId;
  state: HomesteadLifeState;
  anchors: HomesteadPresenceAnchor[];
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const initial = getHomesteadPresencePosition({
    id,
    day: state.day,
    timeMinutes: state.timeMinutes,
    elapsedSeconds: 0,
    anchors,
    reducedMotion,
  });

  useFrame(({ clock }) => {
    if (!ref.current || document.visibilityState === 'hidden') return;
    const next = getHomesteadPresencePosition({
      id,
      day: state.day,
      timeMinutes: state.timeMinutes,
      elapsedSeconds: clock.elapsedTime,
      anchors,
      reducedMotion,
    });
    const bob = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 2 + id.length) * 0.018;
    ref.current.position.set(next.x, next.y + bob, next.z);
    ref.current.rotation.y = next.heading;
  });

  return { ref, initial };
}

function FamilyMemberVisual({
  id,
  state,
  anchors,
  reducedMotion,
  child = false,
  palette,
}: {
  id: 'partner-1' | 'partner-2' | 'child';
  state: HomesteadLifeState;
  anchors: HomesteadPresenceAnchor[];
  reducedMotion: boolean;
  child?: boolean;
  palette: { shirt: string; hair: string };
}) {
  const { ref, initial } = usePresenceMotion({ id, state, anchors, reducedMotion });
  const scale = child ? 0.72 : 0.9;
  return (
    <group ref={ref} position={[initial.x, initial.y, initial.z]} rotation={[0, initial.heading, 0]} scale={scale}>
      <mesh position={[0, 0.38, 0]} castShadow><capsuleGeometry args={[0.16, 0.34, 5, 8]} /><meshStandardMaterial color={palette.shirt} roughness={0.95} /></mesh>
      <mesh position={[0, 0.79, 0]} castShadow><sphereGeometry args={[0.19, 10, 8]} /><meshStandardMaterial color="#e5b58c" roughness={1} /></mesh>
      <mesh position={[0, 0.91, -0.02]} castShadow><sphereGeometry args={[0.185, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.56]} /><meshStandardMaterial color={palette.hair} roughness={1} /></mesh>
      <mesh position={[-0.08, 0.78, 0.17]}><sphereGeometry args={[0.018, 5, 4]} /><meshStandardMaterial color="#3d342f" roughness={1} /></mesh>
      <mesh position={[0.08, 0.78, 0.17]}><sphereGeometry args={[0.018, 5, 4]} /><meshStandardMaterial color="#3d342f" roughness={1} /></mesh>
      <mesh position={[-0.07, 0.08, 0]} castShadow><cylinderGeometry args={[0.045, 0.055, 0.34, 6]} /><meshStandardMaterial color="#6f675e" roughness={1} /></mesh>
      <mesh position={[0.07, 0.08, 0]} castShadow><cylinderGeometry args={[0.045, 0.055, 0.34, 6]} /><meshStandardMaterial color="#6f675e" roughness={1} /></mesh>
    </group>
  );
}

function CowVisual({ state, anchors, reducedMotion }: { state: HomesteadLifeState; anchors: HomesteadPresenceAnchor[]; reducedMotion: boolean }) {
  const { ref, initial } = usePresenceMotion({ id: 'cow', state, anchors, reducedMotion });
  return (
    <group ref={ref} position={[initial.x, initial.y, initial.z]} rotation={[0, initial.heading, 0]} scale={0.78}>
      <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.82, 0.48, 0.45]} /><meshStandardMaterial color="#f0e4cc" roughness={1} /></mesh>
      <mesh position={[0.47, 0.52, 0]} castShadow><boxGeometry args={[0.34, 0.34, 0.32]} /><meshStandardMaterial color="#f5ead6" roughness={1} /></mesh>
      <mesh position={[0.52, 0.48, 0.17]}><sphereGeometry args={[0.055, 6, 5]} /><meshStandardMaterial color="#4d4339" roughness={1} /></mesh>
      <mesh position={[0.52, 0.48, -0.17]}><sphereGeometry args={[0.055, 6, 5]} /><meshStandardMaterial color="#4d4339" roughness={1} /></mesh>
      {[[-0.25, 0.12, -0.14], [-0.25, 0.12, 0.14], [0.25, 0.12, -0.14], [0.25, 0.12, 0.14]].map(([x, y, z], index) => <mesh key={index} position={[x, y, z]} castShadow><cylinderGeometry args={[0.05, 0.055, 0.35, 6]} /><meshStandardMaterial color="#6b5a48" roughness={1} /></mesh>)}
      <mesh position={[-0.2, 0.57, 0.22]} castShadow><sphereGeometry args={[0.16, 7, 6]} /><meshStandardMaterial color="#6c5b4a" roughness={1} /></mesh>
    </group>
  );
}

function SheepVisual({ state, anchors, reducedMotion }: { state: HomesteadLifeState; anchors: HomesteadPresenceAnchor[]; reducedMotion: boolean }) {
  const { ref, initial } = usePresenceMotion({ id: 'sheep', state, anchors, reducedMotion });
  return (
    <group ref={ref} position={[initial.x, initial.y, initial.z]} rotation={[0, initial.heading, 0]} scale={0.74}>
      <mesh position={[0, 0.38, 0]} castShadow><sphereGeometry args={[0.46, 8, 7]} /><meshStandardMaterial color="#f2eee0" roughness={1} /></mesh>
      <mesh position={[0.4, 0.47, 0]} castShadow><sphereGeometry args={[0.22, 8, 6]} /><meshStandardMaterial color="#6d6257" roughness={1} /></mesh>
      {[[-0.18, 0.08, -0.13], [-0.18, 0.08, 0.13], [0.18, 0.08, -0.13], [0.18, 0.08, 0.13]].map(([x, y, z], index) => <mesh key={index} position={[x, y, z]} castShadow><cylinderGeometry args={[0.04, 0.045, 0.3, 6]} /><meshStandardMaterial color="#655a50" roughness={1} /></mesh>)}
    </group>
  );
}

function PetVisual({ kind, state, anchors, reducedMotion }: { kind: 'cat' | 'dog'; state: HomesteadLifeState; anchors: HomesteadPresenceAnchor[]; reducedMotion: boolean }) {
  const { ref, initial } = usePresenceMotion({ id: 'pet', state, anchors, reducedMotion });
  const color = kind === 'cat' ? '#b6a58f' : '#c58d5c';
  return (
    <group ref={ref} position={[initial.x, initial.y, initial.z]} rotation={[0, initial.heading, 0]} scale={0.58}>
      <mesh position={[0, 0.26, 0]} castShadow><capsuleGeometry args={[0.16, 0.34, 5, 8]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
      <mesh position={[0.28, 0.36, 0]} castShadow><sphereGeometry args={[0.2, 8, 6]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
      <mesh position={[0.31, 0.5, 0.12]} rotation={[0, 0, 0.2]}><coneGeometry args={[0.07, 0.17, 5]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
      <mesh position={[0.31, 0.5, -0.12]} rotation={[0, 0, 0.2]}><coneGeometry args={[0.07, 0.17, 5]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
      <mesh position={[-0.23, 0.36, 0]} rotation={[0, 0, kind === 'cat' ? 0.9 : 0.55]}><cylinderGeometry args={[0.025, 0.035, 0.42, 6]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
    </group>
  );
}

function BuildingTierAccents({ state, buildings, tileHeight }: { state: HomesteadLifeState; buildings: HexBuildingDTO[]; tileHeight: Map<string, number> }) {
  const keys = ['home', 'barn', 'workshop', 'storage'] as const;
  return (
    <group>
      {keys.map((buildingKey) => {
        const tier = state.buildingTiers[buildingKey];
        const building = buildings.find((candidate) => candidate.buildingKey === buildingKey);
        if (!building || tier <= 1) return null;
        const baseY = tileHeight.get(`${building.anchorQ}:${building.anchorR}`) ?? 0;
        const world = axialToWorld({ q: building.anchorQ, r: building.anchorR }, 1, baseY + 0.08);
        return (
          <group key={`tier-accent-${buildingKey}`} position={[world.x, world.y, world.z]}>
            <mesh position={[-0.72, 0.28, 0.78]} castShadow><cylinderGeometry args={[0.07, 0.09, 0.52, 6]} /><meshStandardMaterial color="#806a4e" roughness={1} /></mesh>
            <mesh position={[-0.72, 0.58, 0.78]}><sphereGeometry args={[0.105, 7, 5]} /><meshStandardMaterial color="#f2c36b" emissive="#e5a946" emissiveIntensity={0.35} roughness={0.7} /></mesh>
            <mesh position={[0.72, 0.28, 0.78]} castShadow><cylinderGeometry args={[0.07, 0.09, 0.52, 6]} /><meshStandardMaterial color="#806a4e" roughness={1} /></mesh>
            <mesh position={[0.72, 0.58, 0.78]}><sphereGeometry args={[0.105, 7, 5]} /><meshStandardMaterial color="#f2c36b" emissive="#e5a946" emissiveIntensity={0.35} roughness={0.7} /></mesh>
            {tier >= 3 && (
              <group position={[0, 1.55, -0.62]}>
                <mesh castShadow><cylinderGeometry args={[0.028, 0.035, 0.9, 6]} /><meshStandardMaterial color="#745e49" roughness={1} /></mesh>
                <mesh position={[0.22, 0.27, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.18, 0.42, 3]} /><meshStandardMaterial color="#d39a5b" roughness={0.9} /></mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

function RainField({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion || document.visibilityState === 'hidden') return;
    ref.current.position.y = -((clock.elapsedTime * 4.2) % 3.2);
  });
  return <group ref={ref}>{RAIN_POSITIONS.map((drop, index) => <mesh key={index} position={[drop.x, drop.y, drop.z]} rotation={[0, 0, 0.08]}><cylinderGeometry args={[0.012, 0.012, reducedMotion ? 0.16 : 0.34, 4]} /><meshBasicMaterial color="#9ac8d5" transparent opacity={0.42} /></mesh>)}</group>;
}

function SeasonAtmosphere({ season, reducedMotion }: { season: FarmSeason; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion || document.visibilityState === 'hidden') return;
    const t = clock.elapsedTime;
    ref.current.children.forEach((child, index) => {
      const seed = SEASON_POSITIONS[index];
      if (season === 'summer') {
        child.position.y = seed.y + Math.sin(t * 0.7 + seed.phase) * 0.16;
        child.position.x = seed.x + Math.sin(t * 0.25 + seed.phase) * 0.18;
      } else {
        const speed = season === 'winter' ? 0.42 : 0.24;
        child.position.y = 5.8 - ((t * speed + seed.phase) % 5.2);
        child.position.x = seed.x + Math.sin(t * 0.55 + seed.phase) * (season === 'autumn' ? 0.5 : 0.22);
        child.rotation.z = t * (season === 'autumn' ? 0.8 : 0.24) + seed.phase;
      }
    });
  });

  const style = season === 'spring'
    ? { color: '#e8aabd', opacity: 0.34, kind: 'petal' as const }
    : season === 'summer'
      ? { color: '#f2d985', opacity: 0.25, kind: 'mote' as const }
      : season === 'autumn'
        ? { color: '#c77b45', opacity: 0.38, kind: 'leaf' as const }
        : { color: '#f5fbff', opacity: 0.54, kind: 'snow' as const };

  return (
    <group ref={ref}>
      {SEASON_POSITIONS.map((particle, index) => (
        <mesh key={`${season}-${index}`} position={[particle.x, particle.y, particle.z]} rotation={[0, 0, particle.phase]}>
          {style.kind === 'snow' || style.kind === 'mote'
            ? <sphereGeometry args={[style.kind === 'snow' ? 0.045 : 0.035, 5, 4]} />
            : <circleGeometry args={[style.kind === 'leaf' ? 0.07 : 0.055, 5]} />}
          <meshBasicMaterial color={style.color} transparent opacity={style.opacity} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function HexLivingWorldLayer({ state, buildings, tiles }: { state: HomesteadLifeState; buildings: HexBuildingDTO[]; tiles: HexTileDTO[] }) {
  const reducedMotion = useReducedHexMotion();
  const gardenBuildings = useMemo(() => buildings.filter((building) => building.buildingKey === 'garden_patch'), [buildings]);
  const home = useMemo(() => buildings.find((building) => building.buildingKey === 'home') ?? null, [buildings]);
  const tileHeight = useMemo(() => new Map(tiles.map((tile) => [hexKey(tile), tile.height])), [tiles]);
  const crops = useMemo(() => getCropVisualSamples(state, gardenBuildings, 12), [gardenBuildings, state]);
  const anchors = useMemo<HomesteadPresenceAnchor[]>(() => buildings.flatMap((building) => {
    const role = PRESENCE_ROLE_BY_BUILDING[building.buildingKey];
    if (!role) return [];
    const baseY = tileHeight.get(`${building.anchorQ}:${building.anchorR}`) ?? 0;
    const world = axialToWorld({ q: building.anchorQ, r: building.anchorR }, 1, baseY + 0.14);
    return [{ role, x: world.x, y: world.y, z: world.z }];
  }), [buildings, tileHeight]);
  const chickenCount = Math.min(6, state.livestock.chickens);

  return (
    <group>
      <SeasonAtmosphere season={state.season} reducedMotion={reducedMotion} />
      <BuildingTierAccents state={state} buildings={buildings} tileHeight={tileHeight} />
      {crops.map((sample) => <CropVisual key={sample.plotId} sample={sample} baseY={tileHeight.get(`${sample.anchorQ}:${sample.anchorR}`) ?? 0} reducedMotion={reducedMotion} />)}
      {home && Array.from({ length: chickenCount }, (_, index) => <ChickenVisual key={`living-chicken-${index}`} index={index} home={home} baseY={tileHeight.get(`${home.anchorQ}:${home.anchorR}`) ?? 0} fed={state.livestock.fedToday} reducedMotion={reducedMotion} />)}
      <FamilyMemberVisual id="partner-1" state={state} anchors={anchors} reducedMotion={reducedMotion} palette={{ shirt: '#7fa58f', hair: '#5a4438' }} />
      <FamilyMemberVisual id="partner-2" state={state} anchors={anchors} reducedMotion={reducedMotion} palette={{ shirt: '#c8877d', hair: '#40352f' }} />
      {state.family.stage === 'child' && <FamilyMemberVisual id="child" child state={state} anchors={anchors} reducedMotion={reducedMotion} palette={{ shirt: '#e2b96f', hair: '#735443' }} />}
      {state.animals.cow.owned && <CowVisual state={state} anchors={anchors} reducedMotion={reducedMotion} />}
      {state.animals.sheep.owned && <SheepVisual state={state} anchors={anchors} reducedMotion={reducedMotion} />}
      {state.animals.pet.kind && <PetVisual kind={state.animals.pet.kind} state={state} anchors={anchors} reducedMotion={reducedMotion} />}
      {state.weather === 'rainy' && <RainField reducedMotion={reducedMotion} />}
    </group>
  );
}
