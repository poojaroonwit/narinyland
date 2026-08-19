"use client";

import * as React from 'react';
import Image from 'next/image';
import {
  BEDTIME_MINUTES,
  CROP_CATALOG,
  CROP_KEYS,
  RESOURCE_CATALOG,
  RESOURCE_KEYS,
  chickenCost,
  createInitialFamilyFarmState,
  dailyGoalsComplete,
  formatFarmTime,
  getDailyGoals,
  getPlotProgress,
  homeUpgradeCost,
  isPlotReady,
  maxChickensForHome,
  normalizeFamilyFarmState,
  performFarmAction,
  xpToNextLevel,
  type CropKey,
  type FamilyFarmState,
  type FarmAction,
  type FarmPlot,
} from '@/lib/family-farm-game';
import { familyFarmAPI } from '@/services/family-farm-api';

type PartnerView = {
  name?: string;
  avatar?: string;
};

type FamilyLife2DProps = {
  activeCircleId?: string | null;
  activeLandId?: string | null;
  activeLandName?: string;
  circleName?: string;
  partners: {
    partner1: PartnerView;
    partner2: PartnerView;
  };
  onToast?: (message: string) => void;
};

type Panel = 'market' | 'bag' | 'coop' | 'goals' | 'family';
type SaveMode = 'loading' | 'server' | 'local';
type Position = { x: number; y: number };
type SpotId = 'home' | 'coop' | 'woods' | 'market' | 'garden' | 'family';

type WorldSpot = {
  id: SpotId;
  x: number;
  y: number;
  emoji: string;
  label: string;
  hint: string;
};

const WEATHER_META = {
  sunny: { emoji: '☀️', label: 'Sunny', note: 'Water crops before sleeping.' },
  cloudy: { emoji: '☁️', label: 'Cloudy', note: 'A calm day for family chores.' },
  rainy: { emoji: '🌧️', label: 'Rainy', note: 'Rain grows every planted crop tonight.' },
  breezy: { emoji: '🍃', label: 'Breezy', note: 'Perfect weather to explore the woods.' },
} as const;

const WORLD_SPOTS: WorldSpot[] = [
  { id: 'home', x: 18, y: 24, emoji: '🏡', label: 'Home', hint: 'Rest and improve your family home' },
  { id: 'family', x: 48, y: 25, emoji: '💛', label: 'Family', hint: 'Spend quality time together' },
  { id: 'coop', x: 80, y: 25, emoji: '🐔', label: 'Chicken Coop', hint: 'Feed chickens and collect eggs' },
  { id: 'market', x: 18, y: 61, emoji: '🛒', label: 'Market', hint: 'Buy seeds and sell your harvest' },
  { id: 'garden', x: 50, y: 69, emoji: '🥕', label: 'Garden', hint: 'Plant, water, and harvest crops' },
  { id: 'woods', x: 82, y: 65, emoji: '🌲', label: 'Woods', hint: 'Forage for wild resources' },
];

function isImageAvatar(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('/api/') || value.startsWith('/');
}

