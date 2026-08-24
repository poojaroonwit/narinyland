"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getExploreInteractionTarget,
  type HexExploreInteractionTarget,
  type HexResidentInteractionSample,
} from '@/lib/hex-world/explore-interactions';
import {
  combineExploreMovementInputs,
  ZERO_HEX_EXPLORE_MOVEMENT,
  type HexExploreMovementInput,
} from '@/lib/hex-world/explore-movement-input';
import {
  getCameraRelativeMoveVector,
  getHexPlayerSpawn,
  resolveWalkablePlayerPosition,
  type HexPlayerPosition,
} from '@/lib/hex-world/player-exploration';
import {
  HEX_SMOOTHNESS_DEFAULTS,
  smoothAngle,
  smoothScalar,
  smoothVector2,
} from '@/lib/hex-world/smooth-motion';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import { HexPlayerAvatar } from './HexPlayerAvatar';

const MOVEMENT_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);
const PLAYER_SPEED = 1.7;
const PLAYER_CAMERA_TARGET_HEIGHT = 0.93;
const VELOCITY_EPSILON = 0.0005;

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
  residentSamples = [],
  reducedMotion,
  resetNonce = 0,
  movementInputRef,
  movementSuspended = false,
  onInteractionTargetChange,
}: {
  tiles: HexTileDTO[];
  buildings: HexBuildingDTO[];
  residentSamples?: HexResidentInteractionSample[];
  reducedMotion: boolean;
  resetNonce?: number;
  movementInputRef?: React.MutableRefObject<HexExploreMovementInput>;
  movementSuspended?: boolean;
  onInteractionTargetChange?: (target: HexExploreInteractionTarget | null) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const pressedRef = useRef(new Set<string>());
  const lastInteractionTargetIdRef = useRef<string | null>(null);
  const velocityRef = useRef({ x: 0, z: 0 });
  const movementAmountRef = useRef(0);
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

  const stopMotion = () => {
    velocityRef.current = { x: 0, z: 0 };
    movementAmountRef.current = 0;
    movingRef.current = false;
    setMoving(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (movementSuspended || !MOVEMENT_CODES.has(event.code) || isEditableTarget(event.target)) return;
      event.preventDefault();
      pressedRef.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!MOVEMENT_CODES.has(event.code)) return;
      pressedRef.current.delete(event.code);
    };
    const clearPressed = () => {
      pressedRef.current.clear();
      if (movementInputRef) movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
      stopMotion();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearPressed);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearPressed);
    };
  }, [movementInputRef, movementSuspended]);

  useEffect(() => {
    if (!movementSuspended) return;
    pressedRef.current.clear();
    if (movementInputRef) movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    velocityRef.current = { x: 0, z: 0 };
    movementAmountRef.current = 0;
    movingRef.current = false;
    setMoving(false);
  }, [movementInputRef, movementSuspended]);

  useEffect(() => () => {
    onInteractionTargetChange?.(null);
  }, [onInteractionTargetChange]);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    const avatar = avatarRef.current;
    if (!controls || !avatar) return;

    positionRef.current = spawn;
    velocityRef.current = { x: 0, z: 0 };
    movementAmountRef.current = 0;
    avatar.position.set(spawn.x, spawn.y, spawn.z);
    avatar.rotation.y = Math.PI;
    controls.target.set(spawn.x, spawn.y + PLAYER_CAMERA_TARGET_HEIGHT, spawn.z);
    camera.position.set(spawn.x + 2.55, spawn.y + 2.2, spawn.z + 2.45);
    camera.lookAt(controls.target);
    controls.update();
    pressedRef.current.clear();
    if (movementInputRef) movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    lastInteractionTargetIdRef.current = null;
    onInteractionTargetChange?.(null);
    setMovingIfChanged(false);
  }, [camera, movementInputRef, onInteractionTargetChange, resetNonce, spawn]);

  useFrame((_, frameDelta) => {
    const controls = controlsRef.current;
    const avatar = avatarRef.current;
    if (!controls || !avatar || document.visibilityState === 'hidden') return;

    const delta = Math.min(frameDelta, 0.05);
    const pressed = pressedRef.current;
    const keyboardInput = movementSuspended
      ? ZERO_HEX_EXPLORE_MOVEMENT
      : {
          forward: pressedAxis(pressed, ['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
          right: pressedAxis(pressed, ['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']),
        };
    const touchInput = movementSuspended
      ? ZERO_HEX_EXPLORE_MOVEMENT
      : movementInputRef?.current ?? ZERO_HEX_EXPLORE_MOVEMENT;
    const combinedInput = combineExploreMovementInputs(keyboardInput, touchInput);
    const inputMagnitude = Math.min(1, Math.hypot(combinedInput.forward, combinedInput.right));

    camera.getWorldDirection(cameraForward);
    const movement = getCameraRelativeMoveVector(
      combinedInput,
      { x: cameraForward.x, z: cameraForward.z },
    );
    const requestedVelocity = movementSuspended
      ? { x: 0, z: 0 }
      : {
          x: movement.x * PLAYER_SPEED * inputMagnitude,
          z: movement.z * PLAYER_SPEED * inputMagnitude,
        };
    const requestedSpeed = Math.hypot(requestedVelocity.x, requestedVelocity.z);
    const response = requestedSpeed > VELOCITY_EPSILON
      ? HEX_SMOOTHNESS_DEFAULTS.acceleration
      : HEX_SMOOTHNESS_DEFAULTS.deceleration;
    let velocity = reducedMotion
      ? requestedVelocity
      : smoothVector2(velocityRef.current, requestedVelocity, response, delta);

    if (movementSuspended) velocity = { x: 0, z: 0 };
    if (Math.abs(velocity.x) < VELOCITY_EPSILON) velocity.x = 0;
    if (Math.abs(velocity.z) < VELOCITY_EPSILON) velocity.z = 0;

    const current = positionRef.current;
    let next = current;
    if (velocity.x !== 0 || velocity.z !== 0) {
      const proposed = {
        x: current.x + velocity.x * delta,
        z: current.z + velocity.z * delta,
      };
      next = resolveWalkablePlayerPosition({ current, proposed, tiles });

      if (Math.abs(next.x - current.x) <= 1e-6 && Math.abs(proposed.x - current.x) > 1e-6) velocity.x = 0;
      if (Math.abs(next.z - current.z) <= 1e-6 && Math.abs(proposed.z - current.z) > 1e-6) velocity.z = 0;
    }

    velocityRef.current = velocity;
    const movementAmount = Math.min(1, Math.hypot(velocity.x, velocity.z) / PLAYER_SPEED);
    movementAmountRef.current = movementAmount;

    const didMove = Math.abs(next.x - current.x) > 1e-6 || Math.abs(next.z - current.z) > 1e-6;
    setMovingIfChanged(didMove || movementAmount > 0.01);
    positionRef.current = next;
    avatar.position.set(next.x, next.y, next.z);

    const interactionTarget = getExploreInteractionTarget(next, buildings, residentSamples);
    const interactionTargetId = interactionTarget?.id ?? null;
    if (interactionTargetId !== lastInteractionTargetIdRef.current) {
      lastInteractionTargetIdRef.current = interactionTargetId;
      onInteractionTargetChange?.(interactionTarget);
    }

    if (movementAmount > 0.01) {
      const targetHeading = Math.atan2(velocity.x, velocity.z);
      avatar.rotation.y = reducedMotion
        ? targetHeading
        : smoothAngle(
            avatar.rotation.y,
            targetHeading,
            HEX_SMOOTHNESS_DEFAULTS.heading,
            delta,
          );
    }

    desiredTarget.set(next.x, next.y + PLAYER_CAMERA_TARGET_HEIGHT, next.z);
    previousTarget.copy(controls.target);
    const cameraAlpha = reducedMotion
      ? 1
      : smoothScalar(0, 1, HEX_SMOOTHNESS_DEFAULTS.camera, delta);
    controls.target.lerp(desiredTarget, cameraAlpha);
    targetShift.copy(controls.target).sub(previousTarget);
    camera.position.add(targetShift);
    controls.update();
  });

  return (
    <>
      <HexPlayerAvatar
        ref={avatarRef}
        moving={moving}
        movementAmountRef={movementAmountRef}
        reducedMotion={reducedMotion}
      />
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
