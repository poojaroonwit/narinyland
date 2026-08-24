"use client";

import React from 'react';
import type { HexViewMode } from '@/lib/hex-world/view-mode';

export type HexGameplayAction = 'farm' | 'build' | 'bag' | 'goals' | null;

export function HexWorldToolbar({
  onFarm,
  onBuild,
  onBag,
  onGoals,
  onExpand,
  onResetView,
  viewMode,
  onViewModeChange,
  activeAction = null,
}: {
  onFarm: () => void;
  onBuild: () => void;
  onBag: () => void;
  onGoals: () => void;
  onExpand: () => void;
  onResetView: () => void;
  viewMode: HexViewMode;
  onViewModeChange: (mode: HexViewMode) => void;
  activeAction?: HexGameplayAction;
}) {
  const primary = 'min-h-[44px] min-w-[56px] rounded-xl px-2 text-[9px] font-black transition active:scale-95 sm:min-w-[68px] sm:px-2.5 sm:text-[10px]';
  const actionClass = (key: Exclude<HexGameplayAction, null>, active: string) => `${primary} ${activeAction === key ? active : 'bg-white/86 text-stone-700 shadow-sm'}`;
  const modeClass = (mode: HexViewMode) => `min-h-[44px] rounded-lg px-2.5 text-[9px] font-black transition sm:text-[10px] ${viewMode === mode ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-white/75'}`;

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] left-1/2 z-[90] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col items-center gap-1.5">
      {viewMode === 'person' && (
        <div className="hidden rounded-full border border-white/70 bg-stone-900/72 px-3 py-1 text-[10px] font-bold text-white/90 shadow-lg backdrop-blur-md sm:block">
          WASD / arrows · drag to look
        </div>
      )}
      <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-[1.15rem] border border-white/75 bg-[#fffdf7]/90 p-1.5 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-xl sm:gap-1.5">
        <div className="flex shrink-0 rounded-[0.7rem] bg-stone-100/90 p-0.5" aria-label="World view mode">
          <button type="button" onClick={() => onViewModeChange('world')} className={modeClass('world')}>World</button>
          <button type="button" onClick={() => onViewModeChange('person')} className={modeClass('person')}>Explore</button>
        </div>

        {viewMode === 'world' && (
          <>
            <button type="button" onClick={onFarm} className={actionClass('farm', 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/20')}><span className="block text-sm leading-none">🌱</span>Farm</button>
            <button type="button" onClick={onBuild} className={actionClass('build', 'bg-stone-900 text-white shadow-lg')}><span className="block text-sm leading-none">🔨</span>Build</button>
          </>
        )}

        <button type="button" onClick={onBag} className={actionClass('bag', 'bg-amber-500 text-white shadow-lg shadow-amber-900/15')}><span className="block text-sm leading-none">🎒</span>Bag</button>
        <button type="button" onClick={onGoals} className={actionClass('goals', 'bg-violet-600 text-white shadow-lg shadow-violet-900/15')}><span className="block text-sm leading-none">✨</span>Goals</button>

        <div className="ml-0.5 flex flex-col gap-1 border-l border-stone-900/[0.07] pl-1 sm:pl-1.5">
          {viewMode === 'world' && <button type="button" onClick={onExpand} aria-label="Grow land" title="Grow land" className="h-[22px] w-8 rounded-md bg-amber-50 text-[10px] font-black text-amber-700">⬡+</button>}
          <button type="button" onClick={onResetView} aria-label="Reset view" title={viewMode === 'person' ? 'Reset player view' : 'Reset world view'} className="h-[22px] w-8 rounded-md bg-stone-100 text-[10px] font-black text-stone-500">⌂</button>
        </div>
      </div>
      {viewMode === 'person' && (
        <div className="max-w-[calc(100vw-2rem)] rounded-full bg-stone-900/68 px-3 py-1 text-center text-[9px] font-bold text-white/85 backdrop-blur-md sm:hidden">
          Drag to look · movement requires a keyboard
        </div>
      )}
    </div>
  );
}