function FamilyAvatar({ member, fallback }: { member: PartnerView; fallback: string }) {
  const avatar = member.avatar || fallback;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-white text-lg shadow-sm">
        {isImageAvatar(avatar) ? (
          <Image src={avatar} alt="" fill sizes="40px" className="object-cover" unoptimized />
        ) : (
          <span aria-hidden="true">{avatar}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-black text-stone-800">{member.name || 'Family member'}</p>
        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Family</p>
      </div>
    </div>
  );
}

function cropEmoji(plot: FarmPlot) {
  if (!plot.cropKey) return '＋';
  const crop = CROP_CATALOG[plot.cropKey];
  if (isPlotReady(plot)) return crop.emoji;
  const progress = getPlotProgress(plot);
  if (progress < 0.34) return crop.sproutEmoji;
  if (progress < 0.68) return '🌿';
  return '🌱';
}

function PlotTile({ plot, disabled, onClick }: { plot: FarmPlot; disabled: boolean; onClick: () => void }) {
  const ready = isPlotReady(plot);
  const progress = getPlotProgress(plot);
  const crop = plot.cropKey ? CROP_CATALOG[plot.cropKey] : null;
  const label = !crop
    ? 'Empty garden plot. Plant selected seed.'
    : ready
      ? `${crop.name} ready to harvest.`
      : `${crop.name}, ${plot.growthDays} of ${crop.growDays} growing days${plot.watered ? ', watered today' : ''}.`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={`group relative aspect-square min-h-[46px] overflow-hidden rounded-[14px] border-2 text-center shadow-[inset_0_-8px_16px_rgba(70,35,20,0.14)] transition active:scale-95 disabled:cursor-wait disabled:opacity-70 ${
        ready
          ? 'border-amber-300 bg-amber-100 hover:border-amber-400'
          : crop
            ? 'border-[#805036] bg-[#9b6848] hover:border-[#70432e]'
            : 'border-[#a97858] bg-[#b9825e] hover:border-emerald-300'
      }`}
    >
      <span className={`relative z-10 grid h-full place-items-center text-xl sm:text-2xl ${ready ? 'animate-bounce' : ''}`} aria-hidden="true">
        {cropEmoji(plot)}
      </span>
      {plot.watered && !ready && <span className="absolute right-1 top-1 rounded-full bg-sky-100 px-1 text-[8px] shadow">💧</span>}
      {crop && (
        <div className="absolute inset-x-1.5 bottom-1 h-1 overflow-hidden rounded-full bg-black/15" aria-hidden="true">
          <div className={`h-full rounded-full ${ready ? 'bg-amber-300' : 'bg-emerald-300'}`} style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
      )}
    </button>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md">
      <span className="text-base" aria-hidden="true">{icon}</span>
      <div className="leading-none">
        <p className="text-[8px] font-black uppercase tracking-wider text-stone-400">{label}</p>
        <p className="mt-1 text-xs font-black text-stone-800">{value}</p>
      </div>
    </div>
  );
}

function distance(a: Position, b: Position) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampPosition(position: Position): Position {
  return {
    x: Math.max(5, Math.min(95, position.x)),
    y: Math.max(8, Math.min(91, position.y)),
  };
}

function WorldLandmark({ spot, nearby }: { spot: WorldSpot; nearby: boolean }) {
  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      aria-label={`${spot.label}: ${spot.hint}`}
    >
      <div className={`grid h-16 w-16 place-items-center rounded-[22px] border-2 text-4xl shadow-lg transition sm:h-20 sm:w-20 sm:text-5xl ${nearby ? 'scale-110 border-amber-300 bg-amber-50/95 ring-4 ring-amber-200/50' : 'border-white/70 bg-white/72'}`}>
        {spot.emoji}
      </div>
      <div className={`mx-auto mt-1 w-max max-w-[100px] rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider shadow-sm backdrop-blur ${nearby ? 'bg-amber-500 text-white' : 'bg-white/80 text-stone-600'}`}>
        {spot.label}
      </div>
    </div>
  );
}

