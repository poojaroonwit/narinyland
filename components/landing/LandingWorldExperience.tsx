"use client";

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { login } from '@/lib/auth';
import { getBuildingFootprint } from '@/lib/hex-world/building-catalog';
import type { HexCameraIntent } from '@/lib/hex-world/camera';
import { createLandingGameplaySnapshots } from '@/lib/hex-world/landing-world';
import { hexKey } from '@/lib/hex-world/hex-grid';
import { HexWorld3D } from '@/components/hex-world/HexWorld3D';

const GAMEPLAY_LOOP_MS = 12000;
const BUILD_ANCHOR = { q: 3, r: 1 } as const;
const EDIT_ANCHOR = { q: 0, r: -4 } as const;
const BUILDER_CATEGORIES = ['Nature', 'Utility', 'Decor'] as const;

const GAMEPLAY_STAGES = [
  {
    label: 'Arrive',
    icon: 'fa-house-chimney',
    eyebrow: 'Land ready',
    copy: 'Your floating home settles into view and the shared world is ready to shape.',
  },
  {
    label: 'Build',
    icon: 'fa-hammer',
    eyebrow: 'Build · Utility',
    copy: 'Pick a building, preview its footprint, rotate it, and place it directly on the island.',
  },
  {
    label: 'Grow',
    icon: 'fa-seedling',
    eyebrow: 'Build · Nature',
    copy: 'Add a Garden Patch, flowers, trees, and cozy details that make the homestead feel alive.',
  },
  {
    label: 'Edit',
    icon: 'fa-pen-ruler',
    eyebrow: 'Shape what you placed',
    copy: 'Select an existing object and use the same Move, Rotate, and Remove actions as the real builder.',
  },
  {
    label: 'Expand',
    icon: 'fa-up-right-and-down-left-from-center',
    eyebrow: 'Expand Land',
    copy: 'Choose an amber edge cluster, spend shared Points, and unlock more room for the homestead.',
  },
  {
    label: 'Together',
    icon: 'fa-heart',
    eyebrow: 'Your world grew',
    copy: 'The new land settles in and the completed homestead becomes one shared place to keep growing.',
  },
] as const;

const CINEMATIC_MOTES = [
  { left: '7%', top: '19%', size: 5, delay: 0.2, duration: 8, drift: 11 },
  { left: '18%', top: '67%', size: 3, delay: 1.2, duration: 10, drift: -9 },
  { left: '33%', top: '24%', size: 4, delay: 2.0, duration: 9, drift: 7 },
  { left: '49%', top: '74%', size: 5, delay: 0.8, duration: 11, drift: -11 },
  { left: '62%', top: '18%', size: 3, delay: 2.8, duration: 8, drift: 9 },
  { left: '73%', top: '58%', size: 4, delay: 1.6, duration: 12, drift: -7 },
  { left: '84%', top: '28%', size: 5, delay: 2.5, duration: 10, drift: 12 },
  { left: '93%', top: '70%', size: 3, delay: 0.4, duration: 9, drift: -10 },
] as const;

