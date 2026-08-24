"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getBuildCameraPose,
  getCameraScriptCommandKey,
  getFocusCameraPose,
  getOpeningCameraPose,
  getOverviewCameraPose,
  getUnlockedIslandBounds,
  type HexCameraIntent,
} from '@/lib/hex-world/camera';
import { expSmoothingAlpha, type HexMotionProfile } from '@/lib/hex-world/motion';
import type { HexCoord, HexTileDTO } from '@/lib/hex-world/types';

export function HexDioramaCamera({
  tiles,
  intent,
  motionProfile,
  reducedMotion,
  resetNonce = 0,
  reframeCoords = [],
}: {
  tiles: HexTileDTO[];
  intent: HexCameraIntent;
  motionProfile: HexMotionProfile;
  reducedMotion: boolean;
  resetNonce?: number;
  reframeCoords?: HexCoord[];
}) {
  const { camera, size } = useThree();
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const scriptedMotion = useRef(true);
  const mounted = useRef(false);
  const lastScriptCommandKey = useRef<string | null>(null);
  const bounds = useMemo(() => getUnlockedIslandBounds(tiles), [tiles]);
  const aspect = size.height > 0 ? size.width / size.height : 1;
  const pose = useMemo(() => {
    if (intent.kind === 'focus') return getFocusCameraPose(bounds, intent.coord, aspect);
    if (intent.kind === 'build') return getBuildCameraPose(bounds, aspect);
    return getOverviewCameraPose(bounds, aspect);
  }, [aspect, bounds, intent]);
  const overviewPose = useMemo(() => getOverviewCameraPose(bounds, aspect), [aspect, bounds]);
  const poseRef = useRef(pose);
  const overviewPoseRef = useRef(overviewPose);

  useLayoutEffect(() => {
    poseRef.current = pose;
    overviewPoseRef.current = overviewPose;
  }, [overviewPose, pose]);

  const scriptCommandKey = getCameraScriptCommandKey({
    bounds,
    intent,
    aspect,
    resetNonce,
    reframeCoords,
  });

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!mounted.current) {
      const desiredPose = poseRef.current;
      const initial = reducedMotion ? desiredPose : getOpeningCameraPose(overviewPoseRef.current);
      camera.position.set(...initial.position);
      controls.target.set(...desiredPose.target);
      controls.update();
      mounted.current = true;
      lastScriptCommandKey.current = scriptCommandKey;
      scriptedMotion.current = !reducedMotion;
      return;
    }

    if (lastScriptCommandKey.current === scriptCommandKey) return;
    lastScriptCommandKey.current = scriptCommandKey;
    scriptedMotion.current = true;
  }, [camera, reducedMotion, scriptCommandKey]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !scriptedMotion.current) return;
    const desiredPose = poseRef.current;
    const alpha = expSmoothingAlpha(delta, motionProfile.cameraResponse);
    const desiredPosition = new THREE.Vector3(...desiredPose.position);
    const desiredTarget = new THREE.Vector3(...desiredPose.target);
    camera.position.lerp(desiredPosition, alpha);
    controls.target.lerp(desiredTarget, alpha);
    controls.update();
    if (camera.position.distanceTo(desiredPosition) < 0.025 && controls.target.distanceTo(desiredTarget) < 0.02) {
      camera.position.copy(desiredPosition);
      controls.target.copy(desiredTarget);
      scriptedMotion.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={52}
      minPolarAngle={Math.PI / 5}
      maxPolarAngle={Math.PI / 2.35}
      onStart={() => { scriptedMotion.current = false; }}
    />
  );
}
