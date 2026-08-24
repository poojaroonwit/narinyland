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

const WORLD_IDLE_DELAY_MS = 2500;
const WORLD_IDLE_X_OFFSET = 0.035;
const WORLD_IDLE_Y_OFFSET = 0.018;
const WORLD_IDLE_Z_OFFSET = 0.028;
const WORLD_IDLE_X_HZ = 0.11;
const WORLD_IDLE_Y_HZ = 0.08;
const WORLD_IDLE_Z_HZ = 0.095;
const TWO_PI = Math.PI * 2;

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
  const idleTargetBaselineRef = useRef(new THREE.Vector3());
  const manualInteractionActiveRef = useRef(false);
  const lastManualInteractionMsRef = useRef(Date.now());
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
  const desiredPositionRef = useRef(new THREE.Vector3());
  const desiredTargetRef = useRef(new THREE.Vector3());

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
      idleTargetBaselineRef.current.copy(controls.target);
      lastManualInteractionMsRef.current = Date.now();
      controls.update();
      mounted.current = true;
      lastScriptCommandKey.current = scriptCommandKey;
      scriptedMotion.current = !reducedMotion;
      return;
    }

    if (lastScriptCommandKey.current === scriptCommandKey) return;
    lastScriptCommandKey.current = scriptCommandKey;
    manualInteractionActiveRef.current = false;
    scriptedMotion.current = true;
  }, [camera, reducedMotion, scriptCommandKey]);

  useFrame(({ clock }, delta) => {
    const controls = controlsRef.current;
    if (!controls || document.visibilityState === 'hidden') return;

    if (scriptedMotion.current) {
      const desiredPose = poseRef.current;
      const alpha = expSmoothingAlpha(delta, motionProfile.cameraResponse);
      const desiredPosition = desiredPositionRef.current.set(...desiredPose.position);
      const desiredTarget = desiredTargetRef.current.set(...desiredPose.target);
      camera.position.lerp(desiredPosition, alpha);
      controls.target.lerp(desiredTarget, alpha);
      controls.update();
      if (camera.position.distanceTo(desiredPosition) < 0.025 && controls.target.distanceTo(desiredTarget) < 0.02) {
        camera.position.copy(desiredPosition);
        controls.target.copy(desiredTarget);
        idleTargetBaselineRef.current.copy(desiredTarget);
        lastManualInteractionMsRef.current = Date.now();
        scriptedMotion.current = false;
      }
      return;
    }

    const baseline = idleTargetBaselineRef.current;
    if (reducedMotion || motionProfile.worldIdleCameraScale <= 0) {
      if (!manualInteractionActiveRef.current && controls.target.distanceToSquared(baseline) > 1e-10) {
        controls.target.copy(idleTargetBaselineRef.current);
        controls.update();
      }
      return;
    }
    if (manualInteractionActiveRef.current) return;
    if (Date.now() - lastManualInteractionMsRef.current < WORLD_IDLE_DELAY_MS) return;

    const scale = motionProfile.worldIdleCameraScale;
    const time = clock.elapsedTime * TWO_PI;
    controls.target.set(
      baseline.x + Math.sin(time * WORLD_IDLE_X_HZ) * WORLD_IDLE_X_OFFSET * scale,
      baseline.y + Math.sin(time * WORLD_IDLE_Y_HZ + 1.3) * WORLD_IDLE_Y_OFFSET * scale,
      baseline.z + Math.sin(time * WORLD_IDLE_Z_HZ + 2.1) * WORLD_IDLE_Z_OFFSET * scale,
    );
    controls.update();
  });

  const handleControlsStart = () => {
    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(idleTargetBaselineRef.current);
      controls.update();
    }
    scriptedMotion.current = false;
    manualInteractionActiveRef.current = true;
    lastManualInteractionMsRef.current = Date.now();
  };

  const handleControlsEnd = () => {
    const controls = controlsRef.current;
    if (controls) idleTargetBaselineRef.current.copy(controls.target);
    manualInteractionActiveRef.current = false;
    lastManualInteractionMsRef.current = Date.now();
  };

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
      onStart={handleControlsStart}
      onEnd={handleControlsEnd}
    />
  );
}
