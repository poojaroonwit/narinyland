"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getOpenWorldBiome,
  getOpenWorldChunkDecor,
  getOpenWorldVisibleChunks,
  OPEN_WORLD_CHUNK_SIZE,
  OPEN_WORLD_GRID_STEP,
  OPEN_WORLD_LANDMARKS,
  sampleOpenWorldHeight,
  type OpenWorldChunkKey,
  type OpenWorldDecor,
} from '@/lib/open-world/terrain';
import { HexStorybookBuildingModel } from '@/components/hex-world/storybook/HexStorybookBuildingModels';
import { OpenWorldPlayerController } from './OpenWorldPlayerController';
import type { HexExploreMovementInput } from '@/lib/hex-world/explore-movement-input';

const LANDSCAPE_PALETTE = {
  village: '#b3c99a',
  meadow: '#9ec79a',
  forest: '#83af85',
  lakeshore: '#d6cda4',
  highlands: '#b5c5a6',
} as const;

function ChunkGround({ chunk }: { chunk: OpenWorldChunkKey }) {
  const geometry = useMemo(() => {
    const segments = OPEN_WORLD_CHUNK_SIZE / OPEN_WORLD_GRID_STEP;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const palette = new THREE.Color();
    for (let z = 0; z <= segments; z += 1) {
      for (let x = 0; x <= segments; x += 1) {
        const px = chunk.x * OPEN_WORLD_CHUNK_SIZE + x * OPEN_WORLD_GRID_STEP;
        const pz = chunk.z * OPEN_WORLD_CHUNK_SIZE + z * OPEN_WORLD_GRID_STEP;
        positions.push(px, sampleOpenWorldHeight(px, pz), pz);
        palette.set(LANDSCAPE_PALETTE[getOpenWorldBiome(px, pz)]);
        // Subtle color changes, no bitmap/photo textures.
        const shade = Math.sin(px * 0.37 + pz * 0.28) * 0.045;
        colors.push(Math.min(1, palette.r + shade), Math.min(1, palette.g + shade), Math.min(1, palette.b + shade));
      }
    }
    for (let z = 0; z < segments; z += 1) {
      for (let x = 0; x < segments; x += 1) {
        const a = z * (segments + 1) + x;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    next.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    next.setIndex(indices);
    next.computeVertexNormals();
    next.computeBoundingSphere();
    return next;
  }, [chunk.x, chunk.z]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh name={`open-world-chunk-${chunk.key}`} geometry={geometry} receiveShadow raycast={() => {}}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

type DecorKind = OpenWorldDecor['kind'];

function DecorInstances({ placements, kind }: { placements: OpenWorldDecor[]; kind: DecorKind }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    placements.forEach((placement, i) => {
      const size = placement.scale;
      dummy.rotation.set(0, placement.angle, 0);
      if (kind === 'tree') {
        dummy.position.set(placement.x, placement.y + size * 1.0, placement.z);
        dummy.scale.set(size * 0.14, size * 0.82, size * 0.14);
        dummy.updateMatrix();
        trunkRef.current?.setMatrixAt(i, dummy.matrix);
        dummy.position.set(placement.x, placement.y + size * 2.1, placement.z);
        dummy.scale.set(size * 0.85, size * 1.05, size * 0.85);
      } else if (kind === 'bush') {
        dummy.position.set(placement.x, placement.y + 0.38 * size, placement.z);
        dummy.scale.set(size * 0.76, size * 0.5, size * 0.74);
      } else if (kind === 'flower') {
        dummy.position.set(placement.x, placement.y + 0.22 * size, placement.z);
        dummy.scale.set(size * 0.18, size * 0.26, size * 0.18);
      } else {
        dummy.position.set(placement.x, placement.y + 0.25 * size, placement.z);
        dummy.scale.set(size * 0.55, size * 0.34, size * 0.48);
      }
      dummy.updateMatrix();
      canopyRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (canopyRef.current) canopyRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy, kind, placements]);

  if (!placements.length) return null;
  return (
    <group name={`storybook-${kind}-instances`}>
      {kind === 'tree' && (
        <instancedMesh ref={trunkRef} args={[undefined, undefined, placements.length]} castShadow raycast={() => {}}>
          <cylinderGeometry args={[1, 1.3, 2, 7]} />
          <meshStandardMaterial color="#96785e" roughness={1} flatShading />
        </instancedMesh>
      )}
      <instancedMesh ref={canopyRef} args={[undefined, undefined, placements.length]} castShadow={kind !== 'flower'} receiveShadow raycast={() => {}}>
        {kind === 'flower'
          ? <dodecahedronGeometry args={[1, 0]} />
          : kind === 'rock'
            ? <dodecahedronGeometry args={[1, 0]} />
            : <icosahedronGeometry args={[1, 1]} />}
        <meshStandardMaterial color={kind === 'tree' ? '#91b88e' : kind === 'bush' ? '#a9c59a' : kind === 'flower' ? '#eab4b0' : '#c9c8b4'} roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}

function ChunkDecor({ chunk }: { chunk: OpenWorldChunkKey }) {
  const placements = useMemo(() => getOpenWorldChunkDecor(chunk.x, chunk.z), [chunk.x, chunk.z]);
  const byKind = useMemo(() => ({
    tree: placements.filter((p) => p.kind === 'tree'),
    bush: placements.filter((p) => p.kind === 'bush'),
    flower: placements.filter((p) => p.kind === 'flower'),
    rock: placements.filter((p) => p.kind === 'rock'),
  }), [placements]);

  return (
    <group>
      <DecorInstances kind="tree" placements={byKind.tree} />
      <DecorInstances kind="bush" placements={byKind.bush} />
      <DecorInstances kind="flower" placements={byKind.flower} />
      <DecorInstances kind="rock" placements={byKind.rock} />
    </group>
  );
}

function Village() {
  const homes = [
    { x: -7, z: 2, kind: 'home' as const, yaw: 0.3 },
    { x: 7, z: 3, kind: 'workshop' as const, yaw: -0.6 },
    { x: 0, z: -8, kind: 'barn' as const, yaw: Math.PI },
  ];
  return (
    <group name="willow-commons-village">
      {homes.map((home) => (
        <group key={home.kind} position={[home.x, sampleOpenWorldHeight(home.x, home.z), home.z]} rotation={[0, home.yaw, 0]}>
          <HexStorybookBuildingModel buildingKey={home.kind} />
        </group>
      ))}
      <group position={[1, sampleOpenWorldHeight(1, 7), 7]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.32, 1.2, 9]} />
          <meshStandardMaterial color="#d7c2a0" roughness={1} />
        </mesh>
        <mesh position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.33, 10, 8]} />
          <meshStandardMaterial color="#f7dfaf" emissive="#e9c484" emissiveIntensity={0.36} />
        </mesh>
      </group>
    </group>
  );
}

function WorldLandmarks() {
  return (
    <group name="open-world-landmarks">
      {OPEN_WORLD_LANDMARKS.filter((site) => site.id !== 'commons').map((site) => (
        <group key={site.id} position={[site.x, sampleOpenWorldHeight(site.x, site.z), site.z]}>
          <mesh position={[0, 0.68, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.18, 1.36, 7]} />
            <meshStandardMaterial color="#9f7c61" roughness={1} />
          </mesh>
          <mesh position={[0, 1.48, 0]} castShadow>
            <octahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color={site.kind === 'forest' ? '#b3d1a2' : site.kind === 'lake' ? '#a5d4d9' : '#e6d09d'} flatShading roughness={0.85} emissive="#d1bf94" emissiveIntensity={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MoonpetalLake() {
  // Basin geometry is lowered in the deterministic terrain height function.
  return (
    <mesh position={[-48, -1.03, -32]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
      <circleGeometry args={[12.5, 48]} />
      <meshStandardMaterial color="#a2d1d0" roughness={0.65} metalness={0} transparent opacity={0.88} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function OpenWorldScene({ chunkCenter, movementInputRef, resetNonce, onPlayerMove }: {
  chunkCenter: { x: number; z: number };
  movementInputRef: React.MutableRefObject<HexExploreMovementInput>;
  resetNonce: number;
  onPlayerMove: (position: { x: number; z: number }) => void;
}) {
  const chunks = useMemo(
    () => getOpenWorldVisibleChunks(chunkCenter.x, chunkCenter.z),
    [chunkCenter.x, chunkCenter.z],
  );
  // These chunks are only display data, not network-fetched authoritative Land tiles.
  return (
    <Canvas shadows="soft" dpr={[1, 1.5]} camera={{ fov: 60, near: 0.1, far: 190, position: [4, 3, 7] }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#f0ece3']} />
      <fog attach="fog" args={['#f0ece3', 45, 110]} />
      <hemisphereLight intensity={1.6} color="#f8f4e5" groundColor="#94aa88" />
      <ambientLight intensity={0.25} color="#fff6e7" />
      <directionalLight position={[18, 27, 12]} intensity={2} color="#fff0d5" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} />
      {chunks.map((chunk) => <group key={chunk.key}>
        <ChunkGround chunk={chunk} />
        <ChunkDecor chunk={chunk} />
      </group>)}
      <MoonpetalLake />
      <Village />
      <WorldLandmarks />
      <OpenWorldPlayerController resetNonce={resetNonce} movementInputRef={movementInputRef} onMove={onPlayerMove} />
    </Canvas>
  );
}
