"use client";

import React from 'react';
import type { BuildingTier } from '@/lib/building-progression';
import { HexDecorModel } from '@/components/hex-world/models/HexDecorModels';

// Hand-built miniature props. All surfaces are flat or gently shaded colors;
// unlike the legacy construction assets, nothing loads a texture or GLTF model.
type Props = { buildingKey: string; ghost?: boolean; selected?: boolean; tier?: BuildingTier };

function Matte({ color, ghost = false, glow = false }: { color: string; ghost?: boolean; glow?: boolean }) {
  return <meshStandardMaterial
    color={color}
    roughness={0.94}
    metalness={0}
    flatShading
    emissive={glow ? '#f6dca7' : '#000000'}
    emissiveIntensity={glow && !ghost ? 0.24 : 0}
    transparent={ghost}
    opacity={ghost ? 0.52 : 1}
    depthWrite={!ghost}
  />;
}

function Cottage({ kind, ghost, tier }: { kind: 'home' | 'barn' | 'workshop' | 'storage'; ghost: boolean; tier: BuildingTier }) {
  const colors = {
    home: { wall: '#f9eaca', side: '#eee0c3', roof: '#b98273', trim: '#a98265', door: '#94765d' },
    barn: { wall: '#d79e87', side: '#c78f7b', roof: '#8d776a', trim: '#f0dbbf', door: '#966e60' },
    workshop: { wall: '#f2e1bd', side: '#e3d2b1', roof: '#859b84', trim: '#977e62', door: '#807f6b' },
    storage: { wall: '#e9cda8', side: '#d9bb98', roof: '#b68c71', trim: '#a1866d', door: '#94745e' },
  }[kind];

  const width = kind === 'barn' ? 1.95 : kind === 'home' ? 1.82 : 1.68;
  const depth = kind === 'storage' ? 1.5 : 1.74;
  const wallHeight = kind === 'barn' ? 1.22 : 1.13;
  const slope = 0.52;
  return (
    <group name={`storybook-${kind}`}>
      <mesh position={[0, 0.095, 0]} receiveShadow castShadow>
        <boxGeometry args={[width + 0.14, 0.19, depth + 0.14]} />
        <Matte color="#dbd2bf" ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.2 + wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, wallHeight, depth]} />
        <Matte color={colors.wall} ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.28 + wallHeight / 2, -depth / 2 - 0.016]} castShadow>
        <boxGeometry args={[width - 0.12, wallHeight - 0.23, 0.045]} />
        <Matte color={colors.side} ghost={ghost} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * width * 0.225, wallHeight + 0.36, 0]} rotation={[0, 0, -side * slope]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.63, 0.16, depth + 0.25]} />
          <Matte color={colors.roof} ghost={ghost} />
        </mesh>
      ))}
      <mesh position={[0, wallHeight + 0.66, 0]} castShadow>
        <boxGeometry args={[0.13, 0.14, depth + 0.28]} />
        <Matte color={colors.trim} ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.58, depth / 2 + 0.038]} castShadow>
        <boxGeometry args={[kind === 'barn' ? 0.68 : 0.48, 0.78, 0.085]} />
        <Matte color={colors.door} ghost={ghost} />
      </mesh>
      <mesh position={[0.16, 0.6, depth / 2 + 0.092]}>
        <sphereGeometry args={[0.027, 8, 6]} />
        <Matte color="#e9d39c" ghost={ghost} />
      </mesh>
      {[-0.56, 0.56].map((x) => (
        <group key={x} position={[x, 0.98, depth / 2 + 0.043]}>
          <mesh castShadow>
            <boxGeometry args={[0.38, 0.4, 0.082]} />
            <Matte color={colors.trim} ghost={ghost} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.29, 0.31, 0.029]} />
            <Matte color="#b5d5c8" ghost={ghost} glow />
          </mesh>
          <mesh position={[0, 0, 0.072]}>
            <boxGeometry args={[0.033, 0.34, 0.022]} />
            <Matte color={colors.trim} ghost={ghost} />
          </mesh>
        </group>
      ))}
      {kind === 'home' && (
        <mesh position={[-width * 0.32, wallHeight + 0.72, -depth * 0.19]} castShadow>
          <boxGeometry args={[0.25, 0.6, 0.27]} />
          <Matte color="#d2b4a0" ghost={ghost} />
        </mesh>
      )}
      {tier >= 2 && (
        <group>
          <mesh position={[-width * 0.27, 0.24, depth * 0.75]} castShadow>
            <cylinderGeometry args={[0.21, 0.26, 0.33, 8]} />
            <Matte color="#d1b093" ghost={ghost} />
          </mesh>
          <mesh position={[-width * 0.27, 0.57, depth * 0.75]}>
            <sphereGeometry args={[0.3, 9, 7]} />
            <Matte color="#92b889" ghost={ghost} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function StorybookTree({ ghost }: { ghost: boolean }) {
  return (
    <group name="storybook-tree">
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.21, 1.44, 8]} />
        <Matte color="#9e7a60" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.88, 10, 8]} />
        <Matte color="#89b48a" ghost={ghost} />
      </mesh>
      <mesh position={[-0.25, 2.22, 0.18]} castShadow>
        <sphereGeometry args={[0.58, 9, 7]} />
        <Matte color="#b2d39d" ghost={ghost} />
      </mesh>
    </group>
  );
}

