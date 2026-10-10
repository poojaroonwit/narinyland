"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  combineExploreMovementInputs,
  ZERO_HEX_EXPLORE_MOVEMENT,
  type HexExploreMovementInput,
} from '@/lib/hex-world/explore-movement-input';
import { getCameraRelativeMoveVector } from '@/lib/hex-world/player-exploration';
import { getOpenWorldChunkIndex, isOpenWorldWalkable, sampleOpenWorldHeight } from '@/lib/open-world/terrain';
import { HexPlayerAvatar } from '@/components/hex-world/HexPlayerAvatar';

const WALK_SPEED = 3.3;
const RUN_SPEED = 5.7;
const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
const PLAYER_HEIGHT = 0.08;
const TARGET_HEIGHT = 1.05;

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function axis(pressed: Set<string>, positives: string[], negatives: string[]) {
  return Number(positives.some((key) => pressed.has(key))) - Number(negatives.some((key) => pressed.has(key)));
}

export function OpenWorldPlayerController({ movementInputRef, resetNonce, onMove }: {
  movementInputRef: React.MutableRefObject<HexExploreMovementInput>;
  resetNonce: number;
  onMove: (position: { x: number; z: number }) => void;
}) {
  const { camera } = useThree();
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const avatar = useRef<THREE.Group>(null);
  const keys = useRef(new Set<string>());
  const position = useRef({ x: 0, z: 0 });
  const lastReported = useRef({ x: Number.NaN, z: Number.NaN });
  const lastChunk = useRef('');
  const forward = useMemo(() => new THREE.Vector3(), []);
  const wantedTarget = useMemo(() => new THREE.Vector3(), []);
  const deltaTarget = useMemo(() => new THREE.Vector3(), []);
  const lastTarget = useMemo(() => new THREE.Vector3(), []);
  const movementAmountRef = useRef(0);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!MOVEMENT_KEYS.has(event.code) || event.repeat || isTyping(event.target)) return;
      event.preventDefault();
      keys.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    const blur = () => {
      keys.current.clear();
      movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
      movementAmountRef.current = 0;
      movingRef.current = false;
      setMoving(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    };
  }, [movementInputRef]);

  useLayoutEffect(() => {
    const control = controls.current;
    if (!control || !avatar.current) return;
    const originY = sampleOpenWorldHeight(0, 0) + PLAYER_HEIGHT;
    position.current = { x: 0, z: 0 };
    lastReported.current = { x: Number.NaN, z: Number.NaN };
    lastChunk.current = '';
    avatar.current.position.set(0, originY, 0);
    avatar.current.rotation.y = Math.PI;
    control.target.set(0, originY + TARGET_HEIGHT, 0);
    camera.position.set(3.6, originY + 2.7, 5.4);
    camera.lookAt(control.target);
    control.update();
    keys.current.clear();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    movementAmountRef.current = 0;
    movingRef.current = false;
    setMoving(false);
    onMove({ x: 0, z: 0 });
  }, [camera, movementInputRef, onMove, resetNonce]);

  useFrame((_, frameDelta) => {
    const control = controls.current;
    const model = avatar.current;
    if (!control || !model || document.visibilityState === 'hidden') return;
    const dt = Math.min(frameDelta, 0.05);
    const pressed = keys.current;
    const keyboard = {
      forward: axis(pressed, ['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
      right: axis(pressed, ['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']),
    };
    const combined = combineExploreMovementInputs(keyboard, movementInputRef.current);
    const strength = Math.min(1, Math.hypot(combined.forward, combined.right));
    camera.getWorldDirection(forward);
    const direction = getCameraRelativeMoveVector(combined, { x: forward.x, z: forward.z });
    const running = pressed.has('ShiftLeft') || pressed.has('ShiftRight');
    const speed = (running ? RUN_SPEED : WALK_SPEED) * strength;

    const current = position.current;
    const attemptX = current.x + direction.x * speed * dt;
    const attemptZ = current.z + direction.z * speed * dt;
    // Axes resolve separately so the character slides along steep edges.
    const x = isOpenWorldWalkable(attemptX, current.z, current.x, current.z) ? attemptX : current.x;
    const z = isOpenWorldWalkable(x, attemptZ, x, current.z) ? attemptZ : current.z;
    const actuallyMoving = Math.hypot(x - current.x, z - current.z) > 0.0001;
    const y = sampleOpenWorldHeight(x, z) + PLAYER_HEIGHT;
    position.current = { x, z };

    movementAmountRef.current = actuallyMoving ? Math.min(1, speed / RUN_SPEED) : 0;
    if (movingRef.current !== actuallyMoving) {
      movingRef.current = actuallyMoving;
      setMoving(actuallyMoving);
    }
    model.position.set(x, y, z);
    if (actuallyMoving) {
      const heading = Math.atan2(x - current.x, z - current.z);
      const difference = Math.atan2(Math.sin(heading - model.rotation.y), Math.cos(heading - model.rotation.y));
      model.rotation.y += difference * Math.min(1, dt * 12);
    }

    wantedTarget.set(x, y + TARGET_HEIGHT, z);
    lastTarget.copy(control.target);
    control.target.lerp(wantedTarget, Math.min(1, dt * 10));
    deltaTarget.copy(control.target).sub(lastTarget);
    camera.position.add(deltaTarget);
    control.update();

    const chunkKey = `${getOpenWorldChunkIndex(x)}:${getOpenWorldChunkIndex(z)}`;
    // Limit React updates while still streaming chunks immediately at boundary crossings.
    if (chunkKey !== lastChunk.current || Math.hypot(x - lastReported.current.x, z - lastReported.current.z) > 1.4) {
      lastChunk.current = chunkKey;
      lastReported.current = { x, z };
      onMove({ x, z });
    }
  });

  return (
    <>
      <HexPlayerAvatar ref={avatar} moving={moving} movementAmountRef={movementAmountRef} reducedMotion={false} />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.09}
        minDistance={2.7}
        maxDistance={8}
        minPolarAngle={Math.PI / 3.6}
        maxPolarAngle={Math.PI / 2.08}
      />
    </>
  );
}
