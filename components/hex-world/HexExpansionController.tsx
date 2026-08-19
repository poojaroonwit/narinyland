"use client";

import React, { useState } from 'react';
import { hexKey } from '@/lib/hex-world/hex-grid';
import type { HexExpansionDTO, HexWorldSnapshot } from '@/lib/hex-world/types';
import { hexWorldAPI } from '@/services/hex-world-api';

export function HexExpansionController({
  landId,
  snapshot,
  activeExpansionKey,
  onPreview,
  onCancelPreview,
  onConfirmed,
  showToast,
}: {
  landId: string;
  snapshot: HexWorldSnapshot;
  activeExpansionKey: string | null;
  onPreview: (expansion: HexExpansionDTO) => void;
  onCancelPreview: () => void;
  onConfirmed: (snapshot: HexWorldSnapshot, newTileKeys: Set<string>) => void;
  showToast: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = snapshot.expansions.find((item) => item.expansionKey === activeExpansionKey) ?? null;

  const confirm = async () => {
    if (!active || busy || snapshot.points < active.pointCost) return;
    setBusy(true);
    try {
      const oldKeys = new Set(snapshot.tiles.map(hexKey));
      const confirmed = await hexWorldAPI.expand(landId, active.expansionKey);
      const newTileKeys = new Set(confirmed.tiles.filter((tile) => !oldKeys.has(hexKey(tile))).map(hexKey));
      onConfirmed(confirmed, newTileKeys);
      setOpen(false);
      showToast(`Land expanded by ${newTileKeys.size || active.tiles.length} hexes ✨`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not expand this Land');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-24 right-6 z-[85] flex h-14 items-center gap-2 rounded-full border border-white/70 bg-amber-500 px-5 text-sm font-black text-white shadow-2xl backdrop-blur-xl"
      >
        <span>⬡</span><span>Expand Land</span>
      </button>

      {open && (
        <aside className="fixed bottom-24 right-6 z-[90] w-[min(92vw,360px)] max-h-[66vh] overflow-y-auto rounded-3xl border border-white/80 bg-[#fffdf7]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Expansion</p><h2 className="text-lg font-black text-stone-800">Grow your floating island</h2></div>
            <button type="button" onClick={() => { setOpen(false); onCancelPreview(); }} className="h-9 w-9 rounded-full bg-stone-100 text-stone-500">×</button>
          </div>
          <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">🪙 {snapshot.points.toLocaleString()} shared Points</div>
          <div className="space-y-2">
            {snapshot.expansions.map((expansion) => {
              const affordable = snapshot.points >= expansion.pointCost;
              const selected = expansion.expansionKey === activeExpansionKey;
              return (
                <button
                  key={expansion.expansionKey}
                  type="button"
                  disabled={!affordable || busy}
                  onClick={() => onPreview(expansion)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${selected ? 'border-amber-400 bg-amber-50' : 'border-stone-100 bg-white hover:border-amber-200'} disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  <div className="flex items-center justify-between"><span className="font-black text-stone-800">+{expansion.tiles.length} hexes</span><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">{expansion.pointCost} Points</span></div>
                  <p className="mt-1 text-[10px] font-bold text-stone-400">Tier {expansion.tier} · preview this edge cluster</p>
                </button>
              );
            })}
          </div>
          {active && (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onCancelPreview} className="flex-1 rounded-full bg-stone-100 px-4 py-2.5 text-sm font-black text-stone-600">Cancel</button>
              <button type="button" onClick={confirm} disabled={busy || snapshot.points < active.pointCost} className="flex-1 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow-lg disabled:bg-stone-300">{busy ? 'Expanding…' : 'Confirm'}</button>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
