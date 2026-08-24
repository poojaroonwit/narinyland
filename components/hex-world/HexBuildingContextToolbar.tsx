"use client";

import React from 'react';

export function HexBuildingContextToolbar({ removable, busy, onMove, onRotate, onRemove, onClose }: {
  removable: boolean; busy: boolean; onMove: () => void; onRotate: () => void; onRemove: () => void; onClose: () => void;
}) {
  const button = 'min-h-[40px] rounded-xl px-2.5 text-[9px] font-black shadow-sm transition active:scale-95';
  return (
    <div data-hex-edit-toolbar className="pointer-events-auto fixed right-3 top-[6.2rem] z-[93] flex flex-col gap-1.5 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-xl shadow-stone-950/[0.08] backdrop-blur-xl md:right-5 md:top-[6.7rem]">
      <button type="button" onClick={onMove} className={`${button} bg-stone-100 text-stone-700`}>↔ Move</button>
      <button type="button" onClick={onRotate} disabled={busy} className={`${button} bg-stone-100 text-stone-700 disabled:opacity-45`}>↻ Rotate</button>
      {removable && <button type="button" onClick={onRemove} disabled={busy} className={`${button} bg-rose-50 text-rose-600 disabled:opacity-45`}>Remove</button>}
      <button type="button" onClick={onClose} aria-label="Deselect building" className="h-10 rounded-xl text-[9px] font-black text-stone-400">Close</button>
    </div>
  );
}
