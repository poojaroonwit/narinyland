"use client";

import * as React from 'react';
import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DragControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ItemTransformUpdate, PurchasedItem } from '../../types';

export type MovementInput = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
};

const snapPosition = (value: number) => Math.round(value * 2) / 2;

export const GameCameraController = ({ enabled, movement }: { enabled: boolean; movement: MovementInput }) => {
  const { camera } = useThree();
  const playerPos = useRef(new THREE.Vector3(0, 0, 6));
  const velocity = useRef(new THREE.Vector3());
  const lookAtTarget = useRef(new THREE.Vector3(0, 1.15, 0));
  const desiredMovement = useRef(new THREE.Vector3());
  const cameraTarget = useRef(new THREE.Vector3());
  const lookAtPoint = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!enabled) return;

    desiredMovement.current.set(
      (movement.right ? 1 : 0) - (movement.left ? 1 : 0),
      0,
      (movement.back ? 1 : 0) - (movement.forward ? 1 : 0)
    );

    if (desiredMovement.current.lengthSq() > 0) {
      desiredMovement.current.normalize().multiplyScalar(4.2);
    }

    velocity.current.lerp(desiredMovement.current, 1 - Math.exp(-delta * 8));
    playerPos.current.addScaledVector(velocity.current, delta);
    playerPos.current.x = THREE.MathUtils.clamp(playerPos.current.x, -13, 13);
    playerPos.current.z = THREE.MathUtils.clamp(playerPos.current.z, -13, 13);

    cameraTarget.current.set(playerPos.current.x, 3.6, playerPos.current.z + 8.5);
    camera.position.lerp(cameraTarget.current, 1 - Math.exp(-delta * 4.5));

    lookAtPoint.current.set(playerPos.current.x, 1.2, playerPos.current.z - 1.5);
    lookAtTarget.current.lerp(
      lookAtPoint.current,
      1 - Math.exp(-delta * 6)
    );
    camera.lookAt(lookAtTarget.current);
  });

  return null;
};

export const DraggableItem = ({
  item,
  onUpdate,
  onSelect,
  isSelected,
  snapToGrid,
  enabled = true,
  children
}: {
  item: PurchasedItem,
  onUpdate?: (id: string, update: ItemTransformUpdate) => void,
  onSelect?: (id: string) => void,
  isSelected?: boolean,
  snapToGrid?: boolean,
  enabled?: boolean,
  children: React.ReactNode
}) => {
  const [position, setPosition] = useState<[number, number, number]>([item.x || 0, item.y || 0, item.z || 0]);
  const groupRef = useRef<THREE.Group>(null);

  React.useEffect(() => {
    setPosition([item.x || 0, item.y || 0, item.z || 0]);
  }, [item.x, item.y, item.z]);

  const content = (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, item.rotation ?? 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        if (enabled) onSelect?.(item.id);
      }}
    >
      {isSelected && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95, 1.08, 48]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
    </group>
  );

  if (!enabled) return content;

  return (
    <DragControls 
      autoTransform={true} 
      dragLimits={[[-20, 20], [0, 0], [-20, 20]]} 
      onDragEnd={() => {
        if (groupRef.current) {
           const p = groupRef.current.position;
           const x = snapToGrid ? snapPosition(p.x) : p.x;
           const z = snapToGrid ? snapPosition(p.z) : p.z;
           groupRef.current.position.set(x, 0, z);
           setPosition([x, 0, z]); // restrict to floor
           if (onUpdate) onUpdate(item.id, { x, y: 0, z, rotation: item.rotation ?? 0 });
        }
      }}
    >
      {content}
    </DragControls>
  );
};

export const seededRatio = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

export const nextSeededRatio = (seedRef: React.MutableRefObject<number>) => {
  seedRef.current = (seedRef.current * 1664525 + 1013904223) >>> 0;
  return seedRef.current / 4294967296;
};

export const CustomGLTFModel = ({ url, scale = 1 }: { url: string, scale?: number }) => {
  const { scene } = useGLTF(url);
  // Clone the scene so multiple of the same model can be rendered
  const clone = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clone} scale={scale} />;
};

// Spawn-in animation: objects start from a glowing sphere and scale in with a clean ease-out.
export const SpawnIn = ({ children, delay = 0, position = [0, 0, 0] as [number, number, number] }: { children: React.ReactNode, delay?: number, position?: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);
  const completed = useRef(false);
  const DURATION = 0.65;
  useFrame((state) => {
    if (completed.current) return;

    const t = state.clock.getElapsedTime();

    if (startTime.current === null) {
      if (t < delay) {
        if (groupRef.current) groupRef.current.scale.setScalar(0);
        if (sphereRef.current) sphereRef.current.scale.setScalar(0);
        return;
      }
      startTime.current = t;
    }

    if (startTime.current === null) return;
    const elapsed = t - startTime.current;
    const p = Math.min(elapsed / DURATION, 1);

    const easeOutQuint = 1 - Math.pow(1 - p, 5);

    if (groupRef.current) groupRef.current.scale.setScalar(easeOutQuint);

    // Glowing sphere: pulse in then shrink away as object appears
    if (sphereRef.current) {
      const sScale = p < 0.25 ? (p / 0.25) : Math.max(0, 1 - (p - 0.25) / 0.35);
      sphereRef.current.scale.setScalar(sScale * 0.6);
    }

    if (p >= 1) completed.current = true;
  });

  return (
    <group position={position}>
      <mesh ref={sphereRef} scale={0}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#ec4899" transparent opacity={0.55} />
      </mesh>
      <group ref={groupRef} scale={[0, 0, 0]}>
        {children}
      </group>
    </group>
  );
};
