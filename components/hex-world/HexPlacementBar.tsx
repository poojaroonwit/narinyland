"use client";

import React from 'react';

export function HexPlacementBar({ mode, busy, valid, reason, onRotateLeft, onRotateRight, onConfirm, onCancel }: {
  mode: 'placing' | 'moving'; busy: boolean; valid: boolean; reason?: string | null;
  onRotateLeft: () => void; onRotateRight: () => void; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-[94] flex -translate-x-1/2 flex-col items-center gap-1.5">
      {!valid && reason && <div className="rounded-full bg-stone-900/78 px-3 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur">{reason}</div>}
      <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/92 p-2 shadow-2xl backdrop-blur-xl">
        <button type="button" onClick={onRotateLeft} className="h-11 w-11 rounded-full bg-stone-100 font-black text-stone-600">↺</button>
        <button type="button" onClick={onConfirm} disabled={!valid || busy} className="min-h-[44px] rounded-full bg-emerald-700 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-stone-300">{busy ? 'Saving…' : mode === 'moving' ? 'Move here' : 'Place'}</button>
        <button type="button" onClick={onRotateRight} className="h-11 w-11 rounded-full bg-stone-100 font-black text-stone-600">↻</button>
        <button type="button" onClick={onCancel} className="h-11 w-11 rounded-full bg-stone-100 font-black text-stone-500">×</button>
      </div>
    </div>
  );
}
