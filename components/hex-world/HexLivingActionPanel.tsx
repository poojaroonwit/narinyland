"use client";

import React from 'react';
import {
  CROP_CATALOG,
  RECIPE_CATALOG,
  canCookRecipe,
  chickenCost,
  fishingUnlocked,
  homeUpgradeCost,
  maxChickensForHome,
  type CropKey,
  type FamilyFarmState,
  type FarmAction,
  type RecipeKey,
} from '@/lib/family-farm-game';
import {
  getGardenActionTarget,
  getGardenSummary,
  getLivingBuildingRole,
} from '@/lib/hex-world/living-homestead';
import type { HexBuildingDTO } from '@/lib/hex-world/types';

type PanelMode = 'root' | 'plant' | 'cook' | 'chickens';

const actionButton = 'min-h-[42px] rounded-xl px-3 text-[10px] font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400';

export function HexLivingActionPanel({
  building,
  state,
  busy,
  onAction,
}: {
  building: HexBuildingDTO;
  state: FamilyFarmState;
  busy: boolean;
  onAction: (action: FarmAction) => Promise<boolean>;
}) {
  const [mode, setMode] = React.useState<PanelMode>('root');
  const role = getLivingBuildingRole(building.buildingKey);

  React.useEffect(() => setMode('root'), [building.id]);

  if (!role) return null;

  const run = (action: FarmAction) => void onAction(action);
  const title = role === 'home' ? 'Home life'
    : role === 'garden' ? 'Garden Patch'
      : role === 'pond' ? 'Pond'
        : role === 'forage' ? 'Wild tree'
          : role === 'family' ? 'Cozy spot'
            : 'Storage';

  const gardenSummary = getGardenSummary(state);
  const plantTarget = getGardenActionTarget(state, 'plant');
  const waterTarget = getGardenActionTarget(state, 'water');
  const harvestTarget = getGardenActionTarget(state, 'harvest');

  const plant = (cropKey: CropKey) => {
    if (!plantTarget) return;
    run({ type: 'plant', plotId: plantTarget.id, cropKey });
    setMode('root');
  };

  return (
    <aside className="pointer-events-auto fixed bottom-[calc(11.6rem+env(safe-area-inset-bottom))] left-3 z-[92] w-[min(94vw,390px)] rounded-[1.55rem] border border-white/75 bg-[#fffdf7]/92 p-3.5 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-xl md:bottom-[7rem] md:left-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-emerald-700">Living Homestead</p>
          <h3 className="mt-0.5 text-sm font-black text-stone-900">{title}</h3>
        </div>
        {mode !== 'root' && (
          <button type="button" onClick={() => setMode('root')} className="min-h-[36px] rounded-full bg-stone-100 px-3 text-[9px] font-black text-stone-500">Back</button>
        )}
      </div>

      {role === 'garden' && mode === 'root' && (
        <div className="mt-3">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <Stat label="Empty" value={gardenSummary.empty} />
            <Stat label="Growing" value={gardenSummary.growing} />
            <Stat label="Watered" value={gardenSummary.watered} />
            <Stat label="Ready" value={gardenSummary.ready} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button type="button" disabled={!plantTarget || busy} onClick={() => setMode('plant')} className={`${actionButton} bg-emerald-700 text-white`}>Plant</button>
            <button type="button" disabled={!waterTarget || busy} onClick={() => waterTarget && run({ type: 'water', plotId: waterTarget.id })} className={`${actionButton} bg-sky-100 text-sky-700`}>Water</button>
            <button type="button" disabled={!harvestTarget || busy} onClick={() => harvestTarget && run({ type: 'harvest', plotId: harvestTarget.id })} className={`${actionButton} bg-amber-100 text-amber-700`}>Harvest</button>
          </div>
        </div>
      )}

      {role === 'garden' && mode === 'plant' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(Object.keys(CROP_CATALOG) as CropKey[]).map((cropKey) => {
            const crop = CROP_CATALOG[cropKey];
            const seeds = state.inventory.seeds[cropKey];
            return (
              <button key={cropKey} type="button" disabled={!plantTarget || seeds <= 0 || busy} onClick={() => plant(cropKey)} className="min-h-[58px] rounded-2xl bg-white px-3 py-2 text-left shadow-sm disabled:opacity-45">
                <div className="flex items-center justify-between"><span className="text-lg">{crop.emoji}</span><span className="text-[9px] font-black text-stone-400">{seeds} seeds</span></div>
                <p className="mt-1 text-xs font-black text-stone-800">{crop.name}</p>
              </button>
            );
          })}
        </div>
      )}

      {role === 'pond' && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-stone-500">{fishingUnlocked(state) ? `${state.daily.fishingCharges} fishing trips left today.` : 'Reach level 2 to unlock fishing.'}</p>
          <button type="button" disabled={!fishingUnlocked(state) || state.daily.fishingCharges <= 0 || busy} onClick={() => run({ type: 'fish' })} className={`${actionButton} mt-2 w-full bg-sky-600 text-white`}>Fish</button>
        </div>
      )}

      {role === 'forage' && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-stone-500">{state.daily.forageCharges} nearby foraging trips left today.</p>
          <button type="button" disabled={state.daily.forageCharges <= 0 || busy} onClick={() => run({ type: 'forage' })} className={`${actionButton} mt-2 w-full bg-emerald-700 text-white`}>Forage</button>
        </div>
      )}

      {role === 'family' && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-stone-500">Slow down together and turn an ordinary day into a Family Moment.</p>
          <button type="button" disabled={state.daily.familyTime || busy} onClick={() => run({ type: 'family_time' })} className={`${actionButton} mt-2 w-full bg-pink-500 text-white`}>Family Time</button>
        </div>
      )}

      {role === 'storage' && (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">Inventory</p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <InventoryGroup title="Seeds" values={Object.entries(state.inventory.seeds)} />
            <InventoryGroup title="Produce" values={Object.entries(state.inventory.produce)} />
            <InventoryGroup title="Resources" values={Object.entries(state.inventory.resources)} className="col-span-2" />
          </div>
        </div>
      )}

      {role === 'home' && mode === 'root' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('cook')} className={`${actionButton} bg-amber-100 text-amber-800`}>Cook</button>
          <button type="button" disabled={state.daily.familyTime || busy} onClick={() => run({ type: 'family_time' })} className={`${actionButton} bg-pink-100 text-pink-700`}>Family Time</button>
          <button type="button" onClick={() => setMode('chickens')} className={`${actionButton} bg-yellow-100 text-yellow-800`}>Care Chickens</button>
          <button type="button" disabled={busy} onClick={() => run({ type: 'upgrade_home' })} className={`${actionButton} bg-emerald-100 text-emerald-800`}>Upgrade Home</button>
          <button type="button" disabled={busy} onClick={() => run({ type: 'end_day' })} className={`${actionButton} col-span-2 bg-stone-900 text-white`}>Sleep · End Day</button>
          <p className="col-span-2 text-center text-[9px] font-bold text-stone-400">Home Lv {state.homeLevel} · next upgrade {homeUpgradeCost(state.homeLevel)} coins</p>
        </div>
      )}

      {role === 'home' && mode === 'cook' && (
        <div className="mt-3 space-y-2">
          {(Object.keys(RECIPE_CATALOG) as RecipeKey[]).map((recipeKey) => {
            const recipe = RECIPE_CATALOG[recipeKey];
            const available = canCookRecipe(state, recipeKey);
            return (
              <button key={recipeKey} type="button" disabled={!available || busy} onClick={() => run({ type: 'cook', recipeKey })} className="flex min-h-[54px] w-full items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left shadow-sm disabled:opacity-45">
                <span className="text-xl">{recipe.emoji}</span>
                <span className="min-w-0 flex-1"><span className="block text-xs font-black text-stone-800">{recipe.name}</span><span className="block truncate text-[9px] font-semibold text-stone-400">+{recipe.energy} energy · +{recipe.hearts} hearts · Home Lv {recipe.minHomeLevel}</span></span>
                <span className={`text-[9px] font-black ${available ? 'text-emerald-600' : 'text-stone-300'}`}>{available ? 'Cook' : 'Missing'}</span>
              </button>
            );
          })}
        </div>
      )}

      {role === 'home' && mode === 'chickens' && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-yellow-50 px-3 py-2">
            <span className="text-[10px] font-black text-yellow-800">🐔 {state.livestock.chickens}/{maxChickensForHome(state.homeLevel)} chickens</span>
            <span className="text-[9px] font-bold text-stone-500">🥚 {state.livestock.eggsAvailable} ready</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled={state.livestock.fedToday || busy} onClick={() => run({ type: 'feed_chickens' })} className={`${actionButton} bg-yellow-100 text-yellow-800`}>Feed</button>
            <button type="button" disabled={state.livestock.eggsAvailable <= 0 || busy} onClick={() => run({ type: 'collect_eggs' })} className={`${actionButton} bg-white text-stone-700`}>Collect Eggs</button>
            <button type="button" disabled={state.livestock.chickens >= maxChickensForHome(state.homeLevel) || busy} onClick={() => run({ type: 'buy_chicken' })} className={`${actionButton} bg-emerald-100 text-emerald-800`}>Adopt Chicken</button>
          </div>
          <p className="mt-2 text-center text-[9px] font-bold text-stone-400">Next chicken: {chickenCost(state.livestock.chickens)} coins</p>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-white/70 p-2"><p className="text-sm font-black text-stone-800">{value}</p><p className="text-[8px] font-black uppercase tracking-wide text-stone-400">{label}</p></div>;
}

function InventoryGroup({ title, values, className = '' }: { title: string; values: Array<[string, number]>; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/70 p-2.5 ${className}`}>
      <p className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-stone-400">{title}</p>
      <div className="flex flex-wrap gap-1">
        {values.map(([key, value]) => <span key={key} className="rounded-full bg-stone-100 px-2 py-1 font-bold text-stone-600">{key.replace('_', ' ')} {value}</span>)}
      </div>
    </div>
  );
}
