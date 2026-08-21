"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProgressionFamilyFarmState } from '@/lib/family-farm-progression';
import { axialToWorld, hexKey, worldToAxial } from '@/lib/hex-world/hex-grid';
import { deterministicMotionPhase, resolveHexMotionProfile, type HexMotionProfile } from '@/lib/hex-world/motion';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';
import { hexRotationToRadians } from '@/lib/hex-world/rendering';
import type { HexCameraIntent } from '@/lib/hex-world/camera';
import type { HexBuildingDTO, HexCoord, HexExpansionDTO, HexExpansionPlacementPreview, HexRotation, HexWorldSnapshot } from '@/lib/hex-world/types';
import type { HexConfirmedVisualEvent } from '@/lib/hex-world/visual-events';
import { HexAmbientDecor } from './HexAmbientDecor';
import { HexBuildingModel } from './HexBuildingModels';
import { HexBuildings } from './HexBuildings';
import { HexDioramaCamera } from './HexDioramaCamera';
import { HexExpansionClusters } from './HexExpansionClusters';
import { HexIslandUnderside } from './HexIslandUnderside';
import { HexLivingWorldLayer } from './HexLivingWorldLayer';
import { HexPlacementEffects } from './HexPlacementEffects';
import { HexSelectionEffects } from './HexSelectionEffects';
import { HexSkyAtmosphere } from './HexSkyAtmosphere';
import { HexTileInstances } from './HexTileInstances';
import { HexWaterSurface } from './HexWaterSurface';
import { HexWorldLighting } from './HexWorldLighting';
import { HexWorldParticles } from './HexWorldParticles';
import { useReducedHexMotion } from './useReducedHexMotion';

export type HexBuildingPreview = { buildingKey: string; anchorQ: number; anchorR: number; rotation: HexRotation; valid: boolean };

type Props = {
  snapshot: HexWorldSnapshot;
  hoveredCoord?: HexCoord | null;
  selectedCoord?: HexCoord | null;
  selectedBuildingId?: string | null;
  validKeys?: Set<string>;
  invalidKeys?: Set<string>;
  invalidPulseNonce?: number;
  visualEvent?: HexConfirmedVisualEvent;
  expansionOptions?: HexExpansionDTO[];
  selectedExpansionKey?: string | null;
  expansionPlacementPreview?: HexExpansionPlacementPreview | null;
  newlyAddedKeys?: Set<string>;
  buildingPreview?: HexBuildingPreview | null;
  cameraIntent?: HexCameraIntent;
  resetNonce?: number;
  reframeCoords?: HexCoord[];
  graphicsQuality?: string;
  livingState?: ProgressionFamilyFarmState | null;
  onHoverTile?: (coord: HexCoord | null) => void;
  onSelectTile?: (coord: HexCoord) => void;
  onSelectBuilding?: (building: HexBuildingDTO | null) => void;
  onSelectExpansion?: (expansionKey: string) => void;
  onHoverExpansionAnchor?: (coord: HexCoord) => void;
  onSelectExpansionAnchor?: (coord: HexCoord) => void;
};

