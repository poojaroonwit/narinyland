"use client";

import React, { useEffect, useRef, useState } from 'react';
import { PerformanceMonitor, Preload } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HomesteadLifeState } from '@/lib/homestead-life-engine';
import type { HexExploreInteractionTarget, HexResidentInteractionSample } from '@/lib/hex-world/explore-interactions';
import type { HexExploreMovementInput } from '@/lib/hex-world/explore-movement-input';
import { axialToWorld, hexKey, worldToAxial } from '@/lib/hex-world/hex-grid';
import { deterministicMotionPhase, resolveHexMotionProfile, type HexMotionProfile } from '@/lib/hex-world/motion';
import { resolveAdaptiveHexQuality, resolveHexQualityProfile } from '@/lib/hex-world/quality';
import { hexRotationToRadians } from '@/lib/hex-world/rendering';
import type { HexCameraIntent } from '@/lib/hex-world/camera';
import type { HexBuildingDTO, HexCoord, HexExpansionDTO, HexExpansionPlacementPreview, HexRotation, HexWorldSnapshot } from '@/lib/hex-world/types';
import type { HexViewMode } from '@/lib/hex-world/view-mode';
import type { HexConfirmedVisualEvent } from '@/lib/hex-world/visual-events';
import { getHexVisualEnvironment, HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';
import { HexBuildingModel } from './HexBuildingModels';
import { HexBuildings } from './HexBuildings';
import { HexCropEnhancements } from './HexCropEnhancements';
import { HexDioramaCamera } from './HexDioramaCamera';
import { HexExploreAtmosphere } from './HexExploreAtmosphere';
import { HexExploreEnvironmentLayer } from './HexExploreEnvironmentLayer';
import { HexExploreGroundLayer } from './HexExploreGroundLayer';
import { HexExploreStructureDetails } from './HexExploreStructureDetails';
import { HexLivingWorldLayer } from './HexLivingWorldLayer';
import { HexPlacementEffects } from './HexPlacementEffects';
import { HexPlayerController } from './HexPlayerController';
import { HexResidentInteractionReporter } from './HexResidentInteractionReporter';
import { HexSelectionEffects } from './HexSelectionEffects';
import { HexSkyAtmosphere } from './HexSkyAtmosphere';
import { HexTileInstances } from './HexTileInstances';
import { HexWaterSurface } from './HexWaterSurface';
import { HexWorldLighting } from './HexWorldLighting';
import { HexWorldParticles } from './HexWorldParticles';
import { HexPBRCliff } from './pbr/HexPBRCliff';
import { HexPBRTerrain } from './pbr/HexPBRTerrain';
import { HexPBRVegetation } from './pbr/HexPBRVegetation';
import { HexBuildGridOverlay } from './terrain/HexBuildGridOverlay';
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
  viewMode?: HexViewMode;
  resetNonce?: number;
  reframeCoords?: HexCoord[];
  graphicsQuality?: string;
  livingState?: HomesteadLifeState | null;
  movementInputRef?: React.MutableRefObject<HexExploreMovementInput>;
  movementSuspended?: boolean;
  residentSamples?: HexResidentInteractionSample[];
  onResidentSamplesChange?: (samples: HexResidentInteractionSample[]) => void;
  onInteractionTargetChange?: (target: HexExploreInteractionTarget | null) => void;
  onHoverTile?: (coord: HexCoord | null) => void;
  onSelectTile?: (coord: HexCoord) => void;
  onSelectBuilding?: (building: HexBuildingDTO | null) => void;
  onSelectExpansion?: (expansionKey: string) => void;
  onHoverExpansionAnchor?: (coord: HexCoord) => void;
  onSelectExpansionAnchor?: (coord: HexCoord) => void;
};

