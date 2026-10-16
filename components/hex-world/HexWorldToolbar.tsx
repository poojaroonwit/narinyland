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
  const primary = 'min-h-[48px] min-w-[56px] rounded-[0.9rem] px-2 text-[11px] font-semibold transition-colors active:scale-[0.98] sm:min-w-[68px] sm:px-3';
  const actionClass = (key: Exclude<HexGameplayAction, null>, active: string) => `${primary} ${activeAction === key ? active : 'bg-[#f3eddf] text-[#5f5345] hover:bg-[#e4eddd]'}`;
  const modeClass = (mode: HexViewMode) => `min-h-9 rounded-xl px-3 text-[11px] font-semibold transition-colors ${viewMode === mode ? 'bg-[#476b55] text-white' : 'text-[#6f6357] hover:bg-[#e9f0e3]'}`;

  return (
    <div data-hex-world-toolbar className="pointer-events-none fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] left-1/2 z-[90] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col items-center gap-1.5">
      <div className="pointer-events-auto flex items-center cozy-float rounded-xl p-1" aria-label="World view mode">
        <button type="button" onClick={() => onViewModeChange('world')} className={modeClass('world')}>World</button>
        <button type="button" onClick={() => onViewModeChange('person')} className={modeClass('person')}>Explore</button>
      </div>

      {viewMode === 'person' && (
        <div className="hidden cozy-float rounded-full px-3 py-1.5 text-[10px] font-medium sm:block">
          WASD / arrows · desktop movement requires a keyboard · drag to look
        </div>
      )}

      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto cozy-nav rounded-[1.3rem] p-1.5 sm:gap-1.5">
        <button type="button" onClick={onFamily} className={actionClass('family', 'bg-[#476b55] text-white')}><span className="block text-base leading-none">💗</span>Family</button>

        {viewMode === 'world' && (
          <>
            <button type="button" onClick={onFarm} className={actionClass('farm', 'bg-[#476b55] text-white')}><span className="block text-base leading-none">🌱</span>Farm</button>
            <button type="button" onClick={onBuild} className={actionClass('build', 'bg-[#476b55] text-white')}><span className="block text-base leading-none">🔨</span>Build</button>
          </>
        )}

        <button type="button" onClick={onBag} className={actionClass('bag', 'bg-[#476b55] text-white')}><span className="block text-base leading-none">🎒</span>Bag</button>
        <button type="button" onClick={onGoals} className={actionClass('goals', 'bg-[#476b55] text-white')}><span className="block text-base leading-none">✨</span>Goals</button>

        <div className="ml-0.5 flex flex-col gap-1 border-l border-[#ddcfbc] pl-1 sm:pl-1.5">
          {viewMode === 'world' && <button type="button" onClick={onExpand} aria-label="Grow land" title="Grow land" className="h-[23px] w-8 rounded-md bg-[#eee4d2] text-xs font-semibold text-[#765c35]">⬡+</button>}
          <button type="button" onClick={onResetView} aria-label="Reset view" title={viewMode === 'person' ? 'Reset player view' : 'Reset world view'} className="h-[23px] w-8 rounded-md bg-[#eee4d2] text-xs font-semibold text-[#5c5246]">⌂</button>
        </div>
      </div>

      {viewMode === 'person' && (
        <div className="max-w-[calc(100vw-2rem)] cozy-float rounded-full px-3 py-1.5 text-center text-[10px] font-medium sm:hidden">
          Drag to look · movement uses the on-screen controls
        </div>
      )}
    </div>
  );
}
