"use client";

import React, { useEffect, useMemo, useState } from 'react';
import type { HexUndoMeta } from '@/lib/hex-world/undo-types';

export function HexUndoToast({
  undo,
  label,
  busy,
  onUndo,
  onExpire,
}: {
  undo: HexUndoMeta;
  label: string;
  busy: boolean;
  onUndo: () => void;
  onExpire: () => void;
}) {
  const expiresAtMs = useMemo(() => Date.parse(undo.expiresAt), [undo.expiresAt]);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAtMs - Date.now()));

  useEffect(() => {
    const update = () => setRemainingMs(Math.max(0, expiresAtMs - Date.now()));
    update();
    const timeout = setTimeout(onExpire, Math.max(0, expiresAtMs - Date.now()));
    const interval = setInterval(update, 250);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [expiresAtMs, onExpire]);

  if (remainingMs <= 0) return null;

  return (
    <div className="pointer-events-auto fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/60 bg-white/92 px-3 py-2 shadow-lg backdrop-blur-md bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] md:bottom-6">
      <div className="flex items-center gap-3 text-sm text-slate-700">
        <span className="max-w-[62vw] truncate font-medium">{label}</span>
        <button
          type="button"
          disabled={busy}
          onClick={onUndo}
          className="min-h-11 rounded-full bg-emerald-700 px-4 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >Undo</button>
      </div>
    </div>
  );
}
