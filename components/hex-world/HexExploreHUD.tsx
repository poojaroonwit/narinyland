"use client";

import React from 'react';
import { xpToNextLevel } from '@/lib/family-farm-progression';
import type { HomesteadLifeState } from '@/lib/homestead-life-engine';
import type { HexExploreMovementInput } from '@/lib/hex-world/explore-movement-input';
import { HexExploreTouchControls } from './HexExploreTouchControls';

export function HexExploreHUD({
  state,
  points,
  musicMuted,
  movementInputRef,
  touchControlsEnabled,
  onToggleMusic,
  onBag,
  onGoals,
  onWorld,
  onResetView,
}: {
  state: HomesteadLifeState | null;
  points: number;
  musicMuted: boolean;
  movementInputRef: React.MutableRefObject<HexExploreMovementInput>;
  touchControlsEnabled: boolean;
  onToggleMusic: () => void;
  onBag: () => void;
  onGoals: () => void;
  onWorld: () => void;
  onResetView: () => void;
}) {
  if (!state) {
    return (
      <div className="pointer-events-none fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] left-1/2 z-[92] -translate-x-1/2">
        <div className="rounded-full border border-white/45 bg-stone-900/72 px-4 py-2 text-[10px] font-black text-white/90 shadow-xl backdrop-blur-xl">Exploring the homestead…</div>
      </div>
    );
  }

  const nextXp = xpToNextLevel(state.level);
  const xpPercent = Math.min(100, Math.max(0, (state.xp / Math.max(1, nextXp)) * 100));
  const energyPercent = Math.min(100, Math.max(0, (state.energy / Math.max(1, state.maxEnergy)) * 100));

  return (
    <>
      <HexExploreTouchControls movementInputRef={movementInputRef} enabled={touchControlsEnabled} />

      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(5.7rem+env(safe-area-inset-bottom))] z-[92] flex items-end justify-between gap-2 md:inset-x-5">
        <div className="pointer-events-auto min-w-0 max-w-[46vw] rounded-[1.15rem] border border-white/55 bg-stone-900/78 p-2.5 text-white shadow-2xl shadow-stone-950/20 backdrop-blur-xl max-sm:fixed max-sm:bottom-[calc(12.45rem+env(safe-area-inset-bottom))] max-sm:left-[calc(0.85rem+env(safe-area-inset-left))] max-sm:max-w-[220px] sm:w-[260px] sm:max-w-none">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-gradient-to-br from-emerald-500/35 to-sky-400/25 text-sm font-black shadow-inner">{state.level}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/72"><span>Level {state.level}</span><span>{state.xp}/{nextXp} XP</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/12"><div className="h-full rounded-full bg-sky-300/90" style={{ width: `${xpPercent}%` }} /></div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] font-bold text-white/82"><span>⚡ {state.energy}/{state.maxEnergy}</span><span>🪙 {state.coins}</span></div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300/90" style={{ width: `${energyPercent}%` }} /></div>
            </div>
          </div>
          <div className="mt-2 hidden items-center gap-3 border-t border-white/10 pt-2 text-[9px] font-bold text-white/65 sm:flex"><span>💗 {state.hearts}</span><span>✨ {points}</span><span className="truncate">Day {state.day}</span></div>
        </div>

        <div className="hidden flex-col items-center gap-1.5 sm:flex">
          <div className="rounded-full border border-white/30 bg-stone-900/62 px-3 py-1 text-[9px] font-bold text-white/80 shadow-lg backdrop-blur-md">WASD / arrows · drag to look · wheel to zoom</div>
          <div className="flex items-center gap-1 rounded-[1rem] border border-white/48 bg-[#fffdf7]/88 p-1.5 shadow-xl backdrop-blur-xl">
            <button type="button" onClick={onBag} className="min-h-[44px] min-w-[56px] rounded-xl bg-white/80 px-2.5 text-[10px] font-black text-stone-700">🎒<span className="ml-1">Bag</span></button>
            <button type="button" onClick={onGoals} className="min-h-[44px] min-w-[64px] rounded-xl bg-white/80 px-2.5 text-[10px] font-black text-stone-700">✨<span className="ml-1">Goals</span></button>
          </div>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-[1rem] border border-white/48 bg-[#fffdf7]/90 p-1.5 shadow-xl backdrop-blur-xl">
          <button type="button" onClick={onBag} className="min-h-[44px] min-w-[44px] rounded-xl bg-white/80 px-2 text-xs font-black text-stone-700 sm:hidden" aria-label="Bag">🎒</button>
          <button type="button" onClick={onGoals} className="min-h-[44px] min-w-[44px] rounded-xl bg-white/80 px-2 text-xs font-black text-stone-700 sm:hidden" aria-label="Goals">✨</button>
          <button type="button" onClick={onResetView} className="min-h-[44px] min-w-[44px] rounded-xl bg-white/80 px-2 text-xs font-black text-stone-600" aria-label="Reset view" title="Reset view">⌂</button>
          <button type="button" onClick={onToggleMusic} className="min-h-[44px] min-w-[44px] rounded-xl bg-white/80 px-2 text-xs font-black text-stone-600" aria-label={musicMuted ? 'Unmute music' : 'Mute music'}>{musicMuted ? '🔇' : '🔊'}</button>
          <button type="button" onClick={onWorld} className="min-h-[44px] rounded-xl bg-stone-900 px-3 text-[10px] font-black text-white">World</button>
        </div>

        <div className="pointer-events-none fixed bottom-[calc(10.65rem+env(safe-area-inset-bottom))] left-1/2 max-w-[calc(100vw-8rem)] -translate-x-1/2 rounded-full bg-stone-900/68 px-3 py-1 text-center text-[9px] font-bold text-white/82 backdrop-blur-md sm:hidden">Move with the joystick · drag to look</div>
      </div>
    </>
  );
}
