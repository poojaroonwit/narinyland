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
    eyebrow: 'A place to come home to',
    copy: 'Step onto your own little floating island. There is always room for another memory.',
  },
  {
    label: 'Build',
    icon: 'fa-hammer',
    eyebrow: 'Make it yours',
    copy: 'Put down a workshop, a bench, or a cozy corner. Shape your home, one small piece at a time.',
  },
  {
    label: 'Grow',
    icon: 'fa-seedling',
    eyebrow: 'Let things bloom',
    copy: 'Plant a garden, watch your home soften with greenery, and make space for quiet afternoons.',
  },
  {
    label: 'Edit',
    icon: 'fa-pen-ruler',
    eyebrow: 'Change with the seasons',
    copy: 'Move things around whenever you like. A shared home is always a work in progress.',
  },
  {
    label: 'Expand',
    icon: 'fa-up-right-and-down-left-from-center',
    eyebrow: 'A little more room',
    copy: 'As you play together, new pieces of the island become part of your story.',
  },
  {
    label: 'Together',
    icon: 'fa-heart',
    eyebrow: 'Better, together',
    copy: 'The island grows into a place for two: a home for everyday adventures and little surprises.',
  },
] as const;

const CINEMATIC_MOTES = [
  { left: '8%', top: '22%', size: 3, delay: 0.2, duration: 10, drift: 7 },
  { left: '23%', top: '58%', size: 4, delay: 1.2, duration: 12, drift: -7 },
  { left: '45%', top: '18%', size: 3, delay: 2.0, duration: 9, drift: 6 },
  { left: '67%', top: '65%', size: 4, delay: 0.8, duration: 13, drift: -8 },
  { left: '84%', top: '25%', size: 3, delay: 2.8, duration: 10, drift: 7 },
] as const;

