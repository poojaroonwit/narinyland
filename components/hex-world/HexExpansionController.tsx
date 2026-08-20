"use client";

import React, { useState } from 'react';
import { hexKey } from '@/lib/hex-world/hex-grid';
import type { HexWorldSnapshot } from '@/lib/hex-world/types';
import { hexWorldAPI } from '@/services/hex-world-api';

export function HexExpansionController({
  landId,
  snapshot,
  activeExpansionKey,
  onCancelPreview,
  onConfirmed,
  showToast,
}: {
  landId: string;
  snapshot: HexWorldSnapshot;
  activeExpansionKey: string | null;
  onCancelPreview: () => void;
  onConfirmed: (snapshot: HexWorldSnapshot, newTileKeys: Set<string>) => void;
  showToast: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const active = snapshot.expansions.find((item) => item.expansionKey === activeExpansionKey) ?? null;
  const affordable = !!active && snapshot.points >= active.pointCost;

  const confirm = async () => {
    if (!active || busy || !affordable) return;
    setBusy(true);
    try {
      const oldKeys = new Set(snapshot.tiles.map(hexKey));
      const confirmed = await hexWorldAPI.expand(landId, active.expansionKey);
      const newTileKeys = new Set(confirmed.tiles.filter((tile) => !oldKeys.has(hexKey(tile))).map(hexKey));
      onConfirmed(confirmed, newTileKeys);
      showToast(`Land expanded by ${newTileKeys.size || active.tiles.length} hexes ✨`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not expand this Land');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-[94] w-[min(92vw,430px)] -translate-x-1/2 rounded-3xl border border-white/80 bg-[#fffdf7]/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Expand Land</p>
          {active ? (
            <p className="truncate text-sm font-black text-stone-800">+{active.tiles.length} hexes · {active.pointCost} Points</p>
          ) : (
            <p className="text-sm font-black text-stone-700">Select an amber edge cluster</p>
          )}
          <p className="mt-0.5 text-[10px] font-bold text-stone-400">{snapshot.points.toLocaleString()} shared Points{active && !affordable ? ' · Not enough Points' : ''}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onCancelPreview} className="min-h-[44px] rounded-full bg-stone-100 px-4 text-xs font-black text-stone-600">Cancel</button>
          <button type="button" onClick={confirm} disabled={!active || !affordable || busy} className="min-h-[44px] rounded-full bg-amber-500 px-4 text-xs font-black text-white shadow-lg disabled:bg-stone-300">{busy ? 'Expanding…' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
