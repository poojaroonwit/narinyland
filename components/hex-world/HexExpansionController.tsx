"use client";

import React, { useState } from 'react';
import { hexKey } from '@/lib/hex-world/hex-grid';
import type { HexExpansionPlacementPreview, HexWorldSnapshot } from '@/lib/hex-world/types';
import { hexWorldAPI } from '@/services/hex-world-api';

const TIER_PRESENTATION: Record<number, { name: string; emoji: string; copy: string }> = {
  1: { name: 'Small Grove', emoji: '🌿', copy: 'A cozy pocket for paths, flowers, or one new activity.' },
  2: { name: 'Garden Wing', emoji: '🌱', copy: 'Room for a meaningful garden, utility corner, or animal space.' },
  3: { name: 'Homestead Field', emoji: '🌾', copy: 'A generous new wing for the next chapter of your island.' },
};

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
  const presentation = active ? TIER_PRESENTATION[active.tier] ?? TIER_PRESENTATION[1] : null;

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
      showToast(isMove ? 'Land block moved ✨' : `${presentation?.name ?? 'Land'} joined your island ✨`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : isMove ? 'Could not move this Land block' : 'Could not grow this Land');
    } finally {
      setBusy(false);
    }
  };

  const tierChoices = [1, 2, 3].map((tier) => snapshot.expansions.find((item) => item.tier === tier)).filter(Boolean) as typeof snapshot.expansions;

  return (
    <div className="pointer-events-auto fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-[94] w-[min(94vw,540px)] -translate-x-1/2 rounded-[1.55rem] border border-white/80 bg-[#fffdf7]/96 p-3.5 shadow-2xl shadow-amber-950/[0.08] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-600">Grow your island</p>
          {!active ? (
            <>
              <p className="mt-0.5 text-base font-black text-stone-900">Choose how the homestead grows</p>
              <p className="mt-0.5 text-[9px] font-bold text-stone-400">✨ {snapshot.points.toLocaleString()} shared Points available</p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-base font-black text-stone-900">{presentation?.emoji} {isMove ? `Move ${presentation?.name ?? 'Land'}` : presentation?.name}</p>
              <p className="mt-0.5 text-[9px] font-bold text-stone-500">
                {!placementPreview ? 'Move the glowing land around the island.'
                  : !placementPinned ? 'Tap the ghost land to choose this spot.'
                    : placementPreview.valid ? 'This spot fits. Confirm when it feels right.' : 'That spot overlaps the existing homestead.'}
              </p>
            </>
          )}
        </div>
        <button type="button" onClick={onCancelPreview} className="min-h-[40px] shrink-0 rounded-full bg-stone-100 px-3 text-[9px] font-black text-stone-600">Cancel</button>
      </div>

      {!active && (
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            {tierChoices.map((choice) => {
              const tier = TIER_PRESENTATION[choice.tier] ?? TIER_PRESENTATION[1];
              const canAfford = snapshot.points >= choice.pointCost;
              return (
                <button
                  key={choice.expansionKey}
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onChooseExpansion(choice.expansionKey)}
                  className="min-h-[112px] rounded-2xl border border-amber-100 bg-amber-50/90 p-2.5 text-left shadow-sm transition active:scale-[0.98] disabled:border-stone-100 disabled:bg-stone-100 disabled:text-stone-300"
                >
                  <span className="text-xl">{tier.emoji}</span>
                  <span className="mt-1 block text-[10px] font-black text-stone-800">{tier.name}</span>
                  <span className="mt-0.5 block text-[8px] font-bold leading-snug text-stone-400">+{choice.tiles.length} hexes · {choice.pointCost} Points</span>
                  <span className="mt-1 block text-[7px] font-semibold leading-snug text-stone-400">{tier.copy}</span>
                </button>
              );
            })}
          </div>

          {!!snapshot.purchasedExpansions?.length && (
            <div className="border-t border-stone-900/[0.06] pt-2">
              <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-stone-400">Already part of your island</p>
              <div className="grid grid-cols-2 gap-2">
                {snapshot.purchasedExpansions.map((item, index) => {
                  const tier = TIER_PRESENTATION[item.tier] ?? TIER_PRESENTATION[1];
                  return (
                    <button key={item.expansionKey} type="button" disabled={!item.movable} onClick={() => onChooseExpansion(item.expansionKey)} className="min-h-[44px] rounded-xl bg-white px-2.5 text-left text-[9px] font-black text-stone-700 shadow-sm disabled:bg-stone-100 disabled:text-stone-300">
                      {tier.emoji} {tier.name} {index + 1}<span className="block text-[7px] font-bold text-stone-400">{item.hasBuildings ? 'Move buildings first' : 'Reposition land'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {active && (
        <div className="mt-3 flex items-center gap-2">
          {placementPinned && <button type="button" onClick={onReposition} className="min-h-[44px] flex-1 rounded-xl bg-stone-100 px-3 text-[9px] font-black text-stone-600">Try another spot</button>}
          <button type="button" onClick={confirm} disabled={!placementPreview?.valid || !placementPinned || !affordable || busy} className="min-h-[44px] flex-1 rounded-xl bg-amber-500 px-4 text-[9px] font-black text-white shadow-lg shadow-amber-900/15 disabled:bg-stone-300">
            {busy ? (isMove ? 'Moving…' : 'Growing…') : isMove ? 'Move here · Free' : `Grow here · ${available?.pointCost ?? 0} Points`}
          </button>
        </div>
      )}
    </div>
  );
}
