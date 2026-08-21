"use client";

import React from 'react';
import { motion } from 'framer-motion';
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
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.025 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <HexWorld3D snapshot={snapshot} graphicsQuality="medium" />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-stone-900/[0.07] via-transparent to-white/[0.04]" />

      <motion.div
        className="pointer-events-auto fixed left-4 top-4 z-[70] md:left-6 md:top-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.25 }}
      >
        <div className="flex h-10 items-center gap-2 rounded-full bg-white/40 px-3.5 shadow-md backdrop-blur-lg">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-[11px] text-white shadow-sm">♥</span>
          <span className="text-xs font-black tracking-tight text-stone-800 md:text-sm">Narinyland</span>
        </div>
      </motion.div>

      <motion.div
        className="pointer-events-auto fixed right-4 top-4 z-[70] flex items-center gap-2 md:right-6 md:top-6 md:gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.32 }}
      >
        <div className="hidden h-9 items-center gap-2 rounded-full bg-white/30 px-3.5 text-gray-700 shadow-sm backdrop-blur-lg sm:flex">
          <i className="fas fa-globe-asia text-[10px] text-emerald-500" />
          <span className="max-w-[110px] truncate text-[11px] font-bold">Narinyland</span>
        </div>
        <div className="hidden h-9 items-center gap-2 rounded-full bg-white/30 px-3.5 text-gray-700 shadow-sm backdrop-blur-lg lg:flex">
          <i className="fas fa-map-marked-alt text-[10px] text-amber-500" />
          <span className="max-w-[110px] truncate text-[11px] font-bold">Welcome Land</span>
        </div>
        <motion.button
          type="button"
          onClick={enterWorld}
          disabled={entering}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex h-10 items-center gap-2 rounded-full bg-white/[0.82] px-4 text-xs font-black text-stone-800 shadow-lg backdrop-blur-xl disabled:cursor-wait disabled:opacity-70"
        >
          <i className={`fas ${entering ? 'fa-spinner fa-spin' : 'fa-arrow-right-to-bracket'} text-[11px] text-pink-500`} />
          <span>{entering ? 'Entering…' : 'Enter World'}</span>
        </motion.button>
      </motion.div>

      <motion.section
        className="pointer-events-none fixed bottom-[calc(6.9rem+env(safe-area-inset-bottom))] left-4 z-[60] w-[min(34rem,calc(100vw-2rem))] md:bottom-28 md:left-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-[32rem]">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/[0.38] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800 shadow-sm backdrop-blur-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
            Your shared world
          </div>

          <h1 className="max-w-[31rem] text-3xl font-black leading-[1.02] tracking-[-0.045em] text-stone-950 drop-shadow-[0_1px_16px_rgba(255,255,255,0.9)] sm:text-4xl md:text-6xl">
            A little world that belongs to both of you.
          </h1>

          <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-stone-700 drop-shadow-[0_1px_10px_rgba(255,255,255,0.95)] md:text-base">
            Build a floating homestead, keep your memories close, and grow a world together—one little moment at a time.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <motion.button
              type="button"
              onClick={enterWorld}
              disabled={entering}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="pointer-events-auto flex min-h-[46px] items-center gap-3 rounded-full bg-emerald-700 px-5 text-sm font-black text-white shadow-xl shadow-emerald-950/15 disabled:cursor-wait disabled:opacity-70"
            >
              <span>{entering ? 'Opening your world…' : 'Enter Narinyland'}</span>
              <i className={`fas ${entering ? 'fa-spinner fa-spin' : 'fa-arrow-right'} text-[11px]`} />
            </motion.button>

            <div className="flex items-center gap-2 text-xs font-bold text-stone-600 drop-shadow-[0_1px_8px_rgba(255,255,255,0.95)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/40 shadow-sm backdrop-blur-md">
                <i className="fas fa-hand-pointer text-[10px] text-emerald-700" />
              </span>
              <span>Explore the world</span>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.nav
        className="pointer-events-auto fixed bottom-[calc(1.15rem+env(safe-area-inset-bottom))] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/45 bg-white/[0.78] px-4 py-2.5 shadow-2xl backdrop-blur-xl sm:gap-5 sm:px-5 md:bottom-6 md:gap-8 md:px-6 md:py-3"
        aria-label="Narinyland preview navigation"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.58 }}
      >
        {NAV_ITEMS.map((item, index) => (
          <button
            type="button"
            key={item.label}
            onClick={index === 0 ? undefined : enterWorld}
            className={`flex min-w-[42px] flex-col items-center gap-0.5 transition-all duration-300 sm:min-w-0 sm:gap-1 ${index === 0 ? `scale-105 ${item.tone}` : 'text-gray-400 hover:text-gray-600'}`}
            aria-label={index === 0 ? `${item.label} preview` : `Sign in to open ${item.label}`}
          >
            <i className={`fas ${item.icon} text-lg sm:text-xl`} />
            <span className="text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">{item.label}</span>
          </button>
        ))}
      </motion.nav>
    </main>
  );
}
