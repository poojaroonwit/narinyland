"use client";

import React from 'react';

export function HexRemovalConfirm({ name, important, busy, onConfirm, onCancel }: { name: string; important: boolean; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-950/20 p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] md:items-center md:pb-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/80 bg-[#fffdf8] p-5 shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Remove object</p>
        <h3 className="mt-1 text-lg font-black text-stone-800">Remove {name}?</h3>
        <p className="mt-2 text-sm font-medium text-stone-500">{important ? 'This is an important homestead structure. You can place it again later.' : 'This decoration will be removed from your Land.'}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} className="min-h-[44px] flex-1 rounded-full bg-stone-100 text-sm font-black text-stone-600">Cancel</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="min-h-[44px] flex-1 rounded-full bg-rose-600 text-sm font-black text-white disabled:bg-stone-300">{busy ? 'Removing…' : 'Remove'}</button>
        </div>
      </div>
    </div>
  );
}
