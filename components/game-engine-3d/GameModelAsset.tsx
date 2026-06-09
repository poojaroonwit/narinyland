"use client";

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

export function GameModelAsset({ url, scale = 1 }: { url: string; scale?: number }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(), [scene]);

  return <primitive object={clone} scale={scale} />;
}
