"use client";

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { login } from '@/lib/auth';
import { createLandingHexWorldSnapshot } from '@/lib/hex-world/landing-world';
import { HexWorld3D } from '@/components/hex-world/HexWorld3D';

const NAV_ITEMS = [
  { label: 'Home', icon: 'fa-home', tone: 'text-pink-500' },
  { label: 'Timeline', icon: 'fa-calendar-alt', tone: 'text-blue-500' },
  { label: 'Coupons', icon: 'fa-ticket-alt', tone: 'text-purple-500' },
  { label: 'Letters', icon: 'fa-envelope', tone: 'text-rose-500' },
] as const;

const STORY_ITEMS = [
  {
    label: 'Timeline',
    icon: 'fa-calendar-alt',
    tone: 'text-blue-600',
    glow: 'bg-blue-100/70',
    copy: 'The small dates, firsts, trips, and ordinary days that become your story.',
  },
  {
    label: 'Letters',
    icon: 'fa-envelope',
    tone: 'text-rose-600',
    glow: 'bg-rose-100/70',
    copy: 'Words you can keep, return to, and read again when they matter most.',
  },
  {
    label: 'Coupons',
    icon: 'fa-ticket-alt',
    tone: 'text-purple-600',
    glow: 'bg-purple-100/70',
    copy: 'Little promises for dates, favors, adventures, and time made for each other.',
  },
] as const;

const CINEMATIC_MOTES = [
  { left: '8%', top: '18%', size: 5, delay: 0.2, duration: 9, drift: 12 },
  { left: '18%', top: '66%', size: 3, delay: 1.4, duration: 11, drift: -10 },
  { left: '31%', top: '28%', size: 4, delay: 2.1, duration: 10, drift: 8 },
  { left: '47%', top: '74%', size: 5, delay: 0.9, duration: 12, drift: -12 },
  { left: '58%', top: '20%', size: 3, delay: 3.2, duration: 9, drift: 10 },
  { left: '69%', top: '54%', size: 4, delay: 1.8, duration: 13, drift: -8 },
  { left: '78%', top: '27%', size: 5, delay: 2.8, duration: 11, drift: 13 },
  { left: '88%', top: '68%', size: 3, delay: 0.5, duration: 10, drift: -11 },
  { left: '94%', top: '38%', size: 4, delay: 3.6, duration: 12, drift: 7 },
] as const;

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-12%' },
  transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const },
};

