"use client";

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getBuildCameraPose,
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
  const bounds = useMemo(() => getUnlockedIslandBounds(tiles), [tiles]);
  const pose = useMemo(() => {
    const aspect = size.height > 0 ? size.width / size.height : 1;
    if (intent.kind === 'focus') return getFocusCameraPose(bounds, intent.coord, aspect);
    if (intent.kind === 'build') return getBuildCameraPose(bounds, aspect);
    return getOverviewCameraPose(bounds, aspect);
  }, [bounds, intent, size.height, size.width, resetNonce, reframeCoords]);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!mounted.current) {
      const aspect = size.height > 0 ? size.width / size.height : 1;
      const overview = getOverviewCameraPose(bounds, aspect);
      const initial = reducedMotion ? pose : getOpeningCameraPose(overview);
      camera.position.set(...initial.position);
      controls.target.set(...pose.target);
      controls.update();
      mounted.current = true;
      scriptedMotion.current = !reducedMotion;
      return;
    }

    scriptedMotion.current = true;
  }, [bounds, camera, pose, reducedMotion, size.height, size.width]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !scriptedMotion.current) return;
    const alpha = expSmoothingAlpha(delta, motionProfile.cameraResponse);
    const desiredPosition = new THREE.Vector3(...pose.position);
    const desiredTarget = new THREE.Vector3(...pose.target);
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
      dampingFactor={0.07}
      minDistance={10}
      maxDistance={52}
      minPolarAngle={Math.PI / 5}
      maxPolarAngle={Math.PI / 2.35}
      onStart={() => { scriptedMotion.current = false; }}
    />
  );
}