function FloatingFragments() {
  return <group>{[[-9,-2.4,2,0.7],[9,-3.1,4,0.55],[6,-2.2,-10,0.45],[-6,-3.5,-9,0.5]].map(([x,y,z,scale], index) => <mesh key={index} position={[x,y,z]} rotation={[0.2,index*0.8,0.12]} scale={scale} castShadow raycast={() => {}}><icosahedronGeometry args={[1,0]} /><meshStandardMaterial color={HEX_VISUAL_THEME.terrain.cliffRock} roughness={1} /></mesh>)}</group>;
}
function AnimatedBuildingPreview({ preview, position, motionProfile }: { preview: HexBuildingPreview; position: { x:number;y:number;z:number }; motionProfile: HexMotionProfile }) {
  const ref=useRef<THREE.Group>(null); const phase=deterministicMotionPhase(`ghost:${preview.buildingKey}:${preview.anchorQ}:${preview.anchorR}`);
  useFrame(({clock})=>{ if(!ref.current||document.visibilityState==='hidden')return; ref.current.position.y=position.y+Math.sin(clock.elapsedTime*1.6+phase)*0.02*motionProfile.ghostBobScale; });
  return <group ref={ref} position={[position.x,position.y,position.z]} rotation={[0,hexRotationToRadians(preview.rotation),0]}><HexBuildingModel buildingKey={preview.buildingKey} ghost /></group>;
}
function ExpansionPlacementGhost({ preview }: { preview: HexExpansionPlacementPreview }) { const color=preview.valid?'#e3b24a':'#ef7567'; return <group>{preview.tiles.map((coord)=>{const world=axialToWorld(coord,1,0.12);return <mesh key={`expansion-ghost-${hexKey(coord)}`} position={[world.x,world.y,world.z]}><cylinderGeometry args={[0.93,0.93,0.2,6]} /><meshStandardMaterial color={color} transparent opacity={0.3} roughness={0.85} depthWrite={false} /></mesh>;})}</group>; }
function ExpansionPlacementPlane({ onHover,onSelect }: { onHover:(coord:HexCoord)=>void;onSelect:(coord:HexCoord)=>void }) { const coordFromPoint=(point:THREE.Vector3)=>worldToAxial(point.x,point.z); return <mesh position={[0,0.38,0]} rotation={[-Math.PI/2,0,0]} onPointerMove={(event)=>{event.stopPropagation();onHover(coordFromPoint(event.point));}} onClick={(event)=>{event.stopPropagation();onSelect(coordFromPoint(event.point));}}><planeGeometry args={[90,90]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>; }

export function HexWorld3D({ snapshot, ...props }: Props) {
  const [device,setDevice]=useState({viewportWidth:1280,devicePixelRatio:1});
  const [performanceFactor,setPerformanceFactor]=useState(1);
  const reducedMotion=useReducedHexMotion();
  useEffect(()=>{const update=()=>setDevice({viewportWidth:window.innerWidth,devicePixelRatio:window.devicePixelRatio||1});update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
  const staticProfile=resolveHexQualityProfile({graphicsQuality:props.graphicsQuality??'medium',viewportWidth:device.viewportWidth,devicePixelRatio:device.devicePixelRatio});
  const profile=resolveAdaptiveHexQuality(staticProfile,performanceFactor);
  const motionProfile=resolveHexMotionProfile({quality:profile,reducedMotion});
  const visualEnvironment=getHexVisualEnvironment({season:props.livingState?.season,weather:props.livingState?.weather,timeMinutes:props.livingState?.timeMinutes});
  const tileHeight=new Map(snapshot.tiles.map((tile)=>[hexKey(tile),tile.height])); const hoveredKey=props.hoveredCoord?hexKey(props.hoveredCoord):null; const selectedKey=props.selectedCoord?hexKey(props.selectedCoord):null;
  const preview=props.buildingPreview; const previewHeight=preview?(tileHeight.get(`${preview.anchorQ}:${preview.anchorR}`)??0):0; const previewPosition=preview?axialToWorld({q:preview.anchorQ,r:preview.anchorR},1,previewHeight+0.03):null;
  const cameraIntent=props.cameraIntent??({kind:'overview'} as const); const viewMode=props.viewMode??'world'; const residentSamples=props.residentSamples??[];
  const showBuildGrid=!!preview||!!props.validKeys?.size||!!props.invalidKeys?.size||!!props.expansionPlacementPreview;
  return <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-100 via-[#edf6e9] to-[#d7ead6]">
    <Canvas shadows="soft" gl={{antialias:true,powerPreference:'high-performance'}} dpr={[1,profile.maxDpr]} camera={{fov:42,near:0.1,far:160}} onPointerMissed={()=>props.onSelectBuilding?.(null)}>
      <PerformanceMonitor onChange={({factor})=>setPerformanceFactor((previous)=>resolveAdaptiveHexQuality(staticProfile,previous).name===resolveAdaptiveHexQuality(staticProfile,factor).name?previous:factor)} />
      <HexSkyAtmosphere profile={profile} motionProfile={motionProfile} environment={visualEnvironment} /><HexWorldLighting profile={profile} motionProfile={motionProfile} environment={visualEnvironment} viewMode={viewMode} />
      {viewMode==='person'&&<HexExploreAtmosphere profile={profile} environment={visualEnvironment} />}
      <HexPBRCliff tiles={snapshot.tiles} seed={snapshot.world.seed} profile={profile} />
      <FloatingFragments />
      <HexWorldParticles seed={snapshot.world.seed} profile={profile} motionProfile={motionProfile} /><HexPlacementEffects event={props.visualEvent??null} quality={profile} motionProfile={motionProfile} seed={snapshot.world.seed} />
      <HexPBRTerrain tiles={snapshot.tiles} seed={snapshot.world.seed} profile={profile} />
      <HexTileInstances tiles={snapshot.tiles} profile={profile} motionProfile={motionProfile} presentation="proxy" hoveredKey={hoveredKey} selectedKey={selectedKey} validKeys={props.validKeys} invalidKeys={props.invalidKeys} riseKeys={props.newlyAddedKeys} onHover={props.onHoverTile} onSelect={props.onSelectTile} />
      {showBuildGrid&&<HexBuildGridOverlay tiles={snapshot.tiles} validKeys={props.validKeys} invalidKeys={props.invalidKeys} expansionPlacementPreview={props.expansionPlacementPreview} />}
      <HexSelectionEffects tiles={snapshot.tiles} selectedCoord={props.selectedCoord} validKeys={props.validKeys} invalidKeys={props.invalidKeys} motionProfile={motionProfile} invalidPulseNonce={props.invalidPulseNonce} />
      <HexWaterSurface tiles={snapshot.tiles} profile={profile} motionProfile={motionProfile} />
      <HexPBRVegetation tiles={snapshot.tiles} buildings={snapshot.buildings} seed={snapshot.world.seed} profile={profile} motionProfile={motionProfile} />
      {viewMode==='person'&&<><HexExploreGroundLayer tiles={snapshot.tiles} seed={snapshot.world.seed} profile={profile} /><HexExploreEnvironmentLayer tiles={snapshot.tiles} seed={snapshot.world.seed} profile={profile} reducedMotion={reducedMotion} /><HexExploreStructureDetails buildings={snapshot.buildings} tiles={snapshot.tiles} profile={profile} /></>}
      <HexBuildings buildings={snapshot.buildings} tiles={snapshot.tiles} buildingTiers={props.livingState?.buildingTiers} selectedBuildingId={props.selectedBuildingId} visualEvent={props.visualEvent??null} motionProfile={motionProfile} reducedMotion={reducedMotion} onSelect={(building)=>props.onSelectBuilding?.(building)} />
      {props.livingState&&<HexLivingWorldLayer state={props.livingState} buildings={snapshot.buildings} tiles={snapshot.tiles} />}
      {viewMode==='person'&&props.livingState&&props.onResidentSamplesChange&&<HexResidentInteractionReporter state={props.livingState} buildings={snapshot.buildings} tiles={snapshot.tiles} reducedMotion={reducedMotion} onResidentSamplesChange={props.onResidentSamplesChange} />}
      {props.livingState&&<HexCropEnhancements state={props.livingState} buildings={snapshot.buildings} tiles={snapshot.tiles} reducedMotion={reducedMotion} />}
      {preview&&previewPosition&&<AnimatedBuildingPreview preview={preview} position={previewPosition} motionProfile={motionProfile} />}{props.expansionPlacementPreview&&<ExpansionPlacementGhost preview={props.expansionPlacementPreview} />}
      {props.expansionPlacementPreview&&props.onHoverExpansionAnchor&&props.onSelectExpansionAnchor&&<ExpansionPlacementPlane onHover={props.onHoverExpansionAnchor} onSelect={props.onSelectExpansionAnchor} />}
      {viewMode==='person'?<HexPlayerController tiles={snapshot.tiles} buildings={snapshot.buildings} residentSamples={residentSamples} reducedMotion={reducedMotion} resetNonce={props.resetNonce??0} movementInputRef={props.movementInputRef} movementSuspended={props.movementSuspended} onInteractionTargetChange={props.onInteractionTargetChange} />:<HexDioramaCamera tiles={snapshot.tiles} intent={cameraIntent} motionProfile={motionProfile} reducedMotion={reducedMotion} resetNonce={props.resetNonce??0} reframeCoords={props.reframeCoords??[]} />}
      <Preload all />
    </Canvas>
  </div>;
}