function GameplayDetailPanel({ stage, points }: { stage: (typeof GAMEPLAY_STAGES)[number]; points: number }) {
  return (
    <div className="mt-3 border-t border-stone-900/[0.06] pt-3">
      {stage.label === 'Arrive' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/56 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">Land ready</p>
            <p className="mt-1 text-sm font-black text-stone-900">Home</p>
            <p className="text-[10px] font-semibold text-stone-500">Overview camera</p>
          </div>
          <div className="rounded-2xl bg-white/56 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600">Shared balance</p>
            <p className="mt-1 text-sm font-black text-stone-900">{points} Points</p>
            <p className="text-[10px] font-semibold text-stone-500">Ready to build</p>
          </div>
        </div>
      )}

      {stage.label === 'Build' && (
        <div>
          <div className="flex gap-1.5">
            {BUILDER_CATEGORIES.map((category) => (
              <span key={category} className={`rounded-full px-2.5 py-1 text-[9px] font-black ${category === 'Utility' ? 'bg-emerald-700 text-white' : 'bg-white/55 text-stone-500'}`}>
                {category}
              </span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-emerald-400/70 bg-emerald-50/80 p-2.5 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-lg">🛠️</span><span className="text-[9px] font-black text-emerald-700">2⬡</span></div>
              <p className="mt-1 text-xs font-black text-stone-800">Workshop</p>
            </div>
            <div className="rounded-2xl bg-white/55 p-2.5">
              <div className="flex items-center justify-between"><span className="text-lg">📦</span><span className="text-[9px] font-black text-stone-400">1⬡</span></div>
              <p className="mt-1 text-xs font-black text-stone-700">Storage</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl bg-emerald-950/[0.06] p-2.5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">Ghost preview</p>
              <p className="text-[10px] font-bold text-stone-500">Valid placement · grass</p>
            </div>
            <div className="flex gap-1.5">
              <button type="button" className="rounded-full bg-white/75 px-2.5 py-1.5 text-[9px] font-black text-stone-600">Rotate 60°</button>
              <button type="button" className="rounded-full bg-emerald-700 px-3 py-1.5 text-[9px] font-black text-white">Place</button>
            </div>
          </div>
        </div>
      )}

      {stage.label === 'Grow' && (
        <div>
          <div className="flex gap-1.5">
            {BUILDER_CATEGORIES.map((category) => (
              <span key={category} className={`rounded-full px-2.5 py-1 text-[9px] font-black ${category === 'Nature' ? 'bg-emerald-700 text-white' : 'bg-white/55 text-stone-500'}`}>
                {category}
              </span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              ['🌱', 'Garden Patch'],
              ['🌸', 'Flower Patch'],
              ['🌳', 'Tree'],
            ].map(([icon, label]) => (
              <div key={label} className="rounded-2xl bg-white/58 p-2 text-center shadow-sm">
                <div className="text-lg">{icon}</div>
                <p className="mt-1 truncate text-[9px] font-black text-stone-700">{label}</p>
              </div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 shadow-sm"
          >
            <span className="text-[10px] font-black text-stone-700">Bench placed · Undo</span>
            <span className="text-[9px] font-black text-emerald-700">+45 Points</span>
          </motion.div>
        </div>
      )}

      {stage.label === 'Edit' && (
        <div className="rounded-2xl bg-white/60 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">Bench selected</p>
              <p className="mt-0.5 text-[10px] font-semibold text-stone-500">Context actions stay close to the world</p>
            </div>
            <span className="text-lg">🪑</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" className="rounded-xl bg-stone-100 px-2 py-2 text-[10px] font-black text-stone-700">Move</button>
            <button type="button" className="rounded-xl bg-stone-100 px-2 py-2 text-[10px] font-black text-stone-700">Rotate</button>
            <button type="button" className="rounded-xl bg-rose-50 px-2 py-2 text-[10px] font-black text-rose-600">Remove</button>
          </div>
        </div>
      )}

      {stage.label === 'Expand' && (
        <div className="rounded-2xl bg-amber-50/75 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600">Expand Land</p>
              <p className="mt-1 text-sm font-black text-stone-900">+7 hexes · 100 Points</p>
              <p className="mt-0.5 text-[9px] font-bold text-stone-500">{points} shared Points · amber edge selected</p>
            </div>
            <button type="button" className="rounded-full bg-amber-500 px-3 py-2 text-[9px] font-black text-white shadow-md">Confirm</button>
          </div>
        </div>
      )}

      {stage.label === 'Together' && (
        <div className="rounded-2xl bg-white/64 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-500">♥</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-stone-900">Your world grew</p>
              <p className="text-[10px] font-semibold text-stone-500">+7 hexes unlocked · {points} Points remaining</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LandingWorldExperience() {
  const snapshots = React.useMemo(() => createLandingGameplaySnapshots(), []);
  const prefersReducedMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = React.useState(0);
  const [entering, setEntering] = React.useState(false);
  const activeStageIndex = prefersReducedMotion ? GAMEPLAY_STAGES.length - 1 : stageIndex;
  const activeStage = GAMEPLAY_STAGES[activeStageIndex];
  const activeSnapshot = snapshots[activeStageIndex];

  React.useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % GAMEPLAY_STAGES.length);
    }, GAMEPLAY_LOOP_MS / GAMEPLAY_STAGES.length);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  const buildingPreview = activeStage.label === 'Build'
    ? { buildingKey: 'workshop', anchorQ: BUILD_ANCHOR.q, anchorR: BUILD_ANCHOR.r, rotation: 1 as const, valid: true }
    : null;
  const validKeys = buildingPreview
    ? new Set(getBuildingFootprint('workshop', BUILD_ANCHOR, buildingPreview.rotation).map(hexKey))
    : undefined;
  const selectedCoord = activeStage.label === 'Build' ? BUILD_ANCHOR : activeStage.label === 'Edit' ? EDIT_ANCHOR : null;
  const selectedBuildingId = activeStage.label === 'Edit' ? 'landing-bench' : null;
  const expansionOptions = activeStage.label === 'Expand' ? activeSnapshot.expansions : undefined;
  const selectedExpansionKey = activeStage.label === 'Expand' ? activeSnapshot.expansions[0]?.expansionKey ?? null : null;
  const preExpansionKeys = new Set(snapshots[4].tiles.map(hexKey));
  const newlyAddedCoords = activeStage.label === 'Together'
    ? activeSnapshot.tiles.filter((tile) => !preExpansionKeys.has(hexKey(tile))).map(({ q, r }) => ({ q, r }))
    : [];
  const newlyAddedKeys = newlyAddedCoords.length ? new Set(newlyAddedCoords.map(hexKey)) : undefined;
  const cameraIntent: HexCameraIntent = activeStage.label === 'Build'
    ? { kind: 'build', anchor: BUILD_ANCHOR }
    : activeStage.label === 'Edit'
      ? { kind: 'focus', coord: EDIT_ANCHOR }
      : { kind: 'overview' };

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
    <main className="relative h-[100svh] min-h-[42rem] overflow-hidden bg-[#edf6e9] text-stone-800">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#edf6e9]">
        <motion.div
          className="absolute -right-[13vw] -top-[15vh] h-[58vw] min-h-[32rem] w-[58vw] min-w-[32rem] rounded-full bg-white/60 blur-3xl"
          animate={prefersReducedMotion ? { x: 0, y: 0 } : { x: [0, 18, -8, 0], y: [0, 10, -5, 0] }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_12%,rgba(255,255,255,0.92),transparent_29%),radial-gradient(circle_at_10%_50%,rgba(216,241,211,0.78),transparent_32%),radial-gradient(circle_at_76%_78%,rgba(199,233,208,0.72),transparent_37%)]" />
        <motion.div
          className="absolute -left-[14vw] bottom-[-30vh] h-[62vw] min-h-[34rem] w-[62vw] min-w-[34rem] rounded-full bg-white/28 blur-3xl"
          animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.08, 1], opacity: [0.25, 0.42, 0.25] }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <section className="relative z-10 h-full w-full">
        <motion.div
          className="absolute -inset-3"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.025 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="h-full w-full"
            animate={prefersReducedMotion ? { x: 0, y: 0, scale: 1 } : { x: [0, 4, -3, 0], y: [0, -3, 2, 0], scale: [1, 1.004, 1.002, 1] }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          >
            <HexWorld3D
              snapshot={activeSnapshot}
              graphicsQuality="medium"
              buildingPreview={buildingPreview}
              selectedCoord={selectedCoord}
              selectedBuildingId={selectedBuildingId}
              validKeys={validKeys}
              expansionOptions={expansionOptions}
              selectedExpansionKey={selectedExpansionKey}
              newlyAddedKeys={newlyAddedKeys}
              reframeCoords={newlyAddedCoords}
              cameraIntent={cameraIntent}
            />
          </motion.div>
        </motion.div>

        <AnimatePresence initial={false}>
          <motion.div
            key={`stage-wash-${activeStageIndex}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[15] bg-[#edf6e9]"
            initial={{ opacity: prefersReducedMotion ? 0 : 0.17 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.38 }}
          />
        </AnimatePresence>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {CINEMATIC_MOTES.map((mote, index) => (
            <motion.span
              key={`${mote.left}-${mote.top}`}
              className={`absolute rounded-full ${index % 3 === 0 ? 'bg-white/75' : index % 3 === 1 ? 'bg-emerald-100/80' : 'bg-amber-100/75'}`}
              style={{ left: mote.left, top: mote.top, width: mote.size, height: mote.size }}
              animate={prefersReducedMotion
                ? { opacity: 0.28 }
                : { x: [0, mote.drift, 0], y: [0, -12 - (index % 3) * 4, 0], opacity: [0.16, 0.66, 0.16] }}
              transition={prefersReducedMotion
                ? { duration: 0 }
                : { duration: mote.duration, delay: mote.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#edf6e9]/48 via-transparent to-white/[0.08]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[38svh] bg-gradient-to-b from-transparent via-[#edf6e9]/46 to-[#edf6e9]/94" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-30 w-[58vw] bg-gradient-to-r from-[#edf6e9]/54 via-[#edf6e9]/10 to-transparent md:w-[46vw]" />

        <div className="pointer-events-none absolute inset-0 z-[60]">
          <motion.div
            className="pointer-events-auto absolute left-4 top-4 md:left-6 md:top-6"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.45 }}
          >
            <div className="flex h-10 items-center gap-2 rounded-full bg-white/42 px-3.5 shadow-md backdrop-blur-xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-[11px] text-white shadow-sm">♥</span>
              <span className="text-xs font-black tracking-tight text-stone-800 md:text-sm">Narinyland</span>
            </div>
          </motion.div>

          <div className="absolute left-1/2 top-4 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-white/42 px-3.5 py-2 shadow-md backdrop-blur-xl sm:flex">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-black text-stone-700">{activeSnapshot.points.toLocaleString()} Points</span>
            <span className="text-[9px] font-bold text-stone-400">shared</span>
          </div>

          <motion.div
            className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2 md:right-6 md:top-6"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.45, delay: prefersReducedMotion ? 0 : 0.1 }}
          >
            <div className="hidden h-9 items-center gap-2 rounded-full bg-white/28 px-3.5 text-stone-700 shadow-sm backdrop-blur-xl md:flex">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.7, 1], opacity: [0.8, 0.35, 0.8] }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.8, repeat: Infinity }}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">Live gameplay</span>
            </div>
            <motion.button
              type="button"
              onClick={enterWorld}
              disabled={entering}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex h-10 items-center gap-2 rounded-full bg-white/[0.8] px-4 text-xs font-black text-stone-800 shadow-lg backdrop-blur-xl disabled:cursor-wait disabled:opacity-70"
            >
              <i className={`fas ${entering ? 'fa-spinner fa-spin' : 'fa-arrow-right-to-bracket'} text-[11px] text-pink-500`} />
              <span>{entering ? 'Entering…' : 'Enter World'}</span>
            </motion.button>
          </motion.div>

          <div className="absolute left-4 right-4 top-[5.1rem] flex justify-end md:right-6 md:top-[5.4rem]">
            <div className="pointer-events-auto w-full max-w-[22rem] rounded-[1.6rem] bg-white/[0.42] p-3.5 shadow-xl shadow-emerald-950/[0.06] backdrop-blur-xl md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-800">Gameplay</span>
                  <span className="ml-2 text-[9px] font-bold text-stone-400">12 sec loop</span>
                </div>
                <span className="rounded-full bg-white/55 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-stone-500">{activeStageIndex + 1}/6</span>
              </div>

              <div className="mt-2.5 flex gap-1" aria-label={`Gameplay stage: ${activeStage.label}`}>
                {GAMEPLAY_STAGES.map((stage, index) => (
                  <div key={stage.label} className="h-1 flex-1 overflow-hidden rounded-full bg-stone-900/10">
                    <motion.div
                      className="h-full rounded-full bg-emerald-600"
                      animate={{ width: index < activeStageIndex ? '100%' : index === activeStageIndex ? '100%' : '0%' }}
                      transition={index === activeStageIndex && !prefersReducedMotion
                        ? { duration: GAMEPLAY_LOOP_MS / GAMEPLAY_STAGES.length / 1000, ease: 'linear' }
                        : { duration: 0.2 }}
                    />
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeStage.label}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
                  className="mt-2.5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100/85 text-emerald-700 shadow-sm">
                      <i className={`fas ${activeStage.icon} text-xs`} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-stone-950">{activeStage.label}</span>
                        <span className="hidden text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700 sm:inline">{activeStage.eyebrow}</span>
                      </div>
                      <p className="mt-0.5 text-[10px] font-semibold leading-relaxed text-stone-600">{activeStage.copy}</p>
                    </div>
                  </div>
                  <GameplayDetailPanel stage={activeStage} points={activeSnapshot.points} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <motion.div
            className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-4 w-[min(39rem,calc(100vw-2rem))] md:bottom-7 md:left-7"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.62, delay: prefersReducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="max-w-[36rem]">
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-white/[0.4] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-emerald-800 shadow-sm backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Play a world together
              </div>
              <h1 className="max-w-[35rem] text-3xl font-black leading-[1.01] tracking-[-0.05em] text-stone-950 drop-shadow-[0_1px_18px_rgba(255,255,255,0.95)] sm:text-4xl md:text-6xl">
                A little world that belongs to both of you.
              </h1>
              <p className="mt-2.5 max-w-lg text-xs font-semibold leading-relaxed text-stone-700 drop-shadow-[0_1px_10px_rgba(255,255,255,0.95)] sm:text-sm md:text-base">
                Build, place, grow, edit, expand, and come home to the same living homestead—together.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
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
                  className="pointer-events-auto flex min-h-[46px] items-center gap-2 rounded-full bg-white/50 px-4 text-xs font-black text-stone-700 shadow-md backdrop-blur-xl transition hover:bg-white/70"
                >
                  <span>Create your world</span>
                  <i className="fas fa-seedling text-[10px] text-emerald-700" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