function FloatingFragments() {
  return <group>{[[-9, -2.4, 2, 0.7], [9, -3.1, 4, 0.55], [6, -2.2, -10, 0.45], [-6, -3.5, -9, 0.5]].map(([x, y, z, scale], index) => <mesh key={index} position={[x, y, z]} rotation={[0.2, index * 0.8, 0.12]} scale={scale} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#8e8877" roughness={1} /></mesh>)}</group>;
}

function AnimatedBuildingPreview({ preview, position, motionProfile }: { preview: HexBuildingPreview; position: { x: number; y: number; z: number }; motionProfile: HexMotionProfile }) {
  const ref = useRef<THREE.Group>(null);
  const phase = deterministicMotionPhase(`ghost:${preview.buildingKey}:${preview.anchorQ}:${preview.anchorR}`);
  useFrame(({ clock }) => {
    if (!ref.current || document.visibilityState === 'hidden') return;
    ref.current.position.y = position.y + Math.sin(clock.elapsedTime * 1.6 + phase) * 0.02 * motionProfile.ghostBobScale;
  });
  return <group ref={ref} position={[position.x, position.y, position.z]} rotation={[0, hexRotationToRadians(preview.rotation), 0]}><HexBuildingModel buildingKey={preview.buildingKey} ghost /></group>;
}

function ExpansionPlacementGhost({ preview }: { preview: HexExpansionPlacementPreview }) {
  const validExpansionColor = preview.valid ? '#e3b24a' : '#ef7567';
  return (
    <group>
      {preview.tiles.map((coord) => {
        const world = axialToWorld(coord, 1, 0.12);
        return (
          <mesh key={`expansion-ghost-${hexKey(coord)}`} position={[world.x, world.y, world.z]}>
            <cylinderGeometry args={[0.93, 0.93, 0.2, 6]} />
            <meshStandardMaterial color={validExpansionColor} transparent opacity={0.62} roughness={0.85} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function ExpansionPlacementPlane({ onHover, onSelect }: { onHover: (coord: HexCoord) => void; onSelect: (coord: HexCoord) => void }) {
  const coordFromEvent = (event: ThreeEvent<PointerEvent>) => worldToAxial(event.point.x, event.point.z);
  return (
    <mesh
      position={[0, 0.38, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={(event) => { event.stopPropagation(); onHover(coordFromEvent(event)); }}
      onClick={(event) => { event.stopPropagation(); onSelect(coordFromEvent(event)); }}
    >
      <planeGeometry args={[90, 90]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function HexWorld3D({ snapshot, ...props }: Props) {
  const [device, setDevice] = useState({ viewportWidth: 1280, devicePixelRatio: 1 });
  const reducedMotion = useReducedHexMotion();
  useEffect(() => {
    const update = () => setDevice({ viewportWidth: window.innerWidth, devicePixelRatio: window.devicePixelRatio || 1 });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const profile = resolveHexQualityProfile({ graphicsQuality: props.graphicsQuality ?? 'medium', viewportWidth: device.viewportWidth, devicePixelRatio: device.devicePixelRatio });
  const motionProfile = resolveHexMotionProfile({ quality: profile, reducedMotion });
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
        <HexSkyAtmosphere profile={profile} motionProfile={motionProfile} />
        <HexWorldLighting profile={profile} />
        <HexIslandUnderside tiles={snapshot.tiles} seed={snapshot.world.seed} />
        <FloatingFragments />
        <HexWorldParticles seed={snapshot.world.seed} profile={profile} motionProfile={motionProfile} />
        <HexPlacementEffects event={props.visualEvent ?? null} quality={profile} motionProfile={motionProfile} seed={snapshot.world.seed} />
        {!!props.expansionOptions?.length && !props.expansionPlacementPreview && <HexExpansionClusters expansions={props.expansionOptions} selectedKey={props.selectedExpansionKey} onSelect={(key) => props.onSelectExpansion?.(key)} />}
        <HexTileInstances tiles={snapshot.tiles} profile={profile} motionProfile={motionProfile} hoveredKey={hoveredKey} selectedKey={selectedKey} validKeys={props.validKeys} invalidKeys={props.invalidKeys} riseKeys={props.newlyAddedKeys} onHover={props.onHoverTile} onSelect={props.onSelectTile} />
        <HexSelectionEffects tiles={snapshot.tiles} selectedCoord={props.selectedCoord} validKeys={props.validKeys} invalidKeys={props.invalidKeys} motionProfile={motionProfile} invalidPulseNonce={props.invalidPulseNonce} />
        <HexWaterSurface tiles={snapshot.tiles} profile={profile} motionProfile={motionProfile} />
        <HexAmbientDecor tiles={snapshot.tiles} profile={profile} motionProfile={motionProfile} />
        <HexBuildings buildings={snapshot.buildings} tiles={snapshot.tiles} selectedBuildingId={props.selectedBuildingId} visualEvent={props.visualEvent ?? null} motionProfile={motionProfile} reducedMotion={reducedMotion} onSelect={(building) => props.onSelectBuilding?.(building)} />
        {props.livingState && <HexLivingWorldLayer state={props.livingState} buildings={snapshot.buildings} tiles={snapshot.tiles} />}
        {preview && previewPosition && <AnimatedBuildingPreview preview={preview} position={previewPosition} motionProfile={motionProfile} />}
        {props.expansionPlacementPreview && <ExpansionPlacementGhost preview={props.expansionPlacementPreview} />}
        {props.expansionPlacementPreview && props.onHoverExpansionAnchor && props.onSelectExpansionAnchor && <ExpansionPlacementPlane onHover={props.onHoverExpansionAnchor} onSelect={props.onSelectExpansionAnchor} />}
        <HexDioramaCamera tiles={snapshot.tiles} intent={cameraIntent} motionProfile={motionProfile} reducedMotion={reducedMotion} resetNonce={props.resetNonce ?? 0} reframeCoords={props.reframeCoords ?? []} />
      </Canvas>
    </div>
  );
}
