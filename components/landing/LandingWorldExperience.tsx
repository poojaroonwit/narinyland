"use client";

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-12%' },
  transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const },
};

export function LandingWorldExperience() {
  const snapshot = React.useMemo(() => createLandingHexWorldSnapshot(), []);
  const [entering, setEntering] = React.useState(false);
  const heroRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroWorldOpacity = useTransform(scrollYProgress, [0, 0.66, 1], [1, 0.96, 0.3]);
  const heroWorldScale = useTransform(scrollYProgress, [0, 1], [1, 1.035]);
  const heroUiOpacity = useTransform(scrollYProgress, [0, 0.58, 0.9], [1, 0.92, 0]);
  const heroUiY = useTransform(scrollYProgress, [0, 1], [0, -42]);

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
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#edf6e9]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_15%,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_18%_48%,rgba(219,244,216,0.78),transparent_32%),radial-gradient(circle_at_72%_78%,rgba(205,236,211,0.72),transparent_36%)]" />
        <div className="absolute -left-[12vw] top-[82svh] h-[58vw] w-[58vw] rounded-full bg-white/28 blur-3xl" />
        <div className="absolute -right-[18vw] top-[160svh] h-[62vw] w-[62vw] rounded-full bg-emerald-100/35 blur-3xl" />
        <div className="absolute left-[10vw] top-[300svh] h-[48vw] w-[48vw] rounded-full bg-white/26 blur-3xl" />
      </div>

      <section ref={heroRef} className="relative z-10 h-[100svh] min-h-[42rem] bg-transparent">
        <motion.div
          className="absolute inset-0"
          style={{ opacity: heroWorldOpacity, scale: heroWorldScale }}
          initial={{ opacity: 0, scale: 1.025 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <HexWorld3D snapshot={snapshot} graphicsQuality="medium" />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#edf6e9]/35 via-transparent to-white/[0.04]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[30svh] bg-gradient-to-b from-transparent via-[#edf6e9]/45 to-[#edf6e9]" />

        <motion.div style={{ opacity: heroUiOpacity, y: heroUiY }} className="absolute inset-0 z-[60]">
          <motion.div
            className="pointer-events-auto absolute left-4 top-4 md:left-6 md:top-6"
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
            className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2 md:right-6 md:top-6 md:gap-3"
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

          <motion.div
            className="pointer-events-none absolute bottom-[calc(6.9rem+env(safe-area-inset-bottom))] left-4 w-[min(34rem,calc(100vw-2rem))] md:bottom-28 md:left-8"
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
                <a
                  href="#story"
                  className="pointer-events-auto flex items-center gap-2 text-xs font-bold text-stone-600 drop-shadow-[0_1px_8px_rgba(255,255,255,0.95)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/40 shadow-sm backdrop-blur-md">
                    <i className="fas fa-arrow-down text-[10px] text-emerald-700" />
                  </span>
                  <span>Explore the world</span>
                </a>
              </div>
            </div>
          </motion.div>

          <motion.nav
            className="pointer-events-auto absolute bottom-[calc(1.15rem+env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/45 bg-white/[0.78] px-4 py-2.5 shadow-2xl backdrop-blur-xl sm:gap-5 sm:px-5 md:bottom-6 md:gap-8 md:px-6 md:py-3"
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
        </motion.div>
      </section>

      <div id="story" className="relative z-20 -mt-px bg-transparent">
        <section className="relative flex min-h-[82svh] items-center bg-transparent px-5 py-28 md:px-10 md:py-36">
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
              {STORY_ITEMS.map((item) => (
                <motion.button
                  key={item.label}
                  type="button"
                  onClick={enterWorld}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="group flex min-h-[116px] items-start gap-4 rounded-[1.75rem] bg-white/44 p-5 text-left shadow-xl shadow-emerald-950/[0.05] backdrop-blur-xl"
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
              <div className="mt-10 rounded-[2rem] bg-white/48 p-5 shadow-2xl shadow-blue-950/[0.05] backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Timeline</p>
                <p className="mt-8 text-3xl">🌤️</p>
                <p className="mt-3 text-sm font-black text-stone-900">Our first little trip</p>
                <p className="mt-1 text-xs font-medium text-stone-500">A day worth remembering.</p>
              </div>
              <div className="rounded-[2rem] bg-white/40 p-5 shadow-2xl shadow-pink-950/[0.05] backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-pink-600">Anniversary</p>
                <p className="mt-8 text-3xl">💗</p>
                <p className="mt-3 text-sm font-black text-stone-900">Another year together</p>
                <p className="mt-1 text-xs font-medium text-stone-500">The date stays close.</p>
              </div>
              <div className="col-span-2 ml-auto w-[82%] rounded-[2rem] bg-white/36 p-5 shadow-2xl shadow-emerald-950/[0.05] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm">🌱</span>
                  <div>
                    <p className="text-sm font-black text-stone-900">A new memory grew here</p>
                    <p className="text-xs font-medium text-stone-500">Every moment becomes part of your world.</p>
                  </div>
                </div>
              </div>
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
              <motion.div whileHover={{ rotate: -1.5, y: -5 }} className="absolute left-[2%] top-[18%] w-[72%] rounded-[2rem] bg-white/48 p-6 shadow-2xl shadow-rose-950/[0.07] backdrop-blur-xl sm:left-[8%]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">For you</span>
                  <i className="fas fa-heart text-xs text-rose-400" />
                </div>
                <p className="mt-8 text-xl font-black leading-snug text-stone-900">“Thank you for making ordinary days feel like ours.”</p>
                <p className="mt-8 text-xs font-bold text-stone-500">Saved in Letters</p>
              </motion.div>
              <motion.div whileHover={{ rotate: 1.5, y: -5 }} className="absolute bottom-[3%] right-[2%] w-[62%] rounded-[1.75rem] bg-rose-50/55 p-5 shadow-xl shadow-rose-950/[0.06] backdrop-blur-xl sm:right-[8%]">
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
                  whileHover={{ x: index % 2 === 0 ? 6 : -6 }}
                  className={`flex items-center gap-4 rounded-[1.75rem] p-5 shadow-xl shadow-purple-950/[0.05] backdrop-blur-xl ${index === 1 ? 'ml-auto w-[88%] bg-white/[0.38]' : 'w-[94%] bg-white/[0.46]'}`}
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
          <motion.div {...reveal} className="mx-auto max-w-4xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/44 text-xl text-pink-500 shadow-xl backdrop-blur-xl">♥</div>
            <p className="mt-7 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Your Narinyland</p>
            <h2 className="mt-4 text-4xl font-black leading-[1.01] tracking-[-0.05em] text-stone-950 sm:text-5xl md:text-7xl">
              Build a world that is only yours.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-stone-600 md:text-lg">
              Start with one little floating home. Fill it with the moments, words, and promises that mean something to both of you.
            </p>
            <motion.button
              type="button"
              onClick={enterWorld}
              disabled={entering}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-8 inline-flex min-h-[50px] items-center gap-3 rounded-full bg-emerald-700 px-7 text-sm font-black text-white shadow-2xl shadow-emerald-950/15 disabled:cursor-wait disabled:opacity-70"
            >
              <span>{entering ? 'Opening your world…' : 'Enter Narinyland'}</span>
              <i className={`fas ${entering ? 'fa-spinner fa-spin' : 'fa-arrow-right'} text-[11px]`} />
            </motion.button>
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