/** Read-only descriptions of the *real* 3D demo states, not fake game controls. */
function GameplayDetailPanel({ stage, points }: { stage: (typeof GAMEPLAY_STAGES)[number]; points: number }) {
  const chip = 'rounded-lg border border-[#e8ddca] bg-[#fffdf7]/90 px-2.5 py-1.5 text-[11px] font-medium text-[#6c6151]';
  return (
    <div className="mt-4 border-t border-[#e8ddca] pt-3">
      {stage.label === 'Arrive' && (
        <div className="flex flex-wrap gap-2">
          <span className={chip}>🏡 Land ready</span>
          <span className={chip}>✧ {points} shared Points</span>
        </div>
      )}
      {stage.label === 'Build' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {BUILDER_CATEGORIES.map((category) => <span key={category} className={chip}>{category}</span>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={chip}>🛠️ Workshop</span>
            <span className={chip}>Ghost preview</span>
            <span className={chip}>Rotate 60°</span>
            <span className={chip}>Place</span>
          </div>
        </div>
      )}
      {stage.label === 'Grow' && (
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>🌱 Garden Patch</span>
          <span className={chip}>🌸 Flowers</span>
          <span className={chip}>🪑 Bench placed · Undo</span>
        </div>
      )}
      {stage.label === 'Edit' && (
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>🪑 Bench</span>
          <span className={chip}>Move</span>
          <span className={chip}>Rotate</span>
          <span className={chip}>Remove</span>
        </div>
      )}
      {stage.label === 'Expand' && (
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>✧ +7 hexes</span>
          <span className={chip}>100 Points</span>
          <span className={chip}>{points} shared Points</span>
        </div>
      )}
      {stage.label === 'Together' && (
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>♥ Your world grew</span>
          <span className={chip}>✧ {points} Points</span>
        </div>
      )}
    </div>
  );
}

export function LandingWorldExperience() {
  const snapshots = React.useMemo(() => createLandingGameplaySnapshots(), []);
  const prefersReducedMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [entering, setEntering] = React.useState(false);
  const activeStageIndex = prefersReducedMotion ? GAMEPLAY_STAGES.length - 1 : stageIndex;
  const activeStage = GAMEPLAY_STAGES[activeStageIndex];
  const activeSnapshot = snapshots[activeStageIndex];

  React.useEffect(() => {
    if (prefersReducedMotion || !isPlaying) return;
    const interval = window.setInterval(
      () => setStageIndex((current) => (current + 1) % GAMEPLAY_STAGES.length),
      GAMEPLAY_LOOP_MS / GAMEPLAY_STAGES.length,
    );
    return () => window.clearInterval(interval);
  }, [prefersReducedMotion, isPlaying]);

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
    <main className="relative isolate min-h-[100svh] overflow-x-hidden bg-[#f8f2e8] text-[#443b32] sm:h-[100svh] sm:min-h-[42rem] sm:overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[radial-gradient(ellipse_at_70%_33%,#f4f8e9_0%,#f5efe2_49%,#f8f2e8_100%)]">
        <div className="absolute -right-[15%] -top-[25%] h-[60vw] min-h-[34rem] w-[60vw] min-w-[34rem] rounded-full bg-[#fffaf0]/75 blur-3xl" />
        <div className="absolute -left-[25%] bottom-[-48%] h-[60vw] min-h-[30rem] w-[60vw] min-w-[30rem] rounded-full bg-[#e8e4d2]/65 blur-3xl" />
      </div>

      <section aria-label="Preview of your floating world" className="absolute inset-0 z-10">
        <motion.div
          className="absolute -inset-2"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0.2 : 0.9 }}
        >
          <HexWorld3D
            visualStyle="storybook"
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
      </section>

      <AnimatePresence initial={false}>
        <motion.div
          key={activeStage.label}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[15] bg-[#f8f2e8]"
          initial={{ opacity: prefersReducedMotion ? 0 : 0.13 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
        />
      </AnimatePresence>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {CINEMATIC_MOTES.map((mote) => (
          <motion.span
            key={mote.left}
            className="absolute rounded-full bg-[#fff9e7]/80 shadow-[0_0_10px_rgba(255,249,231,0.6)]"
            style={{ left: mote.left, top: mote.top, width: mote.size, height: mote.size }}
            animate={prefersReducedMotion
              ? { opacity: 0.28 }
              : { x: [0, mote.drift, 0], y: [0, -12, 0], opacity: [0.1, 0.58, 0.1] }}
            transition={prefersReducedMotion
              ? { duration: 0 }
              : { duration: mote.duration, delay: mote.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[min(80%,35rem)] bg-gradient-to-b from-transparent via-[#f8f2e8]/60 to-[#f8f2e8]/95 sm:h-[53svh] lg:h-[50svh]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[90vw] bg-gradient-to-r from-[#f8f2e8]/85 via-[#f8f2e8]/15 to-transparent sm:w-[68vw] lg:w-[54vw]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8 sm:pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-4">
          <div className="pointer-events-auto flex items-center gap-2.5" aria-label="Narinyland">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[#ead9ca] bg-[#fff9ef]/95 text-lg text-[#a36e61] shadow-[0_3px_12px_rgba(82,65,44,0.08)]" aria-hidden="true">♥</span>
            <div>
              <span className="block text-[15px] font-semibold tracking-[-0.02em] text-[#443b33]">Narinyland</span>
              <span className="hidden text-[11px] font-medium text-[#817365] sm:block">A little place for two</span>
            </div>
          </div>
          <button
            type="button"
            onClick={enterWorld}
            disabled={entering}
            className="cozy-float pointer-events-auto min-h-11 rounded-2xl px-4 text-sm font-semibold transition-colors hover:bg-[#f3ebdf] disabled:cursor-wait disabled:opacity-70"
          >
            {entering ? 'Opening…' : 'Sign in'} <span aria-hidden="true" className="ml-1">↗</span>
          </button>
        </div>
      </header>

      <section aria-labelledby="landing-title" className="pointer-events-none relative z-30 px-5 pb-[calc(2.25rem+env(safe-area-inset-bottom))] pt-[clamp(16rem,45svh,28rem)] sm:absolute sm:inset-x-0 sm:bottom-[calc(3rem+env(safe-area-inset-bottom))] sm:px-8 sm:pb-0 sm:pt-0 lg:bottom-[calc(3.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-[88rem]">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.7 }}
            className="max-w-[38rem]"
          >
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#e6d8c4] bg-[#fff9ef]/90 px-3 py-1.5 text-[11px] font-medium tracking-wide text-[#5a755b] shadow-sm backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8ca98a]" aria-hidden="true" />
              The coziest adventures are shared
            </p>
            <h1 id="landing-title" className="max-w-[36rem] text-[clamp(2.2rem,5vw,4.75rem)] font-semibold leading-[1.08] tracking-[-0.045em] text-[#3d392e] [text-wrap:balance]">
              A little world that belongs to both of you.
            </h1>
            <p className="mt-4 max-w-[33rem] text-sm font-medium leading-7 text-[#675c4d] sm:text-base sm:leading-8">
              Build a tiny home, wander through your own island, and turn everyday moments into a story you grow together.
            </p>
            <div className="pointer-events-auto mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/signup"
                className="cozy-button-primary inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl px-5 text-sm font-semibold transition-colors"
              >
                Create our world <i className="fas fa-arrow-right text-xs" aria-hidden="true" />
              </Link>
              <motion.button
                type="button"
                onClick={enterWorld}
                disabled={entering}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="cozy-button-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {entering ? 'Opening your world…' : 'Enter Narinyland'}
              </motion.button>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-[#7a715f] sm:text-xs">
              <span>🌿 A home to grow</span>
              <span>🏮 Little daily adventures</span>
              <span>💌 Memories to keep</span>
            </div>
          </motion.div>
        </div>
      </section>

      <aside aria-label="Scenes from your little world" className="cozy-surface pointer-events-auto absolute right-6 top-[calc(6.5rem+env(safe-area-inset-top))] z-30 hidden w-[min(21rem,29vw)] rounded-[1.6rem] p-4 lg:block xl:right-10 xl:top-[calc(8rem+env(safe-area-inset-top))] xl:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#7f8e70]">A peek inside</p>
            <h2 className="mt-1 text-base font-semibold text-[#4a4137]">A day in your world</h2>
          </div>
          {!prefersReducedMotion && (
            <button
              type="button"
              onClick={() => setIsPlaying((playing) => !playing)}
              className="cozy-button-secondary min-h-9 rounded-xl px-2.5 text-[11px] font-medium"
              aria-label={isPlaying ? 'Pause world preview' : 'Play world preview'}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          )}
        </div>
        <div role="group" aria-label="Choose a scene from the game" className="mt-4 flex gap-1.5">
          {GAMEPLAY_STAGES.map((stage, index) => (
            <button
              type="button"
              key={stage.label}
              onClick={() => { setStageIndex(index); setIsPlaying(false); }}
              disabled={!!prefersReducedMotion}
              aria-label={`Show ${stage.label} scene`}
              aria-current={activeStageIndex === index ? 'step' : undefined}
              className={`h-2 min-w-0 flex-1 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#476b55] ${activeStageIndex === index ? 'bg-[#597c5b]' : 'bg-[#dcd4c4] hover:bg-[#9eb29a]'}`}
            />
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeStage.label}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            className="mt-5"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e7eddf] text-[#52765b]" aria-hidden="true">
                <i className={`fas ${activeStage.icon} text-base`} />
              </span>
              <div>
                <p className="text-[11px] font-medium text-[#8a7764]">{activeStage.eyebrow}</p>
                <h3 className="mt-0.5 text-lg font-semibold text-[#453b31]">{activeStage.label}</h3>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-[#706456]">{activeStage.copy}</p>
            <GameplayDetailPanel stage={activeStage} points={activeSnapshot.points} />
          </motion.div>
        </AnimatePresence>
        <p className="mt-3 text-[10px] leading-5 text-[#968775]">A guided preview of the real Narinyland homestead.</p>
      </aside>
    </main>
  );
}
