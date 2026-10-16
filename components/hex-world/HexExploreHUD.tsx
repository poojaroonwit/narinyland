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
  const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);

  if (!state) {
    return (
      <div className="pointer-events-none fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] left-1/2 z-[92] -translate-x-1/2">
        <div className="cozy-float rounded-full px-4 py-2 text-xs font-medium">Exploring the homestead…</div>
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
        <div data-hex-explore-status className="pointer-events-auto min-w-0 max-w-[46vw] cozy-surface rounded-[1.15rem] p-3 max-sm:fixed max-sm:bottom-[calc(12.45rem+env(safe-area-inset-bottom))] max-sm:left-[calc(0.85rem+env(safe-area-inset-left))] max-sm:max-w-[48vw] sm:w-[260px] sm:max-w-none">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d4ddc8] bg-[#e8f0e3] text-sm font-semibold text-[#496750]">{state.level}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-[#61584d]"><span>Level {state.level}</span><span>{state.xp}/{nextXp} XP</span></div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e6ddce]"><div className="h-full rounded-full bg-[#85a48c]" style={{ width: `${xpPercent}%` }} /></div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-[#6b5f51]"><span>⚡ {state.energy}/{state.maxEnergy}</span><span>🪙 {state.coins}</span></div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#e6ddce]"><div className="h-full rounded-full bg-[#c6a87b]" style={{ width: `${energyPercent}%` }} /></div>
            </div>
          </div>
          <div className="mt-2 hidden items-center gap-3 border-t border-[#e9ddcc] pt-2 text-[10px] font-medium text-[#7a705f] sm:flex"><span>💗 {state.hearts}</span><span>✨ {points}</span><span className="truncate">Day {state.day}</span></div>
        </div>

        <div className="hidden flex-col items-center gap-1.5 sm:flex">
          <div className="cozy-float rounded-full px-3 py-1.5 text-[10px] font-medium">WASD / arrows · drag to look · wheel to zoom</div>
          <div className="flex items-center gap-1 cozy-float rounded-2xl p-1.5">
            <button type="button" onClick={onBag} className="min-h-[44px] min-w-[56px] rounded-xl bg-[#f0e8da] px-2.5 text-[11px] font-semibold text-[#514a3d] hover:bg-[#e4eddd]">🎒<span className="ml-1">Bag</span></button>
            <button type="button" onClick={onGoals} className="min-h-[44px] min-w-[64px] rounded-xl bg-[#f0e8da] px-2.5 text-[11px] font-semibold text-[#514a3d] hover:bg-[#e4eddd]">✨<span className="ml-1">Goals</span></button>
          </div>
        </div>

        <div data-hex-explore-actions className="pointer-events-auto flex shrink-0 items-center gap-1 cozy-float rounded-2xl p-1.5">
          <button type="button" onClick={onBag} className="min-h-[44px] min-w-[44px] rounded-xl bg-[#f0e8da] px-2 text-xs font-semibold text-[#514a3d] hover:bg-[#e4eddd] sm:hidden" aria-label="Bag">🎒</button>
          <div className="relative sm:hidden">
            <button type="button" onClick={() => setMobileMoreOpen((open) => !open)} aria-label="More explore actions" aria-expanded={mobileMoreOpen} className="min-h-[44px] min-w-[44px] rounded-xl bg-[#f0e8da] px-2 text-xs font-semibold text-[#514a3d]">⋯</button>
            {mobileMoreOpen && (
              <div role="group" aria-label="More explore actions" className="absolute bottom-[calc(100%+0.5rem)] right-0 z-[99] flex w-[160px] flex-col gap-1 rounded-2xl border border-white/75 bg-[#fffdf7] p-2 text-left shadow-2xl">
                <button type="button" onClick={() => { setMobileMoreOpen(false); onGoals(); }} className="min-h-[44px] rounded-xl px-3 text-left text-xs font-semibold text-stone-700">✨ Goals</button>
                <button type="button" onClick={() => { setMobileMoreOpen(false); onResetView(); }} className="min-h-[44px] rounded-xl px-3 text-left text-xs font-semibold text-stone-700">⌂ Reset view</button>
                <button type="button" onClick={() => { setMobileMoreOpen(false); onToggleMusic(); }} className="min-h-[44px] rounded-xl px-3 text-left text-xs font-semibold text-stone-700">{musicMuted ? '🔇 Unmute' : '🔊 Mute'}</button>
              </div>
            )}
          </div>
          <button type="button" onClick={onResetView} className="hidden min-h-[44px] min-w-[44px] rounded-xl bg-[#f0e8da] px-2 text-xs font-semibold text-[#514a3d] hover:bg-[#e4eddd] sm:block" aria-label="Reset view" title="Reset view">⌂</button>
          <button type="button" onClick={onToggleMusic} className="hidden min-h-[44px] min-w-[44px] rounded-xl bg-[#f0e8da] px-2 text-xs font-semibold text-[#514a3d] hover:bg-[#e4eddd] sm:block" aria-label={musicMuted ? 'Unmute music' : 'Mute music'}>{musicMuted ? '🔇' : '🔊'}</button>
          <button type="button" onClick={onWorld} className="min-h-[44px] cozy-button-primary rounded-xl px-3 text-[11px] font-semibold">World</button>
        </div>

      </div>
    </>
  );
}
