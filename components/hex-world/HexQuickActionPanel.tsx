"use client";

import React from 'react';
import {
  PROGRESSION_CROP_CATALOG,
  PROGRESSION_CROP_KEYS,
  getCropAvailability,
  type ProgressionCropKey,
} from '@/lib/family-farm-progression';
import type { HomesteadLifeAction, HomesteadLifeState } from '@/lib/homestead-life-engine';
import { getGardenActionTarget, getGardenSummary, getLivingBuildingRole } from '@/lib/hex-world/living-homestead';
import type { HexBuildingDTO } from '@/lib/hex-world/types';

const primaryButton = 'min-h-[46px] rounded-xl px-3 text-[10px] font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400';

export function HexQuickActionPanel({ building, state, busy, onAction, onMore }: {
  building: HexBuildingDTO;
  state: HomesteadLifeState;
  busy: boolean;
  onAction: (action: HomesteadLifeAction) => Promise<boolean>;
  onMore: () => void;
}) {
  const [planting, setPlanting] = React.useState(false);
  React.useEffect(() => setPlanting(false), [building.id]);
  const role = getLivingBuildingRole(building.buildingKey);
  if (!role) return null;

  const run = (action: HomesteadLifeAction) => void onAction(action);
  const gardenSummary = getGardenSummary(state);
  const plantTarget = getGardenActionTarget(state, 'plant');
  const waterTarget = getGardenActionTarget(state, 'water');
  const harvestTarget = getGardenActionTarget(state, 'harvest');
  const title = role === 'garden' ? 'Garden Patch'
    : role === 'pond' ? 'Pond'
      : role === 'forage' ? 'Wild Tree'
        : role === 'family' ? 'Cozy Spot'
          : role === 'flowers' ? 'Flower Patch'
            : role === 'home' ? 'Home'
              : role === 'barn' ? 'Barn'
                : role === 'workshop' ? 'Workshop'
                  : 'Storage';

  const plant = (cropKey: ProgressionCropKey) => {
    if (!plantTarget) return;
    run({ type: 'plant', plotId: plantTarget.id, cropKey });
    setPlanting(false);
  };

  return (
    <aside className="pointer-events-auto fixed bottom-[calc(10.4rem+env(safe-area-inset-bottom))] left-1/2 z-[92] w-[min(92vw,420px)] -translate-x-1/2 rounded-[1.35rem] border border-white/80 bg-[#fffdf7]/94 p-3 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">Selected</p>
          <h3 className="truncate text-sm font-black text-stone-850">{title}</h3>
          {role === 'garden' && <p className="text-[8px] font-bold text-stone-400">{gardenSummary.ready} ready · {gardenSummary.growing} growing · {gardenSummary.empty} empty</p>}
        </div>
        <button type="button" onClick={onMore} className="min-h-[42px] rounded-xl bg-stone-100 px-3 text-[9px] font-black text-stone-600">More</button>
      </div>

      {role === 'garden' && !planting && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button type="button" disabled={!plantTarget || busy} onClick={() => setPlanting(true)} className={`${primaryButton} bg-emerald-700 text-white`}>Plant</button>
          <button type="button" disabled={!waterTarget || busy} onClick={() => waterTarget && run({ type: 'water', plotId: waterTarget.id })} className={`${primaryButton} bg-sky-100 text-sky-700`}>Water</button>
          <button type="button" disabled={!harvestTarget || busy} onClick={() => harvestTarget && run({ type: 'harvest', plotId: harvestTarget.id })} className={`${primaryButton} bg-amber-100 text-amber-700`}>Harvest</button>
        </div>
      )}

      {role === 'garden' && planting && (
        <div className="mt-2">
          <div className="mb-1.5 flex items-center justify-between"><p className="text-[9px] font-black text-stone-500">Choose crop</p><button type="button" onClick={() => setPlanting(false)} className="min-h-[34px] rounded-lg px-2 text-[9px] font-black text-stone-400">Back</button></div>
          <div className="grid grid-cols-4 gap-1.5">
            {PROGRESSION_CROP_KEYS.map((cropKey) => {
              const crop = PROGRESSION_CROP_CATALOG[cropKey];
              const availability = getCropAvailability(state, cropKey);
              const seeds = state.inventory.seeds[cropKey];
              return (
                <button key={cropKey} type="button" disabled={!plantTarget || busy || seeds <= 0 || !availability.available} onClick={() => plant(cropKey)} className="min-h-[54px] rounded-xl bg-white px-1.5 py-1 text-center shadow-sm disabled:opacity-35">
                  <span className="block text-base">{crop.emoji}</span><span className="block truncate text-[8px] font-black text-stone-700">{crop.name}</span><span className="text-[7px] font-bold text-stone-400">{seeds} seeds</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {role === 'pond' && <QuickSingle label="Fish" copy="Try the pond for today’s catch." disabled={busy || state.daily.fishingCharges <= 0} onClick={() => run({ type: 'fish' })} />}
      {role === 'forage' && <QuickSingle label="Forage" copy="Gather something useful nearby." disabled={busy || state.daily.forageCharges <= 0} onClick={() => run({ type: 'forage' })} />}
      {role === 'family' && <QuickSingle label="Family Time" copy="Turn this spot into a shared moment." disabled={busy || state.daily.familyTime} onClick={() => run({ type: 'family_time' })} />}
      {role === 'flowers' && <QuickSingle label={state.daily.flowersTended ? 'Flowers tended' : 'Tend Flowers'} copy="A tiny daily ritual for Hearts and XP." disabled={busy || state.daily.flowersTended} onClick={() => run({ type: 'tend_flowers' })} />}
      {role === 'home' && <QuickSingle label="Sleep" copy="End the day and wake the homestead tomorrow." disabled={busy} onClick={() => run({ type: 'end_day' })} />}
      {role === 'barn' && <QuickSingle label="Care animals" copy="Feed, collect, welcome animals, and upgrade the Barn." disabled={false} onClick={onMore} />}
      {role === 'workshop' && <QuickSingle label="Craft" copy="Make tools and homestead improvements." disabled={false} onClick={onMore} />}
      {role === 'storage' && <QuickSingle label="Inventory" copy="Review supplies, sell goods, and upgrade Storage." disabled={false} onClick={onMore} />}
    </aside>
  );
}

function QuickSingle({ label, copy, disabled, onClick }: { label: string; copy: string; disabled: boolean; onClick: () => void }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/70 p-2">
      <p className="min-w-0 flex-1 text-[9px] font-bold leading-snug text-stone-500">{copy}</p>
      <button type="button" disabled={disabled} onClick={onClick} className={`${primaryButton} shrink-0 bg-emerald-700 text-white`}>{label}</button>
    </div>
  );
}
