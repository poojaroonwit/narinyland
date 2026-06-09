"use client";

import { useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameLoop } from './useGameLoop';

export type MovementInput = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
};

export function GameCameraController({ enabled, movement }: { enabled: boolean; movement: MovementInput }) {
  const { camera } = useThree();
  const playerPos = useRef(new THREE.Vector3(0, 0, 7));
  const velocity = useRef(new THREE.Vector3());
  const lookAtTarget = useRef(new THREE.Vector3(0, 1.15, 0));
  const desiredMovement = useRef(new THREE.Vector3());
  const cameraTarget = useRef(new THREE.Vector3());
  const lookAtPoint = useRef(new THREE.Vector3());

  useGameLoop((_, delta) => {
    desiredMovement.current.set(
      (movement.right ? 1 : 0) - (movement.left ? 1 : 0),
      0,
      (movement.back ? 1 : 0) - (movement.forward ? 1 : 0)
    );

    if (desiredMovement.current.lengthSq() > 0) {
      desiredMovement.current.normalize().multiplyScalar(4.8);
    }

    velocity.current.lerp(desiredMovement.current, 1 - Math.exp(-delta * 8));
    playerPos.current.addScaledVector(velocity.current, delta);
    playerPos.current.x = THREE.MathUtils.clamp(playerPos.current.x, -13, 13);
    playerPos.current.z = THREE.MathUtils.clamp(playerPos.current.z, -13, 13);

    cameraTarget.current.set(playerPos.current.x, 4.1, playerPos.current.z + 7.1);
    camera.position.lerp(cameraTarget.current, 1 - Math.exp(-delta * 5.2));

    lookAtPoint.current.set(playerPos.current.x, 1.35, playerPos.current.z - 2.4);
    lookAtTarget.current.lerp(lookAtPoint.current, 1 - Math.exp(-delta * 7));
    camera.lookAt(lookAtTarget.current);
  }, enabled);

  return null;
}
