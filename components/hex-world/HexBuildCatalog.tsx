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

export function HexBuildCatalog({ open, activeBuildingKey, onSelect, onClose }: {
  open: boolean;
  activeBuildingKey: string | null;
  onSelect: (buildingKey: HexBuildingKey) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <aside className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-[91] max-h-[50vh] w-[min(94vw,760px)] -translate-x-1/2 overflow-y-auto rounded-3xl border border-white/80 bg-[#fffdf7]/96 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Build</p><h2 className="text-lg font-black text-stone-800">Shape your homestead</h2></div>
        <button type="button" onClick={onClose} className="h-11 w-11 rounded-full bg-stone-100 text-stone-500">×</button>
      </div>
      <div className="space-y-4 md:grid md:grid-cols-4 md:gap-3 md:space-y-0">
        {CATEGORY_LABELS.map((category) => {
          const items = (Object.values(BUILDING_CATALOG) as Array<(typeof BUILDING_CATALOG)[HexBuildingKey]>).filter((item) => item.category === category.key);
          return (
            <section key={category.key}>
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-stone-400">{category.label}</h3>
              <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-1 md:overflow-visible">
                {items.map((item) => (
                  <button key={item.key} type="button" onClick={() => onSelect(item.key as HexBuildingKey)} className={`min-w-[132px] rounded-2xl border p-3 text-left transition md:min-w-0 ${activeBuildingKey === item.key ? 'border-emerald-400 bg-emerald-50' : 'border-stone-100 bg-white hover:border-emerald-200'}`}>
                    <div className="flex items-center justify-between"><span className="text-xl">{ICONS[item.key] || '⬡'}</span><span className="text-[10px] font-black text-stone-400">{item.footprint.length}⬡</span></div>
                    <div className="mt-1 text-sm font-black text-stone-700">{item.name}</div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
