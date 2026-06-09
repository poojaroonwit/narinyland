"use client";

import * as React from 'react';
import { RootState, useFrame } from '@react-three/fiber';

export type GameLoopCallback = (state: RootState, delta: number, elapsed: number) => void;

const MAX_FRAME_DELTA = 1 / 20;

export function useGameLoop(callback: GameLoopCallback, enabled = true, priority?: number) {
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useFrame((state, delta) => {
    if (!enabled) return;
    callbackRef.current(state, Math.min(delta, MAX_FRAME_DELTA), state.clock.getElapsedTime());
  }, priority);
}
