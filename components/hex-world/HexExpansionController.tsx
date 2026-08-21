"use client";

import React, { useState } from 'react';
import { hexKey } from '@/lib/hex-world/hex-grid';
import type { HexExpansionPlacementPreview, HexWorldSnapshot } from '@/lib/hex-world/types';
import { hexWorldAPI } from '@/services/hex-world-api';

export function HexExpansionController({
  landId,
  snapshot,
  activeExpansionKey,
  placementPreview,
  placementPinned,
  onChooseExpansion,
  onReposition,
  onCancelPreview,
  onConfirmed,
  showToast,
}: {
  landId: string;
  snapshot: HexWorldSnapshot;
  activeExpansionKey: string | null;
  placementPreview: HexExpansionPlacementPreview | null;
  placementPinned: boolean;
  onChooseExpansion: (expansionKey: string) => void;
  onReposition: () => void;
  onCancelPreview: () => void;
  onConfirmed: (snapshot: HexWorldSnapshot, changedTileKeys: Set<string>) => void;
  showToast: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const available = snapshot.expansions.find((item) => item.expansionKey === activeExpansionKey) ?? null;
  const purchased = snapshot.purchasedExpansions?.find((item) => item.expansionKey === activeExpansionKey) ?? null;
  const active = available ?? purchased;
  const isMove = !!purchased;
  const affordable = isMove || (!!available && snapshot.points >= available.pointCost);

  const confirm = async () => {
    if (!active || !placementPreview || !placementPreview.valid || !placementPinned || busy || !affordable) return;
    const anchor = placementPreview.tiles.reduce((sum, tile) => ({ q: sum.q + tile.q, r: sum.r + tile.r }), { q: 0, r: 0 });
    anchor.q = Math.round(anchor.q / placementPreview.tiles.length);
    anchor.r = Math.round(anchor.r / placementPreview.tiles.length);
    setBusy(true);
    try {
      const oldKeys = new Set(snapshot.tiles.map(hexKey));
      const confirmed = isMove
        ? await hexWorldAPI.moveExpansion(landId, active.expansionKey, anchor)
        : await hexWorldAPI.expand(landId, active.expansionKey, anchor);
      const newKeys = new Set(confirmed.tiles.map(hexKey));
      const changedTileKeys = new Set<string>();
      for (const key of oldKeys) if (!newKeys.has(key)) changedTileKeys.add(key);
      for (const key of newKeys) if (!oldKeys.has(key)) changedTileKeys.add(key);
      onConfirmed(confirmed, changedTileKeys);
      showToast(isMove ? 'Land block moved ✨' : `Land expanded by ${placementPreview.tiles.length} hexes ✨`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : isMove ? 'Could not move this Land block' : 'Could not expand this Land');
    } finally {
      setBusy(false);
    }
  };

  const tierChoices = [1, 2, 3].map((tier) => snapshot.expansions.find((item) => item.tier === tier)).filter(Boolean) as typeof snapshot.expansions;

  return (
    <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-[94] w-[min(94vw,520px)] -translate-x-1/2 rounded-3xl border border-white/80 bg-[#fffdf7]/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Expand Land</p>
          {!active ? (
            <>
              <p className="mt-0.5 text-sm font-black text-stone-800">Choose new land or move a land block</p>
              <p className="mt-0.5 text-[10px] font-bold text-stone-400">{snapshot.points.toLocaleString()} shared Points</p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-sm font-black text-stone-800">{isMove ? 'Move Land' : `+${placementPreview?.tiles.length ?? available?.tiles.length ?? 0} hexes · ${available?.pointCost ?? 0} Points`}</p>
              <p className="mt-0.5 text-[10px] font-bold text-stone-500">
                {!placementPreview ? 'Choose where to place · move your pointer around the island'
                  : !placementPinned ? 'Click the ghost land to select this location'
                    : placementPreview.valid ? 'Location selected · ready to confirm' : 'This location is not valid'}
              </p>
            </>
          )}
        </div>
        <button type="button" onClick={onCancelPreview} className="min-h-[40px] shrink-0 rounded-full bg-stone-100 px-4 text-xs font-black text-stone-600">Cancel</button>
      </div>

      {!active && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {tierChoices.map((choice) => (
              <button key={choice.expansionKey} type="button" disabled={snapshot.points < choice.pointCost} onClick={() => onChooseExpansion(choice.expansionKey)} className="min-h-[52px] rounded-2xl bg-amber-50 px-2 text-[9px] font-black text-amber-800 disabled:bg-stone-100 disabled:text-stone-300">
                +{choice.tiles.length} hexes<br /><span className="text-[8px]">{choice.pointCost} Points</span>
              </button>
            ))}
          </div>
          {!!snapshot.purchasedExpansions?.length && (
            <div className="border-t border-stone-900/[0.06] pt-2">
              <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-stone-400">Purchased land blocks</p>
              <div className="grid grid-cols-2 gap-2">
                {snapshot.purchasedExpansions.map((item, index) => (
                  <button key={item.expansionKey} type="button" disabled={!item.movable} onClick={() => onChooseExpansion(item.expansionKey)} className="min-h-[42px] rounded-xl bg-white px-2 text-[9px] font-black text-stone-700 shadow-sm disabled:bg-stone-100 disabled:text-stone-300">
                    Land {index + 1} · Move Land{item.hasBuildings ? ' · Move buildings first' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {active && (
        <div className="mt-3 flex items-center gap-2">
          {placementPinned && <button type="button" onClick={onReposition} className="min-h-[44px] flex-1 rounded-xl bg-stone-100 px-3 text-[10px] font-black text-stone-600">Choose another location</button>}
          <button type="button" onClick={confirm} disabled={!placementPreview?.valid || !placementPinned || !affordable || busy} className="min-h-[44px] flex-1 rounded-xl bg-amber-500 px-4 text-[10px] font-black text-white shadow-lg disabled:bg-stone-300">
            {busy ? (isMove ? 'Moving…' : 'Expanding…') : isMove ? 'Confirm Move · Free' : `Confirm · ${available?.pointCost ?? 0} Points`}
          </button>
        </div>
      )}
    </div>
  );
}
