"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getJoystickMovementInput,
  ZERO_HEX_EXPLORE_MOVEMENT,
  type HexExploreMovementInput,
} from '@/lib/hex-world/explore-movement-input';

const JOYSTICK_TRAVEL_RADIUS = 34;

type ThumbPosition = { x: number; y: number };

export function HexExploreTouchControls({
  movementInputRef,
  enabled,
}: {
  movementInputRef: React.MutableRefObject<HexExploreMovementInput>;
  enabled: boolean;
}) {
  const activePointerRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const [thumbPosition, setThumbPosition] = useState<ThumbPosition>({ x: 0, y: 0 });

  const resetControl = useCallback(() => {
    activePointerRef.current = null;
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setThumbPosition({ x: 0, y: 0 });
  }, [movementInputRef]);

  useEffect(() => {
    if (!enabled) resetControl();
    return () => {
      movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    };
  }, [enabled, movementInputRef, resetControl]);

  const applyPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const dx = event.clientX - centerRef.current.x;
    const dy = event.clientY - centerRef.current.y;
    const distance = Math.hypot(dx, dy);
    const visualScale = distance > JOYSTICK_TRAVEL_RADIUS
      ? JOYSTICK_TRAVEL_RADIUS / distance
      : 1;

    movementInputRef.current = getJoystickMovementInput({
      dx,
      dy,
      radius: JOYSTICK_TRAVEL_RADIUS,
    });
    setThumbPosition({ x: dx * visualScale, y: dy * visualScale });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || activePointerRef.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    applyPointer(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    applyPointer(event);
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetControl();
  };

  const handleLostPointerCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    event.stopPropagation();
    resetControl();
  };

  if (!enabled) return null;

  return (
    <div
      role="group"
      aria-label="Movement joystick"
      className="pointer-events-auto fixed bottom-[calc(6.15rem+env(safe-area-inset-bottom))] left-[calc(0.85rem+env(safe-area-inset-left))] z-[94] grid h-[92px] w-[92px] touch-none select-none place-items-center rounded-full border border-white/45 bg-stone-900/32 shadow-2xl shadow-stone-950/20 backdrop-blur-md sm:hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onLostPointerCapture={handleLostPointerCapture}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="pointer-events-none absolute inset-[12px] rounded-full border border-white/15 bg-white/5" />
      <div
        className="pointer-events-none h-[42px] w-[42px] rounded-full border border-white/60 bg-[#fffdf7]/88 shadow-lg shadow-stone-950/20 transition-shadow"
        style={{ transform: `translate3d(${thumbPosition.x}px, ${thumbPosition.y}px, 0)` }}
      />
    </div>
  );
}
