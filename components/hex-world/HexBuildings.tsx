"use client";

import React, { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { expSmoothingAlpha, type HexMotionProfile } from '@/lib/hex-world/motion';
import { hexRotationToRadians } from '@/lib/hex-world/rendering';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import type { HexConfirmedVisualEvent } from '@/lib/hex-world/visual-events';
import { HexBuildingModel } from './HexBuildingModels';

function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function AnimatedHexBuilding({ building, height, selected, visualEvent, motionProfile, reducedMotion, onSelect }: {
  building: HexBuildingDTO;
  height: number;
  selected: boolean;
  visualEvent: HexConfirmedVisualEvent;
  motionProfile: HexMotionProfile;
  reducedMotion: boolean;
  onSelect?: (building: HexBuildingDTO) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const initializedRef = useRef(false);
  const lastEventNonce = useRef<number | null>(null);
  const target = axialToWorld({ q: building.anchorQ, r: building.anchorR }, 1, height + 0.02);
  const targetYaw = hexRotationToRadians(building.rotation);

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    if (!initializedRef.current) {
      group.position.set(target.x, target.y, target.z);
      group.rotation.set(0, targetYaw, 0);
      group.scale.setScalar(1);
      initializedRef.current = true;
    }
    const confirmed = visualEvent && 'buildingId' in visualEvent && visualEvent.buildingId === building.id ? visualEvent : null;
    if (!confirmed || confirmed.nonce === lastEventNonce.current) return;
    if (!reducedMotion && confirmed.kind === 'placed') group.position.y = target.y + 0.65;
    if (!reducedMotion && confirmed.kind === 'moved') group.position.y = target.y + 0.25;
    lastEventNonce.current = confirmed.nonce;
  }, [building.id, reducedMotion, target.x, target.y, target.z, targetYaw, visualEvent]);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const selectAlpha = expSmoothingAlpha(delta, motionProfile.selectResponse);
    const settleAlpha = expSmoothingAlpha(delta, Math.max(6, 2400 / Math.max(80, motionProfile.placementDurationMs)));
    const rotateAlpha = expSmoothingAlpha(delta, Math.max(7, 2400 / Math.max(80, motionProfile.rotationDurationMs)));
    group.position.x = THREE.MathUtils.lerp(group.position.x, target.x, selectAlpha);
    group.position.z = THREE.MathUtils.lerp(group.position.z, target.z, selectAlpha);
    group.position.y = THREE.MathUtils.lerp(group.position.y, target.y + (selected ? 0.04 : 0), settleAlpha);
    const scale = THREE.MathUtils.lerp(group.scale.x, selected ? 1.035 : 1, selectAlpha);
    group.scale.setScalar(scale);
    group.rotation.y += angleDelta(group.rotation.y, targetYaw) * rotateAlpha;
  });

  return <group ref={ref} onClick={(event) => { event.stopPropagation(); onSelect?.(building); }}><HexBuildingModel buildingKey={building.buildingKey} selected={selected} /></group>;
}

export function HexBuildings({ buildings, tiles, selectedBuildingId, visualEvent = null, motionProfile, reducedMotion, onSelect }: {
  buildings: HexBuildingDTO[];
  tiles: HexTileDTO[];
  selectedBuildingId?: string | null;
  visualEvent?: HexConfirmedVisualEvent;
  motionProfile: HexMotionProfile;
  reducedMotion: boolean;
  onSelect?: (building: HexBuildingDTO) => void;
}) {
  const tileHeight = new Map(tiles.map((tile) => [`${tile.q}:${tile.r}`, tile.height]));
  return <>{buildings.map((building) => <AnimatedHexBuilding key={building.id} building={building} height={tileHeight.get(`${building.anchorQ}:${building.anchorR}`) ?? 0} selected={selectedBuildingId === building.id} visualEvent={visualEvent} motionProfile={motionProfile} reducedMotion={reducedMotion} onSelect={onSelect} />)}</>;
}