function StorybookGarden({ ghost }: { ghost: boolean }) {
  return (
    <group name="storybook-garden-patch">
      <mesh position={[0, 0.11, 0]} receiveShadow>
        <boxGeometry args={[1.53, 0.22, 1.33]} />
        <Matte color="#bc9878" ghost={ghost} />
      </mesh>
      {[-0.63, 0.63].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]} castShadow>
          <boxGeometry args={[0.11, 0.14, 1.46]} />
          <Matte color="#e5cba2" ghost={ghost} />
        </mesh>
      ))}
      {[-0.62, 0.62].map((z) => (
        <mesh key={z} position={[0, 0.25, z]} castShadow>
          <boxGeometry args={[1.37, 0.14, 0.11]} />
          <Matte color="#e5cba2" ghost={ghost} />
        </mesh>
      ))}
      {[-0.39, 0, 0.39].map((x) => [-0.34, 0.34].map((z) => (
        <group key={`${x}:${z}`} position={[x, 0.33, z]}>
          <mesh>
            <coneGeometry args={[0.17, 0.38, 6]} />
            <Matte color="#92b87f" ghost={ghost} />
          </mesh>
        </group>
      )))}
    </group>
  );
}

function StorybookFlowers({ ghost }: { ghost: boolean }) {
  return (
    <group name="storybook-flowers">
      {[
        [-0.38, -0.28, '#ebb3ab'],
        [0.38, -0.2, '#f5d8a2'],
        [-0.11, 0.25, '#d0b6d6'],
        [0.46, 0.34, '#eac4ad'],
        [-0.45, 0.38, '#f1c7bd'],
      ].map(([x, z, color], i) => (
        <group key={i} position={[Number(x), 0, Number(z)]}>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.025, 0.04, 0.34, 6]} />
            <Matte color="#84a87c" ghost={ghost} />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <Matte color={String(color)} ghost={ghost} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function StorybookPond({ ghost }: { ghost: boolean }) {
  return (
    <group name="storybook-pond">
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.33, 1, 1]} receiveShadow>
        <circleGeometry args={[0.8, 24]} />
        <Matte color="#e1cba9" ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.13, 0.83, 1]}>
        <circleGeometry args={[0.77, 24]} />
        <Matte color="#8ecad0" ghost={ghost} />
      </mesh>
      {[-0.34, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.13, x / 3]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 12]} />
          <Matte color="#9cbd89" ghost={ghost} />
        </mesh>
      ))}
    </group>
  );
}

export function HexStorybookBuildingModel({ buildingKey, ghost = false, selected = false, tier = 1 }: Props) {
  const scale = selected ? 1.035 : 1;
  return (
    <group scale={scale}>
      {buildingKey === 'home' || buildingKey === 'barn' || buildingKey === 'storage' || buildingKey === 'workshop'
        ? <Cottage kind={buildingKey} ghost={ghost} tier={tier} />
        : buildingKey === 'tree'
          ? <StorybookTree ghost={ghost} />
          : buildingKey === 'garden_patch'
            ? <StorybookGarden ghost={ghost} />
            : buildingKey === 'flower_patch'
              ? <StorybookFlowers ghost={ghost} />
              : buildingKey === 'pond'
                ? <StorybookPond ghost={ghost} />
                : <HexDecorModel buildingKey={buildingKey} ghost={ghost} selected={selected} />}
    </group>
  );
}
