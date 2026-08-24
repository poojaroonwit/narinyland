"use client";

import React from 'react';

export type HexGameplayAction = 'farm' | 'build' | 'bag' | 'goals' | null;

export function HexWorldToolbar({
  onFarm,
  onBuild,
  onBag,
  onGoals,
  onExpand,
  onResetView,
  activeAction = null,
}: {
  onFarm: () => void;
  onBuild: () => void;
  onBag: () => void;
  onGoals: () => void;
  onExpand: () => void;
  onResetView: () => void;
  activeAction?: HexGameplayAction;
}) {
  const primary = 'min-h-[48px] min-w-[68px] rounded-2xl px-3 text-[10px] font-black transition active:scale-95';
  const actionClass = (key: Exclude<HexGameplayAction, null>, active: string) => `${primary} ${activeAction === key ? active : 'bg-white/86 text-stone-700 shadow-sm'}`;

  return (
    <div className="pointer-events-auto fixed bottom-[calc(6.1rem+env(safe-area-inset-bottom))] left-1/2 z-[90] flex -translate-x-1/2 items-center gap-1.5 rounded-[1.35rem] border border-white/75 bg-[#fffdf7]/88 p-1.5 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-xl">
      <button type="button" onClick={onFarm} className={actionClass('farm', 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/20')}><span className="block text-base leading-none">🌱</span>Farm</button>
      <button type="button" onClick={onBuild} className={actionClass('build', 'bg-stone-900 text-white shadow-lg')}><span className="block text-base leading-none">🔨</span>Build</button>
      <button type="button" onClick={onBag} className={actionClass('bag', 'bg-amber-500 text-white shadow-lg shadow-amber-900/15')}><span className="block text-base leading-none">🎒</span>Bag</button>
      <button type="button" onClick={onGoals} className={actionClass('goals', 'bg-violet-600 text-white shadow-lg shadow-violet-900/15')}><span className="block text-base leading-none">✨</span>Goals</button>
      <div className="ml-0.5 flex flex-col gap-1 border-l border-stone-900/[0.07] pl-1.5">
        <button type="button" onClick={onExpand} aria-label="Grow land" title="Grow land" className="h-[22px] w-9 rounded-lg bg-amber-50 text-[11px] font-black text-amber-700">⬡+</button>
        <button type="button" onClick={onResetView} aria-label="Reset view" title="Reset view" className="h-[22px] w-9 rounded-lg bg-stone-100 text-[11px] font-black text-stone-500">⌂</button>
      </div>
    </div>
  );
}
