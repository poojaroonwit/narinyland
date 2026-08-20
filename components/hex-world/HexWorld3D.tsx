"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld, hexKey } from '@/lib/hex-world/hex-grid';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';
import { hexRotationToRadians, HEX_TILE_DEPTH } from '@/lib/hex-world/rendering';
import type { HexCameraIntent } from '@/lib/hex-world/camera';
import type { HexBuildingDTO, HexCoord, HexRotation, HexWorldSnapshot } from '@/lib/hex-world/types';
import { HexAmbientDecor } from './HexAmbientDecor';
import { HexBuildingModel } from './HexBuildingModels';
import { HexBuildings } from './HexBuildings';
import { HexDioramaCamera } from './HexDioramaCamera';
import { HexIslandUnderside } from './HexIslandUnderside';
import { HexSelectionEffects } from './HexSelectionEffects';
import { HexSkyAtmosphere } from './HexSkyAtmosphere';
import { HexTileInstances } from './HexTileInstances';
import { HexWaterSurface } from './HexWaterSurface';
import { HexWorldLighting } from './HexWorldLighting';
import { HexWorldParticles } from './HexWorldParticles';

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
  expansionPreviewTiles?: HexCoord[];
  newlyAddedKeys?: Set<string>;
  buildingPreview?: HexBuildingPreview | null;
  cameraIntent?: HexCameraIntent;
  resetNonce?: number;
  reframeCoords?: HexCoord[];
  graphicsQuality?: string;
  onHoverTile?: (coord: HexCoord | null) => void;
  onSelectTile?: (coord: HexCoord) => void;
  onSelectBuilding?: (building: HexBuildingDTO | null) => void;
};

function FloatingFragments() {
  return <group>{[
    [-9, -2.4, 2, 0.7], [9, -3.1, 4, 0.55], [6, -2.2, -10, 0.45], [-6, -3.5, -9, 0.5],
  ].map(([x, y, z, scale], index) => <mesh key={index} position={[x, y, z]} rotation={[0.2, index * 0.8, 0.12]} scale={scale} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#8e8877" roughness={1} /></mesh>)}</group>;
}

function HexExpansionPreviewInstances({ tiles }: { tiles: HexCoord[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    tiles.forEach((tile, index) => {
      const position = axialToWorld(tile, 1, -0.08);
      dummy.position.set(position.x, position.y - HEX_TILE_DEPTH / 2, position.z);
      dummy.rotation.set(0, Math.PI / 6, 0);
      dummy.scale.set(0.94, 0.52, 0.94);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, tiles]);

  if (tiles.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, tiles.length]}>
      <cylinderGeometry args={[1, 1, HEX_TILE_DEPTH, 6]} />
      <meshStandardMaterial color="#e4b45d" transparent opacity={0.55} roughness={0.86} depthWrite={false} />
    </instancedMesh>
  );
}

export function HexWorld3D({ snapshot, ...props }: Props) {
  const [device, setDevice] = useState({ viewportWidth: 1280, devicePixelRatio: 1 });
  useEffect(() => {
    const update = () => setDevice({ viewportWidth: window.innerWidth, devicePixelRatio: window.devicePixelRatio || 1 });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const profile = resolveHexQualityProfile({
    graphicsQuality: props.graphicsQuality ?? 'medium',
    viewportWidth: device.viewportWidth,
    devicePixelRatio: device.devicePixelRatio,
  });
  const tileHeight = new Map(snapshot.tiles.map((tile) => [hexKey(tile), tile.height]));
  const hoveredKey = props.hoveredCoord ? hexKey(props.hoveredCoord) : null;
  const selectedKey = props.selectedCoord ? hexKey(props.selectedCoord) : null;
  const preview = props.buildingPreview;
  const previewHeight = preview ? (tileHeight.get(`${preview.anchorQ}:${preview.anchorR}`) ?? 0) : 0;
  const previewPosition = preview ? axialToWorld({ q: preview.anchorQ, r: preview.anchorR }, 1, previewHeight + 0.03) : null;
  const cameraIntent = props.cameraIntent ?? ({ kind: 'overview' } as const);

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-100 via-[#edf6e9] to-[#d7ead6]">
      <Canvas shadows dpr={[1, profile.maxDpr]} camera={{ fov: 42, near: 0.1, far: 160 }} onPointerMissed={() => props.onSelectBuilding?.(null)}>
        <HexSkyAtmosphere profile={profile} />
        <HexWorldLighting profile={profile} />
        <HexIslandUnderside tiles={snapshot.tiles} seed={snapshot.world.seed} />
        <FloatingFragments />
        <HexWorldParticles seed={snapshot.world.seed} profile={profile} />
        <HexExpansionPreviewInstances tiles={props.expansionPreviewTiles ?? []} />
        <HexTileInstances
          tiles={snapshot.tiles}
          hoveredKey={hoveredKey}
          selectedKey={selectedKey}
          validKeys={props.validKeys}
          invalidKeys={props.invalidKeys}
          riseKeys={props.newlyAddedKeys}
          onHover={props.onHoverTile}
          onSelect={props.onSelectTile}
        />
        <HexSelectionEffects tiles={snapshot.tiles} selectedCoord={props.selectedCoord} validKeys={props.validKeys} invalidKeys={props.invalidKeys} />
        <HexWaterSurface tiles={snapshot.tiles} profile={profile} />
        <HexAmbientDecor tiles={snapshot.tiles} />
        <HexBuildings buildings={snapshot.buildings} tiles={snapshot.tiles} selectedBuildingId={props.selectedBuildingId} onSelect={(building) => props.onSelectBuilding?.(building)} />
        {preview && previewPosition && (
          <group position={[previewPosition.x, previewPosition.y, previewPosition.z]} rotation={[0, hexRotationToRadians(preview.rotation), 0]}>
            <HexBuildingModel buildingKey={preview.buildingKey} ghost />
          </group>
        )}
        <HexDioramaCamera
          tiles={snapshot.tiles}
          intent={cameraIntent}
          resetNonce={props.resetNonce ?? 0}
          reframeCoords={props.reframeCoords ?? []}
        />
      </Canvas>
    </div>
  );
}
