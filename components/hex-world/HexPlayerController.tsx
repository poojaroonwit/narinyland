"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getCameraRelativeMoveVector,
  getHexPlayerSpawn,
  resolveWalkablePlayerPosition,
  type HexPlayerPosition,
} from '@/lib/hex-world/player-exploration';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import { HexPlayerAvatar } from './HexPlayerAvatar';

const MOVEMENT_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);
const PLAYER_SPEED = 1.7;
const PLAYER_CAMERA_TARGET_HEIGHT = 0.93;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function pressedAxis(pressed: Set<string>, positive: string[], negative: string[]): number {
  const positiveDown = positive.some((code) => pressed.has(code));
  const negativeDown = negative.some((code) => pressed.has(code));
  return Number(positiveDown) - Number(negativeDown);
}

export function HexPlayerController({
  tiles,
  buildings,
  reducedMotion,
  resetNonce = 0,
}: {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  reducedMotion: boolean;
  resetNonce?: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const pressedRef = useRef(new Set<string>());
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const spawn = useMemo(() => getHexPlayerSpawn({ tiles, buildings }), [buildings, tiles]);
  const positionRef = useRef<HexPlayerPosition>(spawn);
  const cameraForward = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);
  const previousTarget = useMemo(() => new THREE.Vector3(), []);
  const targetShift = useMemo(() => new THREE.Vector3(), []);

  const setMovingIfChanged = (next: boolean) => {
    if (movingRef.current === next) return;
    movingRef.current = next;
    setMoving(next);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!MOVEMENT_CODES.has(event.code) || isEditableTarget(event.target)) return;
      event.preventDefault();
      pressedRef.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!MOVEMENT_CODES.has(event.code)) return;
      pressedRef.current.delete(event.code);
    };
    const clearPressed = () => {
      pressedRef.current.clear();
      setMovingIfChanged(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearPressed);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearPressed);
    };
  }, []);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    const avatar = avatarRef.current;
    if (!controls || !avatar) return;

    positionRef.current = spawn;
    avatar.position.set(spawn.x, spawn.y, spawn.z);
    avatar.rotation.y = Math.PI;
    controls.target.set(spawn.x, spawn.y + PLAYER_CAMERA_TARGET_HEIGHT, spawn.z);
    camera.position.set(spawn.x + 2.55, spawn.y + 2.2, spawn.z + 2.45);
    camera.lookAt(controls.target);
    controls.update();
    pressedRef.current.clear();
    setMovingIfChanged(false);
  }, [camera, resetNonce, spawn]);

  useFrame((_, frameDelta) => {
    const controls = controlsRef.current;
    const avatar = avatarRef.current;
    if (!controls || !avatar || document.visibilityState === 'hidden') return;

    const delta = Math.min(frameDelta, 0.05);
    const pressed = pressedRef.current;
    const forwardInput = pressedAxis(pressed, ['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
    const rightInput = pressedAxis(pressed, ['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']);

    camera.getWorldDirection(cameraForward);
    const movement = getCameraRelativeMoveVector(
      { forward: forwardInput, right: rightInput },
      { x: cameraForward.x, z: cameraForward.z },
    );

    const current = positionRef.current;
    let next = current;
    if (movement.x !== 0 || movement.z !== 0) {
      next = resolveWalkablePlayerPosition({
        current,
        proposed: {
          x: current.x + movement.x * PLAYER_SPEED * delta,
          z: current.z + movement.z * PLAYER_SPEED * delta,
        },
        tiles,
      });
    }

    const didMove = Math.abs(next.x - current.x) > 1e-6 || Math.abs(next.z - current.z) > 1e-6;
    setMovingIfChanged(didMove);
    positionRef.current = next;
    avatar.position.set(next.x, next.y, next.z);

    if (didMove) {
      const targetHeading = Math.atan2(movement.x, movement.z);
      const headingDelta = Math.atan2(
        Math.sin(targetHeading - avatar.rotation.y),
        Math.cos(targetHeading - avatar.rotation.y),
      );
      const headingAlpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 14);
      avatar.rotation.y += headingDelta * headingAlpha;
    }

    desiredTarget.set(next.x, next.y + PLAYER_CAMERA_TARGET_HEIGHT, next.z);
    previousTarget.copy(controls.target);
    const cameraAlpha = reducedMotion ? 1 : 1 - Math.exp(-delta * 10.5);
    controls.target.lerp(desiredTarget, cameraAlpha);
    targetShift.copy(controls.target).sub(previousTarget);
    camera.position.add(targetShift);
    controls.update();
  });

  return (
    <>
      <HexPlayerAvatar ref={avatarRef} moving={moving} reducedMotion={reducedMotion} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.085}
        minDistance={2.6}
        maxDistance={5.2}
        minPolarAngle={Math.PI / 3.7}
        maxPolarAngle={Math.PI / 2.18}
      />
    </>
  );
}
