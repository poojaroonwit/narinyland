"use client";

import React from 'react';

export function HexWorldLoading({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50">
      <div className="rounded-3xl border border-white/80 bg-white/85 px-7 py-6 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">{error ? '☁️' : '🌿'}</div>
        <p className="font-black text-stone-800">{error ? 'Could not load this Land' : 'Growing your floating homestead…'}</p>
        {error ? <><p className="mt-2 max-w-sm text-sm text-stone-500">{error}</p><button type="button" onClick={onRetry} className="mt-4 rounded-full bg-emerald-700 px-5 py-2 text-sm font-black text-white shadow-lg">Retry</button></> : <div className="mx-auto mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-emerald-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-500" /></div>}
      </div>
    </div>
  );
}
