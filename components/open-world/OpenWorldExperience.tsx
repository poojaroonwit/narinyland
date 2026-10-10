"use client";

import React from 'react';
import Link from 'next/link';
import { ZERO_HEX_EXPLORE_MOVEMENT, type HexExploreMovementInput } from '@/lib/hex-world/explore-movement-input';
import { HexExploreTouchControls } from '@/components/hex-world/HexExploreTouchControls';
import {
  getOpenWorldChunkIndex,
  getNearestOpenWorldLandmark,
  OPEN_WORLD_LANDMARKS,
  type OpenWorldLandmark,
} from '@/lib/open-world/terrain';
import { OpenWorldScene } from './OpenWorldScene';

const ICONS: Record<OpenWorldLandmark['kind'], string> = {
  village: '🏡',
  forest: '🌳',
  lake: '🪷',
  hills: '⛰️',
};

export function OpenWorldExperience() {
  const [position, setPosition] = React.useState({ x: 0, z: 0 });
  const [chunkCenter, setChunkCenter] = React.useState({ x: 0, z: 0 });
  const [resetNonce, setResetNonce] = React.useState(0);
  const [mapOpen, setMapOpen] = React.useState(false);
  const movementInputRef = React.useRef<HexExploreMovementInput>({ ...ZERO_HEX_EXPLORE_MOVEMENT });

  const onPlayerMove = React.useCallback((next: { x: number; z: number }) => {
    setPosition((previous) =>
      Math.abs(next.x - previous.x) > 0.1 || Math.abs(next.z - previous.z) > 0.1 ? next : previous);
    setChunkCenter((previous) =>
      getOpenWorldChunkIndex(next.x) !== getOpenWorldChunkIndex(previous.x)
        || getOpenWorldChunkIndex(next.z) !== getOpenWorldChunkIndex(previous.z) ? next : previous);
  }, []);

  const nearest = getNearestOpenWorldLandmark(position.x, position.z);

  return (
    <main className="relative h-[100dvh] min-h-[30rem] overflow-hidden bg-[#f2eddf] text-[#443d35]" aria-label="Narinyland open-world exploration">
      <div className="absolute inset-0">
        <OpenWorldScene chunkCenter={chunkCenter} movementInputRef={movementInputRef} resetNonce={resetNonce} onPlayerMove={onPlayerMove} />
      </div>

      <header className="pointer-events-none absolute inset-x-3 top-[calc(0.9rem+env(safe-area-inset-top))] z-30 flex items-start justify-between gap-3 sm:inset-x-5">
        <div className="cozy-surface max-w-[67vw] rounded-[1.15rem] p-3 sm:max-w-[22rem] sm:p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#638368]">
            <span aria-hidden="true">🌿</span> Narinyland Commons
          </div>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[#423a32] sm:text-2xl">{nearest.title}</h1>
          <p className="mt-1 text-[11px] text-[#70675b] sm:text-xs">{nearest.hint} · Open-world exploration</p>
          <div className="mt-2 hidden items-center gap-2 text-[11px] font-medium text-[#897969] sm:flex">
            <span>WASD / arrows to move</span><span>·</span><span>Shift to run</span><span>·</span><span>Drag to look</span>
          </div>
        </div>
        <Link href="/garden" className="cozy-button-secondary pointer-events-auto flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3 text-xs font-semibold shadow-sm sm:px-4">
          <span aria-hidden="true">🏡</span><span className="hidden sm:inline">My homestead</span><span className="sm:hidden">Home</span>
        </Link>
      </header>

      <HexExploreTouchControls movementInputRef={movementInputRef} enabled />

      <div className="pointer-events-none absolute inset-x-3 bottom-[calc(6.3rem+env(safe-area-inset-bottom))] z-30 flex items-end justify-end gap-3 sm:inset-x-5 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <p className="cozy-float hidden rounded-full px-3 py-2 text-[11px] font-medium text-[#665e51] sm:block">
            Walk into new regions—nearby terrain streams as you go
          </p>
          <div className="cozy-surface flex items-center gap-1.5 rounded-2xl p-1.5">
            <button
              type="button"
              onClick={() => setMapOpen((current) => !current)}
              aria-expanded={mapOpen}
              aria-controls="open-world-map"
              className="min-h-11 rounded-xl bg-[#edf1e4] px-3 text-xs font-semibold text-[#426850] hover:bg-[#dfe9d8]"
            >
              🧭 Places
            </button>
            <button
              type="button"
              onClick={() => {
                movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
                setResetNonce((current) => current + 1);
              }}
              className="min-h-11 rounded-xl px-3 text-xs font-semibold text-[#695f52] hover:bg-[#f4eadd]"
            >
              Return to village
            </button>
          </div>
        </div>
      </div>

      {mapOpen && (
        <aside
          id="open-world-map"
          className="cozy-surface pointer-events-auto absolute bottom-[calc(10.3rem+env(safe-area-inset-bottom))] right-3 z-40 w-[min(21rem,calc(100vw-1.5rem))] rounded-[1.4rem] p-4 sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:right-5"
          aria-label="Open-world places"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Places to discover</h2>
            <button type="button" onClick={() => setMapOpen(false)} aria-label="Close places" className="min-h-9 rounded-lg px-2 text-sm text-[#75675d] hover:bg-[#f2e9db]">✕</button>
          </div>
          <p className="mt-1 text-[11px] text-[#756d60]">Walk between these connected regions.</p>
          <div className="mt-3 space-y-2">
            {OPEN_WORLD_LANDMARKS.map((landmark) => {
              const distance = Math.round(Math.hypot(landmark.x - position.x, landmark.z - position.z));
              return (
                <div key={landmark.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#faf4e8] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{ICONS[landmark.kind]}</span>
                    <div><p className="text-xs font-semibold">{landmark.title}</p><p className="text-[10px] text-[#827566]">{landmark.hint}</p></div>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-[#60775c]">{distance}m</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] leading-5 text-[#897e6e]">Early exploration preview: terrain is generated locally. Online players and shared-world syncing are not enabled yet.</p>
        </aside>
      )}
      <div className="pointer-events-none absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-20 hidden -translate-x-1/2 rounded-full bg-[#fff9f0]/85 px-3 py-1 text-[10px] font-medium text-[#857565] sm:block">
        X {Math.round(position.x)} · Z {Math.round(position.z)} · {getOpenWorldChunkIndex(position.x)}:{getOpenWorldChunkIndex(position.z)}
      </div>
      <p className="sr-only" aria-live="polite">Exploring {nearest.title}</p>
    </main>
  );
}