export function LandingWorldExperience() {
  const snapshot = React.useMemo(() => createLandingHexWorldSnapshot(), []);
  const prefersReducedMotion = useReducedMotion();
  const [entering, setEntering] = React.useState(false);
  const heroRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const { scrollYProgress: pageScrollYProgress } = useScroll();

  const heroWorldOpacity = useTransform(scrollYProgress, [0, 0.66, 1], [1, 0.96, 0.3]);
  const heroWorldScale = useTransform(scrollYProgress, [0, 1], [1, 1.035]);
  const heroUiOpacity = useTransform(scrollYProgress, [0, 0.58, 0.9], [1, 0.92, 0]);
  const heroUiY = useTransform(scrollYProgress, [0, 1], [0, -42]);
  const atmosphereY = useTransform(pageScrollYProgress, [0, 1], [0, -150]);
  const sunlightX = useTransform(pageScrollYProgress, [0, 1], [0, 110]);
  const storyHazeY = useTransform(pageScrollYProgress, [0, 0.5, 1], [70, -20, -90]);

  const livingWorldDrift = prefersReducedMotion
    ? { x: 0, y: 0, scale: 1 }
    : { x: [0, 6, -4, 0], y: [0, -4, 3, 0], scale: [1, 1.006, 1.003, 1] };

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
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#edf6e9] text-stone-800">
      <motion.div
        aria-hidden="true"
        style={{ y: atmosphereY }}
        className="pointer-events-none fixed -inset-x-10 -inset-y-32 z-0 bg-[#edf6e9]"
      >
        <motion.div
          style={{ x: sunlightX }}
          className="absolute -right-[12vw] -top-[8vh] h-[52vw] min-h-[28rem] w-[52vw] min-w-[28rem] rounded-full bg-white/55 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_13%,rgba(255,255,255,0.9),transparent_31%),radial-gradient(circle_at_14%_45%,rgba(219,244,216,0.76),transparent_31%),radial-gradient(circle_at_76%_76%,rgba(205,236,211,0.68),transparent_35%)]" />
        <div className="absolute -left-[12vw] top-[82svh] h-[58vw] w-[58vw] rounded-full bg-white/28 blur-3xl" />
        <div className="absolute -right-[18vw] top-[160svh] h-[62vw] w-[62vw] rounded-full bg-emerald-100/35 blur-3xl" />
        <div className="absolute left-[10vw] top-[300svh] h-[48vw] w-[48vw] rounded-full bg-white/26 blur-3xl" />
      </motion.div>

      <motion.div
        aria-hidden="true"
        style={{ y: storyHazeY }}
        className="pointer-events-none fixed inset-x-0 top-[62svh] z-[1] h-[55svh]"
      >
        <div className="absolute left-[4%] top-[22%] h-24 w-[38%] rounded-[50%] bg-white/20 blur-3xl" />
        <div className="absolute right-[4%] top-[6%] h-32 w-[44%] rounded-[50%] bg-emerald-100/24 blur-3xl" />
        <div className="absolute left-[30%] top-[58%] h-24 w-[42%] rounded-[50%] bg-white/22 blur-3xl" />
      </motion.div>

      <section ref={heroRef} className="relative z-10 h-[100svh] min-h-[42rem] bg-transparent">
        <motion.div
          className="absolute -inset-3"
          style={{ opacity: heroWorldOpacity, scale: heroWorldScale }}
          initial={{ opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0.25 : 1.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="h-full w-full"
            animate={livingWorldDrift}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          >
            <HexWorld3D snapshot={snapshot} graphicsQuality="medium" />
          </motion.div>
        </motion.div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {CINEMATIC_MOTES.map((mote, index) => (
            <motion.span
              key={`${mote.left}-${mote.top}`}
              className={`absolute rounded-full ${index % 3 === 0 ? 'bg-white/75' : index % 3 === 1 ? 'bg-emerald-100/80' : 'bg-amber-100/70'}`}
              style={{ left: mote.left, top: mote.top, width: mote.size, height: mote.size }}
              animate={prefersReducedMotion
                ? { opacity: 0.32 }
                : {
                    x: [0, mote.drift, 0],
                    y: [0, -14 - (index % 3) * 5, 0],
                    opacity: [0.18, 0.72, 0.18],
                  }}
              transition={prefersReducedMotion
                ? { duration: 0 }
                : { duration: mote.duration, delay: mote.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#edf6e9]/30 via-transparent to-white/[0.06]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[34svh] bg-gradient-to-b from-transparent via-[#edf6e9]/38 to-[#edf6e9]" />
        <div className="pointer-events-none absolute inset-x-[12%] bottom-[12svh] z-30 h-16 rounded-[50%] bg-white/25 blur-3xl" />

        <motion.div style={{ opacity: heroUiOpacity, y: heroUiY }} className="absolute inset-0 z-[60]">
          <motion.div
            className="pointer-events-auto absolute left-4 top-4 md:left-6 md:top-6"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: prefersReducedMotion ? 0 : 0.58 }}
          >
            <div className="flex h-10 items-center gap-2 rounded-full bg-white/38 px-3.5 shadow-md backdrop-blur-lg">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-[11px] text-white shadow-sm">♥</span>
              <span className="text-xs font-black tracking-tight text-stone-800 md:text-sm">Narinyland</span>
            </div>
          </motion.div>

          <motion.div
            className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2 md:right-6 md:top-6 md:gap-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: prefersReducedMotion ? 0 : 0.66 }}
          >
            <div className="hidden h-9 items-center gap-2 rounded-full bg-white/24 px-3.5 text-gray-700 shadow-sm backdrop-blur-lg sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]" />
              <span className="max-w-[110px] truncate text-[11px] font-bold">Live homestead</span>
            </div>
            <motion.button
              type="button"
              onClick={enterWorld}
              disabled={entering}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex h-10 items-center gap-2 rounded-full bg-white/[0.76] px-4 text-xs font-black text-stone-800 shadow-lg backdrop-blur-xl disabled:cursor-wait disabled:opacity-70"
            >
              <i className={`fas ${entering ? 'fa-spinner fa-spin' : 'fa-arrow-right-to-bracket'} text-[11px] text-pink-500`} />
              <span>{entering ? 'Entering…' : 'Enter World'}</span>
            </motion.button>
          </motion.div>

          <motion.div
            className="pointer-events-none absolute bottom-[calc(6.9rem+env(safe-area-inset-bottom))] left-4 w-[min(38rem,calc(100vw-2rem))] md:bottom-28 md:left-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.78, delay: prefersReducedMotion ? 0 : 0.82, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="max-w-[35rem]">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/[0.34] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800 shadow-sm backdrop-blur-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                Your shared world
              </div>
              <h1 className="max-w-[34rem] text-3xl font-black leading-[1.01] tracking-[-0.05em] text-stone-950 drop-shadow-[0_1px_18px_rgba(255,255,255,0.92)] sm:text-4xl md:text-6xl">
                A little world that belongs to both of you.
              </h1>
              <p className="mt-3 max-w-lg text-sm font-semibold leading-relaxed text-stone-700 drop-shadow-[0_1px_10px_rgba(255,255,255,0.95)] md:text-base">
                Build a floating homestead, keep your memories close, and grow a world together—one little moment at a time.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
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
                <Link
                  href="/signup"
                  className="pointer-events-auto flex min-h-[46px] items-center gap-2 rounded-full bg-white/42 px-4 text-xs font-black text-stone-700 shadow-sm backdrop-blur-lg transition hover:bg-white/62"
                >
                  <span>Create your world</span>
                  <i className="fas fa-seedling text-[10px] text-emerald-700" />
                </Link>
                <a
                  href="#story"
                  className="pointer-events-auto flex min-h-[42px] items-center gap-2 px-2 text-xs font-bold text-stone-600 drop-shadow-[0_1px_8px_rgba(255,255,255,0.95)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/34 shadow-sm backdrop-blur-md">
                    <i className="fas fa-arrow-down text-[10px] text-emerald-700" />
                  </span>
                  <span>Explore the world</span>
                </a>
              </div>
            </div>
          </motion.div>

          <motion.nav
            className="pointer-events-auto absolute bottom-[calc(1.15rem+env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/30 bg-white/[0.52] px-4 py-2.5 shadow-xl shadow-emerald-950/[0.06] backdrop-blur-xl sm:gap-5 sm:px-5 md:bottom-6 md:gap-8 md:px-6 md:py-3"
            aria-label="Narinyland preview navigation"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, delay: prefersReducedMotion ? 0 : 0.94 }}
          >
            {NAV_ITEMS.map((item, index) => (
              <button
                type="button"
                key={item.label}
                onClick={index === 0 ? undefined : enterWorld}
                className={`flex min-w-[42px] flex-col items-center gap-0.5 transition-all duration-300 sm:min-w-0 sm:gap-1 ${index === 0 ? `scale-105 ${item.tone}` : 'text-gray-400/90 hover:text-gray-600'}`}
                aria-label={index === 0 ? `${item.label} preview` : `Sign in to open ${item.label}`}
              >
                <i className={`fas ${item.icon} text-lg sm:text-xl`} />
                <span className="text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">{item.label}</span>
              </button>
            ))}
          </motion.nav>
        </motion.div>
      </section>

      <div id="story" className="relative z-20 -mt-px bg-transparent">
        <section className="relative flex min-h-[82svh] items-center bg-transparent px-5 py-28 md:px-10 md:py-36">
          <motion.div
            aria-hidden="true"
            animate={prefersReducedMotion ? { y: 0 } : { y: [0, -12, 0], x: [0, 7, 0] }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute right-[7%] top-[15%] h-24 w-44 rounded-[50%] bg-white/24 blur-3xl"
          />
          <motion.div {...reveal} className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="max-w-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">One world, many little things</p>
              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-stone-950 md:text-6xl">
                Your world grows with your story.
              </h2>
              <p className="mt-5 max-w-lg text-base font-medium leading-relaxed text-stone-600 md:text-lg">
                Narinyland keeps the things you share in one place, so your world feels lived in—not like a dashboard you have to manage.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {STORY_ITEMS.map((item, index) => (
                <motion.button
                  key={item.label}
                  type="button"
                  onClick={enterWorld}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`group flex min-h-[116px] items-start gap-4 rounded-[1.75rem] p-5 text-left shadow-xl shadow-emerald-950/[0.05] backdrop-blur-xl ${index === 1 ? 'lg:ml-8 lg:w-[calc(100%-2rem)] bg-white/[0.36]' : 'bg-white/[0.42]'}`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.glow} ${item.tone}`}>
                    <i className={`fas ${item.icon} text-sm`} />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-stone-900">{item.label}</span>
                    <span className="mt-1.5 block text-xs font-medium leading-relaxed text-stone-600">{item.copy}</span>
                  </span>
                  <i className="fas fa-arrow-up-right-from-square ml-auto mt-1 text-[10px] text-stone-400 transition group-hover:text-stone-700" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="relative flex min-h-[88svh] items-center bg-transparent px-5 py-28 md:px-10 md:py-36">
          <motion.div {...reveal} className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 grid grid-cols-2 gap-4 lg:order-1">
              <motion.div whileHover={{ y: -5, rotate: -0.8 }} className="mt-10 rounded-[2rem] bg-white/46 p-5 shadow-2xl shadow-blue-950/[0.05] backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Timeline</p>
                <p className="mt-8 text-3xl">🌤️</p>
                <p className="mt-3 text-sm font-black text-stone-900">Our first little trip</p>
                <p className="mt-1 text-xs font-medium text-stone-500">A day worth remembering.</p>
              </motion.div>
              <motion.div whileHover={{ y: -5, rotate: 0.8 }} className="rounded-[2rem] bg-white/38 p-5 shadow-2xl shadow-pink-950/[0.05] backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-pink-600">Anniversary</p>
                <p className="mt-8 text-3xl">💗</p>
                <p className="mt-3 text-sm font-black text-stone-900">Another year together</p>
                <p className="mt-1 text-xs font-medium text-stone-500">The date stays close.</p>
              </motion.div>
              <motion.div whileHover={{ x: 5 }} className="col-span-2 ml-auto w-[82%] rounded-[2rem] bg-white/34 p-5 shadow-2xl shadow-emerald-950/[0.05] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm">🌱</span>
                  <div>
                    <p className="text-sm font-black text-stone-900">A new memory grew here</p>
                    <p className="text-xs font-medium text-stone-500">Every moment becomes part of your world.</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="order-1 max-w-xl lg:order-2 lg:pl-8">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Timeline</p>
              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-stone-950 md:text-6xl">
                Keep every little moment.
              </h2>
              <p className="mt-5 text-base font-medium leading-relaxed text-stone-600 md:text-lg">
                Save the dates, memories, photos, and milestones that make your relationship yours. They stay connected to the same world you build together.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="relative flex min-h-[86svh] items-center bg-transparent px-5 py-28 md:px-10 md:py-36">
          <motion.div
            aria-hidden="true"
            animate={prefersReducedMotion ? { x: 0 } : { x: [0, -14, 0], y: [0, 8, 0] }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute left-[10%] top-[18%] h-28 w-52 rounded-[50%] bg-rose-100/26 blur-3xl"
          />
          <motion.div {...reveal} className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="max-w-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-700">Letters</p>
              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-stone-950 md:text-6xl">
                Say the things worth keeping.
              </h2>
              <p className="mt-5 text-base font-medium leading-relaxed text-stone-600 md:text-lg">
                Leave a note for tonight or a letter for much later. Narinyland gives those words a place that feels more personal than another chat thread.
              </p>
            </div>

            <div className="relative mx-auto h-[25rem] w-full max-w-xl">
              <motion.div whileHover={{ rotate: -1.5, y: -5 }} className="absolute left-[2%] top-[18%] w-[72%] rounded-[2rem] bg-white/46 p-6 shadow-2xl shadow-rose-950/[0.07] backdrop-blur-xl sm:left-[8%]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">For you</span>
                  <i className="fas fa-heart text-xs text-rose-400" />
                </div>
                <p className="mt-8 text-xl font-black leading-snug text-stone-900">“Thank you for making ordinary days feel like ours.”</p>
                <p className="mt-8 text-xs font-bold text-stone-500">Saved in Letters</p>
              </motion.div>
              <motion.div whileHover={{ rotate: 1.5, y: -5 }} className="absolute bottom-[3%] right-[2%] w-[62%] rounded-[1.75rem] bg-rose-50/52 p-5 shadow-xl shadow-rose-950/[0.06] backdrop-blur-xl sm:right-[8%]">
                <p className="text-xs font-bold leading-relaxed text-stone-700">Open it when you need a reminder that someone is on your side. 💌</p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section className="relative flex min-h-[84svh] items-center bg-transparent px-5 py-28 md:px-10 md:py-36">
          <motion.div {...reveal} className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 flex flex-col gap-4 lg:order-1">
              {[
                ['Dinner is on me', 'Use whenever you want a cozy night out.', 'fa-utensils'],
                ['Your choice day', 'You pick the plan. I am happily in.', 'fa-sparkles'],
                ['One long hug', 'No expiration date. Redeem anytime.', 'fa-heart'],
              ].map(([title, copy, icon], index) => (
                <motion.div
                  key={title}
                  whileHover={{ x: index % 2 === 0 ? 6 : -6, y: -2 }}
                  className={`flex items-center gap-4 rounded-[1.75rem] p-5 shadow-xl shadow-purple-950/[0.05] backdrop-blur-xl ${index === 1 ? 'ml-auto w-[88%] bg-white/[0.34]' : 'w-[94%] bg-white/[0.42]'}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100/70 text-purple-600">
                    <i className={`fas ${icon} text-sm`} />
                  </span>
                  <div>
                    <p className="text-sm font-black text-stone-900">{title}</p>
                    <p className="mt-1 text-xs font-medium text-stone-500">{copy}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-purple-100/70 px-3 py-1 text-[9px] font-black uppercase tracking-wide text-purple-700">Coupon</span>
                </motion.div>
              ))}
            </div>

            <div className="order-1 max-w-xl lg:order-2 lg:pl-8">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-700">Coupons</p>
              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-stone-950 md:text-6xl">
                Little promises, made together.
              </h2>
              <p className="mt-5 text-base font-medium leading-relaxed text-stone-600 md:text-lg">
                Turn thoughtful ideas into playful promises you can actually redeem—from date nights to tiny favors and spontaneous adventures.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="relative flex min-h-[92svh] items-center justify-center bg-transparent px-5 pb-24 pt-32 text-center md:px-10 md:pb-32 md:pt-40">
          <motion.div
            aria-hidden="true"
            animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.06, 1], opacity: [0.3, 0.52, 0.3] }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 13, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/28 blur-3xl"
          />
          <motion.div {...reveal} className="relative mx-auto max-w-4xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/42 text-xl text-pink-500 shadow-xl backdrop-blur-xl">♥</div>
            <p className="mt-7 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Your Narinyland</p>
            <h2 className="mt-4 text-4xl font-black leading-[1.01] tracking-[-0.05em] text-stone-950 sm:text-5xl md:text-7xl">
              Build a world that is only yours.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-stone-600 md:text-lg">
              Start with one little floating home. Fill it with the moments, words, and promises that mean something to both of you.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <motion.button
                type="button"
                onClick={enterWorld}
                disabled={entering}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex min-h-[50px] items-center gap-3 rounded-full bg-emerald-700 px-7 text-sm font-black text-white shadow-2xl shadow-emerald-950/15 disabled:cursor-wait disabled:opacity-70"
              >
                <span>{entering ? 'Opening your world…' : 'Enter Narinyland'}</span>
                <i className={`fas ${entering ? 'fa-spinner fa-spin' : 'fa-arrow-right'} text-[11px]`} />
              </motion.button>
              <Link
                href="/signup"
                className="inline-flex min-h-[50px] items-center gap-2 rounded-full bg-white/44 px-6 text-sm font-black text-stone-700 shadow-lg backdrop-blur-xl transition hover:bg-white/65"
              >
                Create your world
                <i className="fas fa-seedling text-[10px] text-emerald-700" />
              </Link>
            </div>
            <div className="mt-20 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-[0.15em] text-stone-500">
              <span>Narinyland</span>
              <span aria-hidden="true">·</span>
              <span>One world for two people</span>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