export default function FamilyLife2D({
  activeCircleId,
  activeLandId,
  activeLandName,
  circleName,
  partners,
  onToast,
}: FamilyLife2DProps) {
  const [farm, setFarm] = React.useState<FamilyFarmState | null>(null);
  const [selectedCrop, setSelectedCrop] = React.useState<CropKey>('carrot');
  const [panel, setPanel] = React.useState<Panel>('market');
  const [notice, setNotice] = React.useState('');
  const [saveMode, setSaveMode] = React.useState<SaveMode>('loading');
  const [busy, setBusy] = React.useState(false);
  const [familyEditorOpen, setFamilyEditorOpen] = React.useState(false);
  const [familyDraft, setFamilyDraft] = React.useState('');
  const [player, setPlayer] = React.useState<Position>({ x: 50, y: 48 });
  const [facing, setFacing] = React.useState<'up' | 'down' | 'left' | 'right'>('down');
  const loadedStorageKeyRef = React.useRef<string | null>(null);

  const familyFallbackName = React.useMemo(() => {
    const base = (circleName || 'Our Family').trim();
    return `${base} Farm`.slice(0, 32);
  }, [circleName]);

  const storageKey = React.useMemo(
    () => `narinyland:family-farm:v1:${activeCircleId || 'default'}:${activeLandId || 'main'}`,
    [activeCircleId, activeLandId]
  );

  React.useEffect(() => {
    let cancelled = false;
    let cached = createInitialFamilyFarmState(familyFallbackName);

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) cached = normalizeFamilyFarmState(JSON.parse(saved), familyFallbackName);
    } catch (error) {
      console.warn('Could not read cached family farm save.', error);
    }

    loadedStorageKeyRef.current = storageKey;
    setFarm(cached);
    setFamilyDraft(cached.familyName);
    setNotice(cached.lastMessage);
    setSaveMode(activeLandId ? 'loading' : 'local');
    setPlayer({ x: 50, y: 48 });

    if (!activeLandId) return () => { cancelled = true; };

    familyFarmAPI.get(activeLandId)
      .then((response) => {
        if (cancelled) return;
        const normalized = normalizeFamilyFarmState(response.state, familyFallbackName);
        setFarm(normalized);
        setFamilyDraft(normalized.familyName);
        setNotice(normalized.lastMessage);
        setSaveMode('server');
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('Family farm API unavailable; using local fallback.', error);
        setSaveMode('local');
        setNotice('Shared save is unavailable right now. Playing from this device cache.');
      });

    return () => { cancelled = true; };
  }, [activeLandId, familyFallbackName, storageKey]);

  React.useEffect(() => {
    if (!farm || loadedStorageKeyRef.current !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(farm));
    } catch (error) {
      console.warn('Could not cache family farm save.', error);
    }
  }, [farm, storageKey]);

  const applyAction = React.useCallback(async (action: FarmAction) => {
    if (!farm || busy || saveMode === 'loading') return;

    let optimistic;
    try {
      optimistic = performFarmAction(farm, action);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That action could not be completed.';
      setNotice(message);
      onToast?.(message);
      return;
    }

    const previous = farm;
    setFarm(optimistic.state);
    setNotice(optimistic.message);

    if (saveMode !== 'server' || !activeLandId) {
      onToast?.(optimistic.message);
      return;
    }

    setBusy(true);
    try {
      const response = await familyFarmAPI.act(activeLandId, action);
      const synced = normalizeFamilyFarmState(response.state, familyFallbackName);
      setFarm(synced);
      const message = response.message || optimistic.message;
      setNotice(message);
      onToast?.(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save that family action.';
      try {
        const latest = await familyFarmAPI.get(activeLandId);
        setFarm(normalizeFamilyFarmState(latest.state, familyFallbackName));
      } catch {
        setFarm(previous);
      }
      setNotice(`Action not saved: ${message}`);
      onToast?.(`Action not saved: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [activeLandId, busy, familyFallbackName, farm, onToast, saveMode]);

  const movePlayer = React.useCallback((dx: number, dy: number, nextFacing: typeof facing) => {
    setFacing(nextFacing);
    setPlayer((current) => clampPosition({ x: current.x + dx, y: current.y + dy }));
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) event.preventDefault();
      if (key === 'arrowup' || key === 'w') movePlayer(0, -3, 'up');
      if (key === 'arrowdown' || key === 's') movePlayer(0, 3, 'down');
      if (key === 'arrowleft' || key === 'a') movePlayer(-3, 0, 'left');
      if (key === 'arrowright' || key === 'd') movePlayer(3, 0, 'right');
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer]);

  const nearestSpot = React.useMemo(() => {
    const sorted = WORLD_SPOTS
      .map((spot) => ({ spot, distance: distance(player, spot) }))
      .sort((a, b) => a.distance - b.distance);
    return sorted[0]?.distance <= 18 ? sorted[0].spot : null;
  }, [player]);

  const handlePlot = (plot: FarmPlot) => {
    const garden = WORLD_SPOTS.find((spot) => spot.id === 'garden');
    if (garden && distance(player, garden) > 31) {
      setNotice('Walk closer to the vegetable garden before tending a plot.');
      return;
    }
    if (!plot.cropKey) {
      void applyAction({ type: 'plant', plotId: plot.id, cropKey: selectedCrop });
      return;
    }
    if (isPlotReady(plot)) {
      void applyAction({ type: 'harvest', plotId: plot.id });
      return;
    }
    if (!plot.watered) {
      void applyAction({ type: 'water', plotId: plot.id });
      return;
    }
    setNotice(`${CROP_CATALOG[plot.cropKey].name} is watered. It will grow after you sleep.`);
  };

  const interact = React.useCallback(() => {
    if (!farm || !nearestSpot) {
      setNotice('Walk closer to a place and press Interact.');
      return;
    }

    switch (nearestSpot.id) {
      case 'home':
        if (farm.timeMinutes >= 18 * 60 || farm.energy <= 3) {
          void applyAction({ type: 'end_day' });
        } else {
          setPanel('family');
          setNotice('Home is where your family rests. You can sleep here later, rename the family, or upgrade the house.');
        }
        break;
      case 'family':
        void applyAction({ type: 'family_time' });
        break;
      case 'coop':
        setPanel('coop');
        if (farm.livestock.eggsAvailable > 0) {
          void applyAction({ type: 'collect_eggs' });
        } else if (!farm.livestock.fedToday) {
          void applyAction({ type: 'feed_chickens' });
        } else {
          setNotice('The chickens are happy and fed. Eggs will be ready after you sleep.');
        }
        break;
      case 'woods':
        void applyAction({ type: 'forage' });
        break;
      case 'market':
        setPanel('market');
        setNotice('The family market is open. Buy seeds or sell items from your bag.');
        break;
      case 'garden':
        setPanel('market');
        setNotice(`Selected ${CROP_CATALOG[selectedCrop].name}. Tap an empty plot to plant it.`);
        break;
    }
  }, [applyAction, farm, nearestSpot, selectedCrop]);

  React.useEffect(() => {
    const handleInteractKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e') return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      event.preventDefault();
      interact();
    };
    window.addEventListener('keydown', handleInteractKey);
    return () => window.removeEventListener('keydown', handleInteractKey);
  }, [interact]);

  if (!farm) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#dff4ca] px-6">
        <div className="rounded-[28px] border border-white/80 bg-white/85 px-8 py-7 text-center shadow-xl backdrop-blur-xl">
          <div className="text-4xl">🌱</div>
          <p className="mt-3 text-sm font-black text-stone-700">Opening the family world…</p>
        </div>
      </div>
    );
  }

  const weather = WEATHER_META[farm.weather];
  const xpTarget = xpToNextLevel(farm.level);
  const xpPercent = Math.min(100, Math.round((farm.xp / xpTarget) * 100));
  const actionDisabled = busy || saveMode === 'loading';
  const selected = CROP_CATALOG[selectedCrop];
  const goals = getDailyGoals(farm);
  const goalsDone = dailyGoalsComplete(farm);
  const homeCost = homeUpgradeCost(farm.homeLevel);
  const chickenPrice = chickenCost(farm.livestock.chickens);
  const maxChickens = maxChickensForHome(farm.homeLevel);
  const resourceCount = RESOURCE_KEYS.reduce((sum, key) => sum + farm.inventory.resources[key], 0);
  const produceCount = CROP_KEYS.reduce((sum, key) => sum + farm.inventory.produce[key], 0);
  const plantedCount = farm.plots.filter((plot) => plot.cropKey).length;
  const readyCount = farm.plots.filter(isPlotReady).length;
  const isEvening = farm.timeMinutes >= 18 * 60;
  const isLate = farm.timeMinutes >= 20 * 60;
  const dayProgress = Math.max(0, Math.min(1, (farm.timeMinutes - 6 * 60) / (BEDTIME_MINUTES - 6 * 60)));

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#dff4ca] text-stone-800">
      <div className="min-h-dvh" style={{ backgroundImage: 'linear-gradient(180deg, #dff5d0 0%, #c8ebaf 48%, #9dd27e 100%)' }}>
        <div className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col px-3 pb-36 pt-20 sm:px-5 md:px-7 md:pt-5">
          <header className="relative z-30 flex flex-col gap-3 pr-0 md:pr-[360px]">
            <div className="flex flex-wrap items-center gap-2">
              <Stat icon="📅" label="Day" value={farm.day} />
              <Stat icon="🕒" label="Time" value={formatFarmTime(farm.timeMinutes)} />
              <Stat icon={weather.emoji} label="Weather" value={weather.label} />
              <Stat icon="🪙" label="Coins" value={farm.coins.toLocaleString()} />
              <Stat icon="⚡" label="Energy" value={`${farm.energy}/${farm.maxEnergy}`} />
              <Stat icon="⭐" label="Level" value={farm.level} />
              <div className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${saveMode === 'server' ? 'border-emerald-100 bg-emerald-50/90 text-emerald-700' : saveMode === 'local' ? 'border-amber-100 bg-amber-50/90 text-amber-700' : 'border-white/70 bg-white/80 text-stone-400'}`}>
                {busy ? 'Saving…' : saveMode === 'server' ? '☁ Shared' : saveMode === 'local' ? '💾 Device' : 'Syncing…'}
              </div>
            </div>

            <div className="max-w-2xl rounded-[22px] border border-white/70 bg-white/78 px-4 py-3 shadow-sm backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">🌼</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-stone-800">{farm.familyName}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700/60">{activeLandName || 'Home Garden'} · Spring · {nearestSpot ? `Near ${nearestSpot.label}` : 'Exploring'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500">♥ {farm.hearts}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold leading-5 text-stone-500">{notice || weather.note}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200/70"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${xpPercent}%` }} /></div>
                    <span className="text-[9px] font-black text-stone-400">{farm.xp}/{xpTarget} XP</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="relative mt-4 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="relative min-h-[720px] overflow-hidden rounded-[34px] border-[4px] border-white/65 bg-[#8fca70] shadow-[0_30px_90px_rgba(67,112,44,.22)]" aria-label="Interactive 2D family world">
              <div className="absolute inset-0 opacity-35" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              <div className="absolute left-[34%] top-0 h-full w-[13%] rotate-[5deg] bg-[#e4ce94]/55" aria-hidden="true" />
              <div className="absolute bottom-0 left-0 h-[22%] w-full bg-[#75ba5e]/45" aria-hidden="true" />
              <div className="absolute right-[2%] top-[42%] h-28 w-28 rounded-full border-[10px] border-sky-100/50 bg-sky-300/70 shadow-inner" aria-hidden="true"><div className="grid h-full place-items-center text-2xl">🐟</div></div>

              {WORLD_SPOTS.map((spot) => (
                <WorldLandmark key={spot.id} spot={spot} nearby={nearestSpot?.id === spot.id} />
              ))}

              <div className="absolute bottom-[4%] left-[36%] z-20 w-[42%] min-w-[250px] max-w-[520px] rounded-[22px] border-2 border-[#d2aa72] bg-[#d8b383]/95 p-2.5 shadow-xl sm:p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div><p className="text-[8px] font-black uppercase tracking-widest text-[#70462d]">Vegetable garden</p><p className="text-[9px] font-bold text-white/90">{selected.emoji} {selected.name} selected</p></div>
                  <span className="rounded-full bg-white/70 px-2 py-1 text-[8px] font-black text-stone-600">{plantedCount} growing · {readyCount} ready</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {farm.plots.map((plot) => <PlotTile key={plot.id} plot={plot} disabled={actionDisabled} onClick={() => handlePlot(plot)} />)}
                </div>
              </div>

              <div className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-all duration-150" style={{ left: `${player.x}%`, top: `${player.y}%` }} aria-label="Your character">
                <div className={`relative grid h-12 w-12 place-items-center rounded-full border-[3px] border-white bg-amber-100 text-3xl shadow-[0_10px_20px_rgba(59,45,22,.3)] ${nearestSpot ? 'ring-4 ring-amber-200/60' : ''}`}>
                  <span className={facing === 'left' ? '-scale-x-100' : ''}>🧑‍🌾</span>
                  <span className="absolute -bottom-3 rounded-full bg-stone-800/75 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-white">You</span>
                </div>
              </div>

              {nearestSpot && (
                <button type="button" disabled={actionDisabled} onClick={interact} className="absolute left-1/2 top-[46%] z-50 -translate-x-1/2 rounded-full border-2 border-white bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-xl transition hover:scale-105 disabled:opacity-50">
                  E · Interact with {nearestSpot.label}
                </button>
              )}

              <div className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-700 ${isEvening ? 'bg-indigo-950/20' : 'bg-transparent'}`} style={{ opacity: isEvening ? Math.min(0.52, 0.18 + dayProgress * 0.35) : 0 }} aria-hidden="true" />
              {isLate && <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-indigo-950/75 px-4 py-2 text-[10px] font-black text-white shadow-lg">🌙 It is getting late. Head home soon.</div>}
            </section>

            <aside className="relative z-20 rounded-[30px] border border-white/70 bg-[#fffdf7]/92 p-4 shadow-[0_24px_70px_rgba(80,90,55,.16)] backdrop-blur-xl lg:min-h-[720px]">
              <div className="grid grid-cols-5 rounded-2xl bg-stone-100/80 p-1">
                {([
                  ['market', '🌱', 'Market'],
                  ['bag', '🎒', 'Bag'],
                  ['coop', '🐔', 'Coop'],
                  ['goals', '📋', 'Goals'],
                  ['family', '💛', 'Family'],
                ] as const).map(([key, icon, label]) => (
                  <button key={key} type="button" onClick={() => setPanel(key)} className={`rounded-xl px-1 py-2 text-[8px] font-black transition ${panel === key ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}><span className="block text-base">{icon}</span>{label}</button>
                ))}
              </div>

              {panel === 'market' && (
                <div className="mt-4">
                  <div className="flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Seed market</p><h2 className="text-lg font-black">Choose a crop</h2></div><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">🪙 {farm.coins}</span></div>
                  <div className="mt-3 space-y-2">
                    {CROP_KEYS.map((key) => {
                      const crop = CROP_CATALOG[key];
                      const active = selectedCrop === key;
                      return (
                        <div key={key} className={`rounded-2xl border p-3 ${active ? 'border-emerald-300 bg-emerald-50' : 'border-stone-100 bg-white'}`}>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setSelectedCrop(key)} className={`grid h-10 w-10 place-items-center rounded-xl text-2xl ${active ? 'bg-emerald-500' : 'bg-stone-50'}`} aria-label={`Select ${crop.name}`}>{crop.emoji}</button>
                            <div className="min-w-0 flex-1"><p className="text-sm font-black">{crop.name}</p><p className="text-[9px] font-semibold text-stone-400">{crop.growDays}d · sell {crop.sellPrice} · own {farm.inventory.seeds[key]}</p></div>
                            <button type="button" disabled={actionDisabled} onClick={() => void applyAction({ type: 'buy_seed', cropKey: key })} className="rounded-full bg-amber-100 px-2 py-1.5 text-[9px] font-black text-amber-800 disabled:opacity-40">+1 · {crop.seedCost}🪙</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-2xl bg-emerald-600 p-3 text-white"><p className="text-[8px] font-black uppercase tracking-widest text-emerald-100">Selected seed</p><div className="mt-1 flex items-center justify-between"><span className="font-black">{selected.emoji} {selected.name}</span><span className="text-[9px] font-bold text-emerald-100">{farm.inventory.seeds[selectedCrop]} left</span></div></div>
                </div>
              )}

              {panel === 'bag' && (
                <div className="mt-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Inventory</p>
                  <div className="flex items-end justify-between"><h2 className="text-lg font-black">Family bag</h2><span className="text-xs font-black text-stone-400">{produceCount + resourceCount} items</span></div>
                  <div className="mt-3 max-h-[570px] space-y-2 overflow-y-auto pr-1">
                    {CROP_KEYS.map((key) => {
                      const crop = CROP_CATALOG[key];
                      const quantity = farm.inventory.produce[key];
                      return <div key={key} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3"><span className="text-2xl">{crop.emoji}</span><div className="flex-1"><p className="text-xs font-black">{crop.name}</p><p className="text-[9px] text-stone-400">{quantity} · {crop.sellPrice}🪙 each</p></div><button type="button" disabled={!quantity || actionDisabled} onClick={() => void applyAction({ type: 'sell', cropKey: key, quantity: 'all' })} className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black text-emerald-800 disabled:opacity-35">Sell</button></div>;
                    })}
                    <div className="my-2 border-t border-stone-100" />
                    {RESOURCE_KEYS.map((key) => {
                      const item = RESOURCE_CATALOG[key];
                      const quantity = farm.inventory.resources[key];
                      return <div key={key} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3"><span className="text-2xl">{item.emoji}</span><div className="flex-1"><p className="text-xs font-black">{item.name}</p><p className="text-[9px] text-stone-400">{quantity} · {item.sellPrice}🪙 each</p></div><button type="button" disabled={!quantity || actionDisabled} onClick={() => void applyAction({ type: 'sell_resource', resourceKey: key, quantity: 'all' })} className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black text-emerald-800 disabled:opacity-35">Sell</button></div>;
                    })}
                  </div>
                </div>
              )}

              {panel === 'coop' && (
                <div className="mt-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Chicken coop</p><h2 className="text-lg font-black">Your flock</h2>
                  <div className="mt-3 rounded-[24px] bg-amber-50 p-4 text-center"><div className="text-5xl">🐔🐥</div><p className="mt-2 text-2xl font-black text-amber-800">{farm.livestock.chickens} chickens</p><p className="text-xs font-bold text-amber-600/70">Capacity {farm.livestock.chickens}/{maxChickens} · {farm.livestock.fedToday ? 'Fed today ✓' : 'Hungry today'}</p></div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" disabled={actionDisabled || farm.livestock.fedToday} onClick={() => void applyAction({ type: 'feed_chickens' })} className="rounded-2xl bg-emerald-600 px-3 py-3 text-xs font-black text-white disabled:opacity-35">🌾 Feed<br/><span className="text-[9px] font-semibold">1 energy · 15m</span></button>
                    <button type="button" disabled={actionDisabled || farm.livestock.eggsAvailable === 0} onClick={() => void applyAction({ type: 'collect_eggs' })} className="rounded-2xl bg-amber-500 px-3 py-3 text-xs font-black text-white disabled:opacity-35">🥚 Collect {farm.livestock.eggsAvailable}<br/><span className="text-[9px] font-semibold">10m</span></button>
                  </div>
                  <button type="button" disabled={actionDisabled || farm.livestock.chickens >= maxChickens || farm.coins < chickenPrice} onClick={() => void applyAction({ type: 'buy_chicken' })} className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-3 text-xs font-black text-amber-800 disabled:opacity-35">🐥 Adopt chicken · {chickenPrice} coins</button>
                  <p className="mt-3 rounded-2xl bg-stone-50 p-3 text-[10px] font-semibold leading-5 text-stone-500">Feed the flock during the day. Sleeping produces one egg per chicken. Upgrade your home to increase coop capacity.</p>
                </div>
              )}

              {panel === 'goals' && (
                <div className="mt-4">
                  <div className="flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-violet-600">Daily family goals</p><h2 className="text-lg font-black">Day {farm.day} chores</h2></div><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">🔥 {farm.dailyStreak} streak</span></div>
                  <div className="mt-3 space-y-2">
                    {goals.map((goal) => <div key={goal.key} className={`flex items-center gap-3 rounded-2xl border p-3 ${goal.complete ? 'border-emerald-100 bg-emerald-50' : 'border-stone-100 bg-white'}`}><span className="text-xl">{goal.emoji}</span><div className="flex-1"><p className={`text-xs font-black ${goal.complete ? 'text-emerald-700' : 'text-stone-700'}`}>{goal.label}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (goal.progress / goal.target) * 100)}%` }} /></div></div><span className="text-[9px] font-black text-stone-400">{goal.progress}/{goal.target}</span></div>)}
                  </div>
                  <button type="button" disabled={actionDisabled || !goalsDone || farm.daily.rewardClaimed} onClick={() => void applyAction({ type: 'claim_daily_reward' })} className="mt-3 w-full rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white shadow disabled:opacity-35">{farm.daily.rewardClaimed ? '✓ Daily reward claimed' : goalsDone ? '🎁 Claim family reward' : 'Complete all goals to claim'}</button>
                  <div className="mt-3 rounded-2xl bg-violet-50 p-3 text-[10px] font-semibold leading-5 text-violet-700">Reward: coins, strawberry seed, family hearts, XP, and +1 daily streak. Completed unclaimed goals are auto-claimed when you sleep.</div>
                </div>
              )}

              {panel === 'family' && (
                <div className="mt-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Family life</p><h2 className="text-lg font-black">Home & relationships</h2>
                  <div className="mt-3 space-y-2 rounded-[24px] bg-rose-50/70 p-4"><FamilyAvatar member={partners.partner1} fallback="🧑" /><FamilyAvatar member={partners.partner2} fallback="💛" /><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-rose-400" style={{ width: `${farm.hearts}%` }} /></div><p className="text-center text-[10px] font-black text-rose-600">♥ {farm.hearts}/100 family hearts</p></div>
                  <button type="button" disabled={actionDisabled || farm.daily.familyTime} onClick={() => void applyAction({ type: 'family_time' })} className="mt-3 w-full rounded-2xl bg-rose-500 px-4 py-3 text-xs font-black text-white disabled:opacity-35">💛 Spend family time · 45m</button>
                  <div className="mt-3 rounded-2xl border border-stone-100 bg-white p-3"><div className="flex items-center justify-between"><div><p className="text-xs font-black">🏡 Home level {farm.homeLevel}</p><p className="text-[9px] text-stone-400">Coop capacity {maxChickens}</p></div><button type="button" disabled={actionDisabled || farm.homeLevel >= 4 || farm.coins < homeCost} onClick={() => void applyAction({ type: 'upgrade_home' })} className="rounded-full bg-amber-100 px-3 py-1.5 text-[9px] font-black text-amber-800 disabled:opacity-35">Upgrade · {homeCost}🪙</button></div></div>
                  <button type="button" onClick={() => setFamilyEditorOpen(true)} className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs font-black text-stone-600">✏️ Rename family farm</button>
                  <button type="button" disabled={actionDisabled} onClick={() => void applyAction({ type: 'end_day' })} className="mt-2 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40">🌙 Sleep until tomorrow</button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <div className="fixed bottom-3 left-1/2 z-[75] w-[calc(100%-20px)] max-w-4xl -translate-x-1/2 sm:bottom-5">
        <div className="flex items-center justify-between gap-2 rounded-[26px] border border-white/80 bg-white/94 p-2.5 shadow-[0_20px_60px_rgba(61,85,45,.3)] backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-1 sm:w-36">
            <span />
            <button type="button" onClick={() => movePlayer(0, -3, 'up')} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-xs font-black active:bg-emerald-100">▲</button>
            <span />
            <button type="button" onClick={() => movePlayer(-3, 0, 'left')} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-xs font-black active:bg-emerald-100">◀</button>
            <button type="button" onClick={() => movePlayer(0, 3, 'down')} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-xs font-black active:bg-emerald-100">▼</button>
            <button type="button" onClick={() => movePlayer(3, 0, 'right')} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-xs font-black active:bg-emerald-100">▶</button>
          </div>
          <div className="hidden min-w-0 flex-1 px-3 text-center sm:block"><p className="text-xs font-black text-stone-700">WASD / Arrow keys to walk · E to interact</p><p className="mt-0.5 truncate text-[9px] font-semibold text-stone-400">{nearestSpot ? `${nearestSpot.emoji} ${nearestSpot.hint}` : 'Explore the farm and walk near a place to interact'}</p></div>
          <button type="button" disabled={actionDisabled || !nearestSpot} onClick={interact} className="min-w-[120px] rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-white shadow disabled:bg-stone-200 disabled:text-stone-400">{nearestSpot ? `${nearestSpot.emoji} Interact` : 'Walk closer'}</button>
          <button type="button" onClick={() => setPanel('goals')} className="hidden rounded-2xl bg-violet-100 px-4 py-3 text-xs font-black text-violet-700 md:block">📋 Goals</button>
        </div>
      </div>

      {familyEditorOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-stone-950/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setFamilyEditorOpen(false)}>
          <div className="w-full max-w-sm rounded-[26px] border border-white bg-[#fffdf8] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="family-life-name-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-2xl">💛</span><div><h2 id="family-life-name-title" className="text-base font-black">Name your family farm</h2><p className="text-xs font-semibold text-stone-400">Up to 32 characters</p></div></div>
            <input autoFocus value={familyDraft} maxLength={32} onChange={(event) => setFamilyDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { void applyAction({ type: 'rename_family', name: familyDraft }); setFamilyEditorOpen(false); } }} className="mt-5 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100" placeholder="Our Family Farm" />
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setFamilyEditorOpen(false)} className="rounded-full px-4 py-2 text-xs font-black text-stone-500 hover:bg-stone-100">Cancel</button><button type="button" disabled={actionDisabled} onClick={() => { void applyAction({ type: 'rename_family', name: familyDraft }); setFamilyEditorOpen(false); }} className="rounded-full bg-rose-500 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Save name</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
