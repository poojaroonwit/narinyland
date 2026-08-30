"use client";

import React from 'react';
import type { HexViewMode } from '@/lib/hex-world/view-mode';

export type HexGameplayAction = 'family' | 'farm' | 'build' | 'bag' | 'goals' | null;

export function HexWorldToolbar({
  onFamily,
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
  onFamily: () => void;
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
  const primary = 'min-h-[48px] min-w-[58px] rounded-[1rem] px-2 text-[9px] font-black transition active:scale-95 sm:min-w-[72px] sm:px-3 sm:text-[10px]';
  const actionClass = (key: Exclude<HexGameplayAction, null>, active: string) => `${primary} ${activeAction === key ? active : 'bg-white/88 text-stone-700 shadow-sm ring-1 ring-stone-900/[0.035]'}`;
  const modeClass = (mode: HexViewMode) => `min-h-[34px] rounded-full px-3 text-[9px] font-black transition ${viewMode === mode ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:bg-white/75'}`;

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] left-1/2 z-[90] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col items-center gap-1.5">
      <div className="pointer-events-auto flex items-center rounded-full border border-white/70 bg-[#fffaf2]/82 p-0.5 shadow-lg shadow-stone-950/[0.05] backdrop-blur-xl" aria-label="World view mode">
        <button type="button" onClick={() => onViewModeChange('world')} className={modeClass('world')}>World</button>
        <button type="button" onClick={() => onViewModeChange('person')} className={modeClass('person')}>Explore</button>
      </div>

      {viewMode === 'person' && (
        <div className="hidden rounded-full border border-white/70 bg-stone-900/72 px-3 py-1 text-[10px] font-bold text-white/90 shadow-lg backdrop-blur-md sm:block">
          WASD / arrows · drag to look
        </div>
      )}

      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-[1.45rem] border border-white/80 bg-[#fffaf2]/94 p-1.5 shadow-2xl shadow-rose-950/[0.09] backdrop-blur-2xl sm:gap-1.5">
        <button type="button" onClick={onFamily} className={actionClass('family', 'bg-rose-500 text-white shadow-lg shadow-rose-900/20')}><span className="block text-base leading-none">💗</span>Family</button>

        {viewMode === 'world' && (
          <>
            <button type="button" onClick={onFarm} className={actionClass('farm', 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/20')}><span className="block text-base leading-none">🌱</span>Farm</button>
            <button type="button" onClick={onBuild} className={actionClass('build', 'bg-stone-900 text-white shadow-lg')}><span className="block text-base leading-none">🔨</span>Build</button>
          </>
        )}

        <button type="button" onClick={onBag} className={actionClass('bag', 'bg-amber-500 text-white shadow-lg shadow-amber-900/15')}><span className="block text-base leading-none">🎒</span>Bag</button>
        <button type="button" onClick={onGoals} className={actionClass('goals', 'bg-violet-600 text-white shadow-lg shadow-violet-900/15')}><span className="block text-base leading-none">✨</span>Goals</button>

        <div className="ml-0.5 flex flex-col gap-1 border-l border-stone-900/[0.07] pl-1 sm:pl-1.5">
          {viewMode === 'world' && <button type="button" onClick={onExpand} aria-label="Grow land" title="Grow land" className="h-[23px] w-8 rounded-md bg-amber-50 text-[10px] font-black text-amber-700">⬡+</button>}
          <button type="button" onClick={onResetView} aria-label="Reset view" title={viewMode === 'person' ? 'Reset player view' : 'Reset world view'} className="h-[23px] w-8 rounded-md bg-stone-100 text-[10px] font-black text-stone-500">⌂</button>
        </div>
      </div>

      {viewMode === 'person' && (
        <div className="max-w-[calc(100vw-2rem)] rounded-full bg-stone-900/68 px-3 py-1 text-center text-[9px] font-bold text-white/85 backdrop-blur-md sm:hidden">
          Drag to look · movement uses the on-screen controls
        </div>
      )}
    </div>
  );
}
