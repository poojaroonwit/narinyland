"use client";

import * as React from 'react';
import { Canvas } from '@react-three/fiber';

export type GameQuality = 'low' | 'medium' | 'high';

type GameEngine3DProps = {
  children: React.ReactNode;
  quality: GameQuality;
  dpr: number;
  camera?: {
    position?: [number, number, number];
    fov?: number;
  };
  alpha?: boolean;
  shadows?: boolean;
  onPointerMissed?: () => void;
};

export function GameEngine3D({
  children,
  quality,
  dpr,
  camera,
  alpha = true,
  shadows,
  onPointerMissed,
}: GameEngine3DProps) {
  return (
    <Canvas
      shadows={shadows ?? quality === 'high'}
      dpr={dpr}
      performance={{ min: 0.5 }}
      camera={camera}
      gl={{
        antialias: quality !== 'low',
        alpha,
        powerPreference: 'high-performance',
      }}
      onPointerMissed={onPointerMissed}
    >
      {children}
    </Canvas>
  );
}
