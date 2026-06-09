"use client";

import * as React from 'react';
import { DragControls } from '@react-three/drei';
import * as THREE from 'three';
import { ItemTransformUpdate, PurchasedItem } from '../../types';

const snapPosition = (value: number) => Math.round(value * 2) / 2;

type GameEntityProps = {
  item: PurchasedItem;
  onUpdate?: (id: string, update: ItemTransformUpdate) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  snapToGrid?: boolean;
  enabled?: boolean;
  selectionRadius?: number;
  children: React.ReactNode;
};

export function GameEntity({
  item,
  onUpdate,
  onSelect,
  isSelected,
  snapToGrid,
  enabled = true,
  selectionRadius = 0.95,
  children,
}: GameEntityProps) {
  const [position, setPosition] = React.useState<[number, number, number]>([item.x || 0, item.y || 0, item.z || 0]);
  const groupRef = React.useRef<THREE.Group>(null);

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
          <ringGeometry args={[selectionRadius, selectionRadius + 0.13, 48]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
    </group>
  );

  if (!enabled) return content;

  return (
    <DragControls
      autoTransform
      dragLimits={[[-20, 20], [0, 0], [-20, 20]]}
      onDragEnd={() => {
        if (!groupRef.current) return;

        const p = groupRef.current.position;
        const x = snapToGrid ? snapPosition(p.x) : p.x;
        const z = snapToGrid ? snapPosition(p.z) : p.z;
        groupRef.current.position.set(x, 0, z);
        setPosition([x, 0, z]);
        onUpdate?.(item.id, { x, y: 0, z, rotation: item.rotation ?? 0 });
      }}
    >
      {content}
    </DragControls>
  );
}
