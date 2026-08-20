"use client";

import React from 'react';

export function HexBuildingContextToolbar({ removable, busy, onMove, onRotate, onRemove, onClose }: {
  removable: boolean; busy: boolean; onMove: () => void; onRotate: () => void; onRemove: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-[93] flex items-center gap-2 rounded-2xl border border-white/80 bg-white/92 p-2 shadow-2xl backdrop-blur-xl md:right-6">
      <button type="button" onClick={onMove} className="min-h-[44px] rounded-xl bg-stone-100 px-3 text-xs font-black text-stone-700">Move</button>
      <button type="button" onClick={onRotate} disabled={busy} className="min-h-[44px] rounded-xl bg-stone-100 px-3 text-xs font-black text-stone-700">Rotate</button>
      {removable && <button type="button" onClick={onRemove} disabled={busy} className="min-h-[44px] rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-600">Remove</button>}
      <button type="button" onClick={onClose} aria-label="Deselect building" className="h-11 w-11 rounded-full text-stone-400">×</button>
    </div>
  );
}
