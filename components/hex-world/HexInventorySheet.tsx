"use client";

import React from 'react';
import {
  PROGRESSION_CROP_CATALOG,
  PROGRESSION_CROP_KEYS,
  RESOURCE_CATALOG,
  RESOURCE_KEYS,
} from '@/lib/family-farm-progression';
import type { HomesteadLifeState } from '@/lib/homestead-life-engine';

export function HexInventorySheet({ open, state, onClose }: {
  open: boolean;
  state: HomesteadLifeState | null;
  onClose: () => void;
}) {
  if (!open || !state) return null;

  const seedTotal = PROGRESSION_CROP_KEYS.reduce((sum, key) => sum + state.inventory.seeds[key], 0);
  const produceTotal = PROGRESSION_CROP_KEYS.reduce((sum, key) => sum + state.inventory.produce[key], 0);
  const resourceTotal = RESOURCE_KEYS.reduce((sum, key) => sum + state.inventory.resources[key], 0)
    + state.inventory.resources.milk + state.inventory.resources.wool;

  return (
    <aside className="pointer-events-auto fixed bottom-[calc(10.2rem+env(safe-area-inset-bottom))] left-1/2 z-[94] max-h-[52vh] w-[min(94vw,520px)] -translate-x-1/2 overflow-y-auto rounded-[1.5rem] border border-white/80 bg-[#fffdf7]/96 p-3.5 shadow-2xl shadow-amber-950/[0.08] backdrop-blur-xl">
      <div className="sticky top-0 z-10 -mx-1 -mt-1 flex items-start justify-between gap-3 rounded-2xl bg-[#fffdf7]/96 px-1 pb-2 pt-1 backdrop-blur-xl">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-amber-600">Bag</p>
          <h2 className="text-base font-black text-stone-900">What the homestead has</h2>
          <p className="mt-0.5 text-[9px] font-bold text-stone-400">{seedTotal} seeds · {produceTotal} produce · {resourceTotal} resources</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close bag" className="h-10 w-10 rounded-full bg-stone-100 text-stone-500">×</button>
      </div>

      <InventorySection title="Seeds">
        {PROGRESSION_CROP_KEYS.map((key) => {
          const crop = PROGRESSION_CROP_CATALOG[key];
          const count = state.inventory.seeds[key];
          return <InventoryItem key={`seed-${key}`} emoji={crop.sproutEmoji} label={`${crop.name} seeds`} count={count} muted={count === 0} />;
        })}
      </InventorySection>

      <InventorySection title="Harvest">
        {PROGRESSION_CROP_KEYS.map((key) => {
          const crop = PROGRESSION_CROP_CATALOG[key];
          const count = state.inventory.produce[key];
          return <InventoryItem key={`produce-${key}`} emoji={crop.emoji} label={crop.name} count={count} muted={count === 0} />;
        })}
      </InventorySection>

      <InventorySection title="Resources">
        {RESOURCE_KEYS.map((key) => {
          const resource = RESOURCE_CATALOG[key];
          const count = state.inventory.resources[key];
          return <InventoryItem key={key} emoji={resource.emoji} label={resource.name} count={count} muted={count === 0} />;
        })}
        <InventoryItem emoji="🥛" label="Milk" count={state.inventory.resources.milk} muted={state.inventory.resources.milk === 0} />
        <InventoryItem emoji="🧶" label="Wool" count={state.inventory.resources.wool} muted={state.inventory.resources.wool === 0} />
      </InventorySection>
    </aside>
  );
}

function InventorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-stone-400">{title}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function InventoryItem({ emoji, label, count, muted = false }: { emoji: string; label: string; count: number; muted?: boolean }) {
  return (
    <div className={`flex min-h-[46px] items-center gap-2 rounded-xl border px-2.5 py-2 ${muted ? 'border-stone-100 bg-stone-50/70 opacity-55' : 'border-white bg-white/85 shadow-sm'}`}>
      <span className="text-base">{emoji}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-[9px] font-black text-stone-700">{label}</p><p className="text-[11px] font-black text-stone-900">{count}</p></div>
    </div>
  );
}
