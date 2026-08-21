"use client";

import React from 'react';
import { login } from '@/lib/auth';
import { createLandingHexWorldSnapshot } from '@/lib/hex-world/landing-world';
import { HexWorld3D } from '@/components/hex-world/HexWorld3D';

const NAV_ITEMS = [
  { label: 'Home', icon: 'fa-home', tone: 'text-pink-500' },
  { label: 'Timeline', icon: 'fa-calendar-alt', tone: 'text-blue-500' },
  { label: 'Coupons', icon: 'fa-ticket-alt', tone: 'text-purple-500' },
  { label: 'Letters', icon: 'fa-envelope', tone: 'text-rose-500' },
] as const;

export function LandingWorldExperience() {
  const snapshot = React.useMemo(() => createLandingHexWorldSnapshot(), []);
  const [entering, setEntering] = React.useState(false);

  const enterWorld = async () => {
    if (entering) return;
    setEntering(true);
    try {
      await login();
    } finally {
      setEntering(false);
    }
  };

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#edf6e9] text-stone-800">
      <div className="absolute inset-0">
        <HexWorld3D snapshot={snapshot} graphicsQuality="medium" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-white/35 via-transparent to-transparent md:from-white/20" />

      <div className="pointer-events-auto fixed left-4 top-4 z-[70] md:left-6 md:top-6">
        <div className="flex h-11 items-center gap-2 rounded-full border border-white/60 bg-white/55 px-4 shadow-lg backdrop-blur-md">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-sm text-white shadow-sm">♥</span>
          <span className="text-sm font-black tracking-tight text-stone-800">Narinyland</span>
        </div>
      </div>

      <div className="pointer-events-auto fixed right-4 top-4 z-[70] flex items-center gap-2 md:right-6 md:top-6 md:gap-3">
        <div className="hidden h-10 items-center gap-2 rounded-full border border-white/50 bg-white/40 px-4 text-gray-700 shadow-lg backdrop-blur-md sm:flex">
          <i className="fas fa-globe-asia text-xs text-emerald-500" />
          <span className="max-w-[120px] truncate text-xs font-bold">Narinyland</span>
        </div>
        <div className="hidden h-10 items-center gap-2 rounded-full border border-white/50 bg-white/40 px-4 text-gray-700 shadow-lg backdrop-blur-md md:flex">
          <i className="fas fa-map-marked-alt text-xs text-amber-500" />
          <span className="max-w-[120px] truncate text-xs font-bold">Welcome Land</span>
        </div>
        <button
          type="button"
          onClick={enterWorld}
          disabled={entering}
          className="flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white/85 px-4 text-xs font-black text-stone-800 shadow-xl backdrop-blur-xl transition hover:scale-105 hover:bg-white disabled:cursor-wait disabled:opacity-70"
        >
          <i className={`fas ${entering ? 'fa-spinner fa-spin' : 'fa-arrow-right-to-bracket'} text-[11px] text-pink-500`} />
          <span>{entering ? 'Entering…' : 'Enter World'}</span>
        </button>
      </div>

      <section className="pointer-events-auto fixed bottom-32 left-4 z-[60] max-w-[min(30rem,calc(100vw-2rem))] md:bottom-28 md:left-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/72 p-5 shadow-2xl backdrop-blur-xl md:p-7">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Your shared world
          </div>
          <h1 className="max-w-md text-3xl font-black leading-[1.05] tracking-[-0.04em] text-stone-900 md:text-5xl">
            A little world that belongs to both of you.
          </h1>
          <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-stone-600 md:text-base">
            Build your floating homestead, keep your memories close, and let your story live inside the world you grow together.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={enterWorld}
              disabled={entering}
              className="min-h-[44px] rounded-full bg-emerald-700 px-5 text-sm font-black text-white shadow-lg transition hover:scale-105 hover:bg-emerald-800 active:scale-95 disabled:cursor-wait disabled:opacity-70"
            >
              {entering ? 'Opening your world…' : 'Enter Narinyland'}
            </button>
            <span className="rounded-full border border-white/70 bg-white/55 px-4 py-2 text-xs font-bold text-stone-600 shadow-sm backdrop-blur-md">
              Live world preview
            </span>
          </div>
        </div>
      </section>

      <nav
        className="pointer-events-auto fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-5 rounded-full border border-white/50 bg-white/80 px-5 py-3 shadow-2xl backdrop-blur-md md:bottom-6 md:gap-8 md:px-6"
        aria-label="Narinyland preview navigation"
      >
        {NAV_ITEMS.map((item, index) => (
          <button
            type="button"
            key={item.label}
            onClick={index === 0 ? undefined : enterWorld}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${index === 0 ? `scale-110 ${item.tone}` : 'text-gray-400 hover:text-gray-600'}`}
            aria-label={index === 0 ? `${item.label} preview` : `Sign in to open ${item.label}`}
          >
            <i className={`fas ${item.icon} text-xl`} />
            <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
