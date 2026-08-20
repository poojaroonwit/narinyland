"use client";

import React from 'react';

export function HexWorldToolbar({ onBuild, onExpand, onResetView }: { onBuild: () => void; onExpand: () => void; onResetView: () => void }) {
  const button = 'min-h-[44px] rounded-full px-4 text-xs font-black shadow-lg transition active:scale-95';
  return (
    <div className="fixed bottom-[calc(6.6rem+env(safe-area-inset-bottom))] left-1/2 z-[86] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/75 bg-white/88 p-2 shadow-2xl backdrop-blur-xl">
      <button type="button" onClick={onBuild} className={`${button} bg-emerald-700 text-white`}>🔨 Build</button>
      <button type="button" onClick={onExpand} className={`${button} bg-amber-500 text-white`}>⬡ Expand</button>
      <button type="button" onClick={onResetView} className={`${button} bg-stone-100 text-stone-700`}>⌂ Reset View</button>
    </div>
  );
}
