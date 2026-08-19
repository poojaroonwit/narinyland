"use client";

import React from 'react';
import { BUILDING_CATALOG, type HexBuildingCategory, type HexBuildingKey } from '@/lib/hex-world/building-catalog';

const CATEGORY_LABELS: Array<{ key: HexBuildingCategory; label: string }> = [
  { key: 'main', label: 'Main' },
  { key: 'utility', label: 'Utility' },
  { key: 'nature', label: 'Nature' },
  { key: 'decor', label: 'Decor' },
];

const ICONS: Record<string, string> = {
  home: '🏡', storage: '📦', workshop: '🛠️', tree: '🌳', flower_patch: '🌸', pond: '💧',
  bench: '🪑', lamp: '🏮', fence: '🪵', stone_path: '🪨', garden_patch: '🌱',
};

export function HexBuildCatalog({
  open,
  activeBuildingKey,
  onToggle,
  onSelect,
  onClose,
}: {
  open: boolean;
  activeBuildingKey: string | null;
  onToggle: () => void;
  onSelect: (buildingKey: HexBuildingKey) => void;
  onClose: () => void;
}) {
  return (
    <>
      <button type="button" onClick={onToggle} className="fixed bottom-24 left-6 z-[85] flex h-14 items-center gap-2 rounded-full border border-white/70 bg-emerald-700 px-5 text-sm font-black text-white shadow-2xl backdrop-blur-xl">
        <span>🔨</span><span>Build</span>
      </button>
      {open && (
        <aside className="fixed bottom-24 left-6 z-[90] w-[min(92vw,360px)] max-h-[66vh] overflow-y-auto rounded-3xl border border-white/80 bg-[#fffdf7]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Build Catalog</p><h2 className="text-lg font-black text-stone-800">Shape your homestead</h2></div><button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-stone-100 text-stone-500">×</button></div>
          {CATEGORY_LABELS.map((category) => {
            const items = (Object.values(BUILDING_CATALOG) as Array<(typeof BUILDING_CATALOG)[HexBuildingKey]>).filter((item) => item.category === category.key);
            return <section key={category.key} className="mb-4"><h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-stone-400">{category.label}</h3><div className="grid grid-cols-2 gap-2">{items.map((item) => <button key={item.key} type="button" onClick={() => onSelect(item.key as HexBuildingKey)} className={`rounded-2xl border p-3 text-left transition ${activeBuildingKey === item.key ? 'border-emerald-400 bg-emerald-50' : 'border-stone-100 bg-white hover:border-emerald-200'}`}><div className="text-xl">{ICONS[item.key] || '⬡'}</div><div className="mt-1 text-sm font-black text-stone-700">{item.name}</div><div className="text-[10px] font-bold text-stone-400">Free to place</div></button>)}</div></section>;
          })}
        </aside>
      )}
    </>
  );
}
