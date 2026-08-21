"use client";

import React from 'react';
import { createLandingHexWorldSnapshot } from '@/lib/hex-world/landing-world';
import { HexWorld3D } from './HexWorld3D';

export function HexWorldLoading({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  const preview = React.useMemo(() => createLandingHexWorldSnapshot(), []);

  return (
    <div className="fixed inset-0 z-10 overflow-hidden bg-[#edf6e9]">
      <div className="absolute inset-0 opacity-70 saturate-[0.85]">
        <HexWorld3D snapshot={preview} graphicsQuality="low" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-white/15 backdrop-blur-[1px]" />

      <div className="absolute left-4 top-4 z-20 flex h-10 items-center gap-2 rounded-full border border-white/60 bg-white/55 px-4 text-stone-700 shadow-lg backdrop-blur-md md:left-6 md:top-6">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs text-white">♥</span>
        <span className="text-xs font-black">Narinyland</span>
      </div>

      <div className="absolute right-4 top-4 z-20 hidden items-center gap-2 rounded-full border border-white/50 bg-white/40 px-4 py-3 text-xs font-bold text-gray-700 shadow-lg backdrop-blur-md sm:flex md:right-6 md:top-6">
        <i className="fas fa-map-marked-alt text-[11px] text-amber-500" />
        <span>Loading Land</span>
      </div>

      <div className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 z-20 w-[min(92vw,24rem)] -translate-x-1/2 rounded-[1.75rem] border border-white/75 bg-white/85 px-5 py-4 text-center shadow-2xl backdrop-blur-xl md:bottom-8">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${error ? 'bg-rose-500' : 'animate-pulse bg-emerald-500'}`} />
          <p className="text-sm font-black text-stone-800">{error ? 'Land unavailable' : 'Loading Land'}</p>
        </div>
        {error ? (
          <>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-stone-500">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 min-h-[40px] rounded-full bg-emerald-700 px-5 text-xs font-black text-white shadow-lg transition hover:bg-emerald-800 active:scale-95"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-stone-500">Preparing your floating homestead…</p>
            <div className="mx-auto mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-emerald-100/90">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-500" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
