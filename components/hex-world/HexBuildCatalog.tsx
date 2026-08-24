"use client";

import React from 'react';
import { BUILDING_CATALOG, type HexBuildingCategory, type HexBuildingKey } from '@/lib/hex-world/building-catalog';

const CATEGORY_LABELS: Array<{ key: HexBuildingCategory; label: string }> = [
  { key: 'main', label: 'Home' },
  { key: 'nature', label: 'Nature' },
  { key: 'utility', label: 'Utility' },
  { key: 'decor', label: 'Decor' },
];

const ICONS: Record<string, string> = {
  home: '🏡', barn: '🏚️', storage: '📦', workshop: '🛠️', tree: '🌳', flower_patch: '🌸', pond: '💧',
  bench: '🪑', lamp: '🏮', fence: '🪵', stone_path: '🪨', garden_patch: '🌱',
};

export const BUILDING_PURPOSES: Partial<Record<HexBuildingKey, string>> = {
  home: 'Rest, progress, and grow your family',
  barn: 'Care for animals and collect goods',
  storage: 'Keep supplies and manage what you gather',
  workshop: 'Craft and improve the homestead',
  tree: 'Forage useful wild resources',
  flower_patch: 'Tend flowers for Hearts and XP',
  pond: 'Fish and add a calm water corner',
  bench: 'Create a cozy Family Time spot',
  lamp: 'Warm up paths after sunset',
  fence: 'Shape small spaces and garden edges',
  stone_path: 'Connect buildings with a gentle path',
  garden_patch: 'Grow crops, water, and harvest',
};

export function HexBuildCatalog({ open, activeBuildingKey, onSelect, onClose }: {
  open: boolean;
  activeBuildingKey: string | null;
  onSelect: (buildingKey: HexBuildingKey) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <aside className="pointer-events-auto fixed bottom-[calc(10.2rem+env(safe-area-inset-bottom))] left-1/2 z-[94] max-h-[54vh] w-[min(94vw,780px)] -translate-x-1/2 overflow-y-auto rounded-[1.55rem] border border-white/80 bg-[#fffdf7]/96 p-3.5 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-xl">
      <div className="sticky top-0 z-10 -mx-1 -mt-1 mb-2 flex items-start justify-between gap-3 rounded-2xl bg-[#fffdf7]/96 px-1 pb-2 pt-1 backdrop-blur-xl">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">Build</p>
          <h2 className="text-base font-black text-stone-850">Shape your homestead</h2>
          <p className="mt-0.5 text-[9px] font-bold text-stone-400">Choose something, then place it directly in the world.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close build catalog" className="h-10 w-10 rounded-full bg-stone-100 text-stone-500">×</button>
      </div>

      <div className="space-y-3 md:grid md:grid-cols-4 md:gap-3 md:space-y-0">
        {CATEGORY_LABELS.map((category) => {
          const items = (Object.values(BUILDING_CATALOG) as Array<(typeof BUILDING_CATALOG)[HexBuildingKey]>).filter((item) => item.category === category.key);
          return (
            <section key={category.key}>
              <h3 className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-stone-400">{category.label}</h3>
              <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-1 md:overflow-visible">
                {items.map((item) => {
                  const active = activeBuildingKey === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onSelect(item.key as HexBuildingKey)}
                      className={`min-w-[164px] rounded-2xl border p-3 text-left transition active:scale-[0.98] md:min-w-0 ${active ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-900/10' : 'border-white bg-white/90 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/40'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-50 text-xl shadow-inner">{ICONS[item.key] || '⬡'}</span>
                        <span className={`rounded-full px-2 py-1 text-[8px] font-black ${active ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-400'}`}>{item.footprint.length} hex</span>
                      </div>
                      <p className="mt-2 text-[12px] font-black text-stone-800">{item.name}</p>
                      <p className="mt-0.5 min-h-[28px] text-[8px] font-bold leading-snug text-stone-400">{BUILDING_PURPOSES[item.key as HexBuildingKey] ?? 'Add a little more life to the island'}</p>
                      <p className={`mt-2 text-[8px] font-black ${active ? 'text-emerald-700' : 'text-stone-400'}`}>{active ? 'Selected · place in world' : 'Choose'}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
