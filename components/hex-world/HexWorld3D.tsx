"use client";

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import { hexRotationToRadians } from '@/lib/hex-world/rendering';
import type { HexBuildingDTO, HexCoord, HexRotation, HexWorldSnapshot } from '@/lib/hex-world/types';
import { HexBuildingModel } from './HexBuildingModels';
import { HexBuildings } from './HexBuildings';
import { HexTileInstances } from './HexTileInstances';

export type HexBuildingPreview = {
  buildingKey: string;
  anchorQ: number;
  anchorR: number;
  rotation: HexRotation;
  valid: boolean;
};

type Props = {
  snapshot: HexWorldSnapshot;
  hoveredCoord?: HexCoord | null;
  selectedCoord?: HexCoord | null;
  selectedBuildingId?: string | null;
  validKeys?: Set<string>;
  invalidKeys?: Set<string>;
  expansionPreviewKeys?: Set<string>;
  buildingPreview?: HexBuildingPreview | null;
  onHoverTile?: (coord: HexCoord | null) => void;
  onSelectTile?: (coord: HexCoord) => void;
  onSelectBuilding?: (building: HexBuildingDTO | null) => void;
};

function CloudField() {
  const clouds = [
    [-9, -4.2, -8, 3.4], [-2, -5.1, -11, 4.1], [8, -4.7, -7, 3.6],
    [11, -5.4, 3, 4.5], [5, -4.4, 11, 3.1], [-6, -5.2, 10, 4.2], [-12, -4.8, 2, 3.7],
  ] as const;
  return <group>{clouds.map(([x, y, z, scale], index) => <mesh key={index} position={[x, y, z]} scale={[scale, scale * 0.42, scale * 0.72]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#f8fbf7" transparent opacity={0.58} roughness={1} depthWrite={false} /></mesh>)}</group>;
}

function FloatingFragments() {
  return <group>{[
    [-9, -2.4, 2, 0.7], [9, -3.1, 4, 0.55], [6, -2.2, -10, 0.45], [-6, -3.5, -9, 0.5],
  ].map(([x, y, z, scale], index) => <mesh key={index} position={[x, y, z]} rotation={[0.2, index * 0.8, 0.12]} scale={scale} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#8e8877" roughness={1} /></mesh>)}</group>;
}

export function HexWorld3D({ snapshot, ...props }: Props) {
  const tileHeight = new Map(snapshot.tiles.map((tile) => [hexKey(tile), tile.height]));
  const hoveredKey = props.hoveredCoord ? hexKey(props.hoveredCoord) : null;
  const selectedKey = props.selectedCoord ? hexKey(props.selectedCoord) : null;
  const preview = props.buildingPreview;
  const previewHeight = preview ? (tileHeight.get(`${preview.anchorQ}:${preview.anchorR}`) ?? 0) : 0;
  const previewPosition = preview ? axialToWorld({ q: preview.anchorQ, r: preview.anchorR }, 1, previewHeight + 0.03) : null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-100 via-[#edf6e9] to-[#d7ead6]">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [17, 18, 22], fov: 42, near: 0.1, far: 120 }}
        onPointerMissed={() => props.onSelectBuilding?.(null)}
      >
        <color attach="background" args={['#dfeff0']} />
        <fog attach="fog" args={['#dfeff0', 28, 62]} />
        <hemisphereLight intensity={1.05} color="#fff7df" groundColor="#78946f" />
        <directionalLight position={[10, 20, 8]} intensity={2.2} color="#fff0ce" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} />
        <ambientLight intensity={0.35} />

        <CloudField />
        <FloatingFragments />
        <HexTileInstances
          tiles={snapshot.tiles}
          hoveredKey={hoveredKey}
          selectedKey={selectedKey}
          validKeys={props.validKeys}
          invalidKeys={props.invalidKeys}
          expansionKeys={props.expansionPreviewKeys}
          onHover={props.onHoverTile}
          onSelect={props.onSelectTile}
        />
        <HexBuildings buildings={snapshot.buildings} tiles={snapshot.tiles} selectedBuildingId={props.selectedBuildingId} onSelect={(building) => props.onSelectBuilding?.(building)} />
        {preview && previewPosition && (
          <group position={[previewPosition.x, previewPosition.y, previewPosition.z]} rotation={[0, hexRotationToRadians(preview.rotation), 0]}>
            <HexBuildingModel buildingKey={preview.buildingKey} ghost />
          </group>
        )}
        <ContactShadows position={[0, -0.55, 0]} opacity={0.2} scale={38} blur={2.8} far={12} resolution={512} />
        <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.07} minDistance={12} maxDistance={40} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 2.35} enablePan={false} />
      </Canvas>
    </div>
  );
}
