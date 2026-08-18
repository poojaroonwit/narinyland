"use client";

import * as React from 'react';
import Image from 'next/image';
import {
  CROP_CATALOG,
  CROP_KEYS,
  createInitialFamilyFarmState,
  getPlotProgress,
  homeUpgradeCost,
  isPlotReady,
  normalizeFamilyFarmState,
  performFarmAction,
  xpToNextLevel,
  type CropKey,
  type FamilyFarmState,
  type FarmAction,
  type FarmPlot,
} from '@/lib/family-farm-game';

type PartnerView = {
  name?: string;
  avatar?: string;
};

type FamilyFarm2DProps = {
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

type DrawerMode = 'market' | 'bag' | 'family' | 'help';

const WEATHER_META = {
  sunny: { emoji: '☀️', label: 'Sunny', note: 'Water crops before ending the day.' },
  cloudy: { emoji: '☁️', label: 'Cloudy', note: 'A calm day for gardening.' },
  rainy: { emoji: '🌧️', label: 'Rainy', note: 'Rain grows every planted crop tonight.' },
  breezy: { emoji: '🍃', label: 'Breezy', note: 'Perfect weather for the family garden.' },
} as const;

function getAvatarKind(value?: string) {
  if (!value) return 'emoji';
  return /^https?:\/\//i.test(value) || value.startsWith('/api/') || value.startsWith('/');
}

function FamilyAvatar({ member, fallback }: { member: PartnerView; fallback: string }) {
  const avatar = member.avatar || fallback;
  const imageAvatar = getAvatarKind(avatar) === true;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-white text-xl shadow-md">
        {imageAvatar ? (
          <Image src={avatar} alt="" fill sizes="40px" className="object-cover" unoptimized />
        ) : (
          <span aria-hidden="true">{avatar}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-black text-stone-800">{member.name || 'Family member'}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">Family</p>
      </div>
    </div>
  );
}

function cropStageEmoji(plot: FarmPlot) {
  if (!plot.cropKey) return '＋';
  const crop = CROP_CATALOG[plot.cropKey];
  if (isPlotReady(plot)) return crop.emoji;
  const progress = getPlotProgress(plot);
  if (progress < 0.34) return crop.sproutEmoji;
  if (progress < 0.68) return '🌿';
  return '🌱';
}

function PlotTile({ plot, onClick }: { plot: FarmPlot; onClick: () => void }) {
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
      onClick={onClick}
      aria-label={label}
      className={`group relative aspect-square min-h-[54px] overflow-hidden rounded-[18px] border-2 text-center shadow-[inset_0_-8px_18px_rgba(70,35,20,0.12)] transition active:scale-95 ${
        ready
          ? 'border-amber-300 bg-amber-100 hover:border-amber-400'
          : crop
            ? 'border-[#8b5b3f] bg-[#9b6848] hover:border-[#70432e]'
            : 'border-[#a97858] bg-[#b9825e] hover:border-emerald-300'
      }`}
    >
      <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-black/10" aria-hidden="true" />
      <span
        className={`relative z-10 grid h-full place-items-center text-2xl sm:text-3xl ${ready ? 'animate-[bounce_1.6s_infinite]' : ''}`}
        aria-hidden="true"
      >
        {cropStageEmoji(plot)}
      </span>

      {plot.watered && !ready && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] shadow" aria-label="Watered">
          💧
        </span>
      )}

      {crop && (
        <div className="absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-black/15" aria-hidden="true">
          <div
            className={`h-full rounded-full ${ready ? 'bg-amber-300' : 'bg-emerald-300'}`}
            style={{ width: `${Math.max(8, progress * 100)}%` }}
          />
        </div>
      )}

      {!crop && (
        <span className="absolute inset-x-0 bottom-1.5 text-[8px] font-black uppercase tracking-widest text-white/55 opacity-0 transition group-hover:opacity-100">
          Plant
        </span>
      )}
    </button>
  );
}

function StatPill({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-md">
      <span className="text-base" aria-hidden="true">{icon}</span>
      <div className="leading-none">
        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-stone-400">{label}</p>
        <p className="mt-1 text-xs font-black text-stone-800">{value}</p>
      </div>
    </div>
  );
}

function GoalRow({ done, label, progress }: { done: boolean; label: string; progress: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/75 px-3 py-2.5">
      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${done ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
        {done ? '✓' : '○'}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-bold ${done ? 'text-emerald-700 line-through' : 'text-stone-700'}`}>{label}</p>
      </div>
      <span className="text-[10px] font-black text-stone-400">{progress}</span>
    </div>
  );
}

function LoadingFarm() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#dff4ca] px-6">
      <div className="rounded-[28px] border border-white/80 bg-white/80 px-8 py-7 text-center shadow-xl backdrop-blur-xl">
        <div className="text-4xl">🌱</div>
        <p className="mt-3 text-sm font-black text-stone-700">Opening the family garden…</p>
        <p className="mt-1 text-xs font-semibold text-stone-400">Loading your local farm save</p>
      </div>
    </div>
  );
}

export default function FamilyFarm2D({
  activeCircleId,
  activeLandId,
  activeLandName,
  circleName,
  partners,
  onToast,
}: FamilyFarm2DProps) {
  const [farm, setFarm] = React.useState<FamilyFarmState | null>(null);
  const [selectedCrop, setSelectedCrop] = React.useState<CropKey>('carrot');
  const [drawer, setDrawer] = React.useState<DrawerMode>('market');
  const [notice, setNotice] = React.useState('');
  const [familyEditorOpen, setFamilyEditorOpen] = React.useState(false);
  const [familyDraft, setFamilyDraft] = React.useState('');
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
    let next = createInitialFamilyFarmState(familyFallbackName);

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) next = normalizeFamilyFarmState(JSON.parse(saved), familyFallbackName);
    } catch (error) {
      console.warn('Could not read family farm save. Starting a safe default.', error);
    }

    loadedStorageKeyRef.current = storageKey;
    setFarm(next);
    setFamilyDraft(next.familyName);
    setNotice(next.lastMessage);
  }, [familyFallbackName, storageKey]);

  React.useEffect(() => {
    if (!farm || loadedStorageKeyRef.current !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(farm));
    } catch (error) {
      console.warn('Could not persist family farm save.', error);
    }
  }, [farm, storageKey]);

  const applyAction = React.useCallback((action: FarmAction) => {
    if (!farm) return;

    try {
      const result = performFarmAction(farm, action);
      setFarm(result.state);
      setNotice(result.message);
      onToast?.(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That action could not be completed.';
      setNotice(message);
      onToast?.(message);
    }
  }, [farm, onToast]);

  const handlePlot = (plot: FarmPlot) => {
    if (!plot.cropKey) {
      applyAction({ type: 'plant', plotId: plot.id, cropKey: selectedCrop });
      return;
    }
    if (isPlotReady(plot)) {
      applyAction({ type: 'harvest', plotId: plot.id });
      return;
    }
    if (!plot.watered) {
      applyAction({ type: 'water', plotId: plot.id });
      return;
    }
    const crop = CROP_CATALOG[plot.cropKey];
    setNotice(`${crop.name} is watered. End the day when you are ready to grow it.`);
  };

  if (!farm) return <LoadingFarm />;

  const weather = WEATHER_META[farm.weather];
  const xpTarget = xpToNextLevel(farm.level);
  const xpPercent = Math.min(100, Math.round((farm.xp / xpTarget) * 100));
  const homeCost = homeUpgradeCost(farm.homeLevel);
  const canUpgradeHome = farm.homeLevel < 4;
  const harvestedProduce = CROP_KEYS.reduce((sum, key) => sum + farm.inventory.produce[key], 0);
  const plantedCount = farm.plots.filter((plot) => plot.cropKey).length;
  const readyCount = farm.plots.filter(isPlotReady).length;

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#dff4ca] text-stone-800">
      <div
        className="min-h-dvh"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 18%, rgba(255,255,255,.72), transparent 22%), radial-gradient(circle at 88% 8%, rgba(255,245,196,.65), transparent 20%), linear-gradient(180deg, #dff5d0 0%, #c8ebaf 48%, #9dd27e 100%)',
        }}
      >
        <div className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col px-3 pb-28 pt-16 sm:px-5 md:px-7 md:pt-5">
          <header className="relative z-20 flex flex-col gap-3 pr-0 md:pr-[330px]">
            <div className="flex flex-wrap items-center gap-2">
              <StatPill icon="📅" label="Day" value={farm.day} />
              <StatPill icon={weather.emoji} label="Weather" value={weather.label} />
              <StatPill icon="🪙" label="Coins" value={farm.coins.toLocaleString()} />
              <StatPill icon="⚡" label="Energy" value={`${farm.energy}/${farm.maxEnergy}`} />
              <StatPill icon="⭐" label="Level" value={farm.level} />
            </div>

            <div className="max-w-xl rounded-[22px] border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🌼</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-stone-800">{farm.familyName}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700/60">
                        {activeLandName || 'Home Garden'} · Spring
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500">♥ {farm.hearts}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold leading-5 text-stone-500">{notice || weather.note}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200/70">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${xpPercent}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-stone-400">{farm.xp}/{xpTarget} XP</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="relative mt-4 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section
              className="relative min-h-[650px] overflow-hidden rounded-[34px] border-[4px] border-white/65 bg-[#8fca70] shadow-[0_30px_90px_rgba(67,112,44,.22)]"
              aria-label="2D family farm world"
            >
              <div className="absolute inset-0 opacity-40" aria-hidden="true" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)',
                backgroundSize: '42px 42px',
              }} />

              <div className="absolute -left-8 -top-12 h-56 w-56 rounded-full bg-[#6fb854] opacity-70" aria-hidden="true" />
              <div className="absolute -right-10 top-14 h-44 w-44 rounded-full border-[14px] border-sky-100/60 bg-sky-300/80 shadow-inner" aria-hidden="true">
                <div className="grid h-full place-items-center text-3xl">🐟</div>
              </div>
              <div className="absolute right-5 top-5 text-4xl drop-shadow" aria-hidden="true">🌳</div>
              <div className="absolute right-24 top-16 text-3xl drop-shadow" aria-hidden="true">🌸</div>
              <div className="absolute left-[31%] top-0 h-[46%] w-20 rotate-[18deg] rounded-b-[42px] bg-[#e5d19b]/70" aria-hidden="true" />

              <div className="absolute left-5 top-5 z-10 w-[42%] min-w-[210px] max-w-[360px] rounded-[26px] border border-white/70 bg-white/72 p-4 shadow-lg backdrop-blur-sm sm:left-8 sm:top-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700/60">Family home</p>
                    <h1 className="mt-1 text-lg font-black text-stone-800">{farm.familyName}</h1>
                    <p className="mt-1 text-xs font-semibold text-stone-500">Home level {farm.homeLevel} · ♥ {farm.hearts}/100</p>
                  </div>
                  <div className="text-5xl drop-shadow-sm" aria-hidden="true">{farm.homeLevel >= 3 ? '🏠' : '🏡'}</div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <FamilyAvatar member={partners.partner1} fallback="🧑" />
                  <FamilyAvatar member={partners.partner2} fallback="💛" />
                </div>
              </div>

              <div className="absolute bottom-[34%] left-4 z-10 hidden rounded-full border border-white/70 bg-white/70 px-3 py-2 text-xs font-black text-emerald-800 shadow md:block">
                🌳 Orchard <span className="ml-1 text-[9px] text-stone-400">coming next</span>
              </div>

              <div className="absolute bottom-4 left-1/2 z-10 w-[calc(100%-24px)] max-w-[760px] -translate-x-1/2 rounded-[28px] border-2 border-[#d3ad78] bg-[#d8b383] p-3 shadow-[0_22px_40px_rgba(77,49,28,.24)] sm:bottom-6 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#70462d]">Vegetable garden</p>
                    <p className="mt-0.5 text-xs font-bold text-white/90">Tap empty soil to plant · tap crops to water · tap ready crops to harvest</p>
                  </div>
                  <div className="shrink-0 rounded-full bg-white/75 px-3 py-1.5 text-[10px] font-black text-stone-600">
                    {plantedCount} growing · {readyCount} ready
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-2.5">
                  {farm.plots.map((plot) => (
                    <PlotTile key={plot.id} plot={plot} onClick={() => handlePlot(plot)} />
                  ))}
                </div>
              </div>
            </section>

            <aside className="relative z-10 rounded-[30px] border border-white/70 bg-[#fffdf7]/88 p-4 shadow-[0_24px_70px_rgba(80,90,55,.16)] backdrop-blur-xl lg:min-h-[650px]">
              <div className="flex rounded-2xl bg-stone-100/80 p-1">
                {([
                  ['market', '🌱', 'Seeds'],
                  ['bag', '🎒', 'Bag'],
                  ['family', '🏡', 'Family'],
                  ['help', '📋', 'Goals'],
                ] as const).map(([mode, icon, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDrawer(mode)}
                    className={`flex-1 rounded-xl px-2 py-2 text-[10px] font-black transition ${drawer === mode ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    <span className="block text-base" aria-hidden="true">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              {drawer === 'market' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Seed market</p>
                      <h2 className="text-lg font-black text-stone-800">Choose what to grow</h2>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">🪙 {farm.coins}</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {CROP_KEYS.map((key) => {
                      const crop = CROP_CATALOG[key];
                      const selected = selectedCrop === key;
                      return (
                        <div key={key} className={`rounded-2xl border p-3 transition ${selected ? 'border-emerald-300 bg-emerald-50' : 'border-stone-100 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedCrop(key)}
                              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl ${selected ? 'bg-emerald-500 shadow-md' : 'bg-stone-50'}`}
                              aria-label={`Select ${crop.name} for planting`}
                            >
                              {crop.emoji}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-black text-stone-800">{crop.name}</p>
                                <span className="text-[10px] font-black text-stone-400">{crop.growDays} days</span>
                              </div>
                              <p className="mt-0.5 text-[10px] font-semibold text-stone-400">Sell {crop.sellPrice} · Yield {crop.yield} · Seeds owned {farm.inventory.seeds[key]}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => applyAction({ type: 'buy_seed', cropKey: key })}
                              className="rounded-full bg-amber-100 px-2.5 py-1.5 text-[10px] font-black text-amber-800 hover:bg-amber-200"
                              aria-label={`Buy one ${crop.name} seed for ${crop.seedCost} coins`}
                            >
                              +1 · {crop.seedCost}🪙
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-2xl bg-emerald-600 p-4 text-white shadow-lg">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100">Selected seed</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{CROP_CATALOG[selectedCrop].emoji}</span>
                        <div>
                          <p className="text-sm font-black">{CROP_CATALOG[selectedCrop].name}</p>
                          <p className="text-[10px] font-semibold text-emerald-100">{farm.inventory.seeds[selectedCrop]} seeds left</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-100">Tap empty soil</span>
                    </div>
                  </div>
                </div>
              )}

              {drawer === 'bag' && (
                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Farm bag</p>
                  <div className="mt-1 flex items-end justify-between">
                    <h2 className="text-lg font-black text-stone-800">Harvest basket</h2>
                    <span className="text-xs font-black text-stone-400">{harvestedProduce} items</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {CROP_KEYS.map((key) => {
                      const crop = CROP_CATALOG[key];
                      const quantity = farm.inventory.produce[key];
                      return (
                        <div key={key} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3">
                          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-2xl">{crop.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-stone-800">{crop.name}</p>
                            <p className="text-[10px] font-semibold text-stone-400">Owned {quantity} · {crop.sellPrice} coins each</p>
                          </div>
                          <button
                            type="button"
                            disabled={quantity === 0}
                            onClick={() => applyAction({ type: 'sell', cropKey: key, quantity: 'all' })}
                            className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Sell all
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-stone-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-stone-400">Sold</p>
                      <p className="mt-1 text-xl font-black text-stone-800">{farm.stats.sold}</p>
                    </div>
                    <div className="rounded-2xl bg-stone-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-stone-400">Earned</p>
                      <p className="mt-1 text-xl font-black text-amber-700">{farm.stats.earned}🪙</p>
                    </div>
                  </div>
                </div>
              )}

              {drawer === 'family' && (
                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">Family life</p>
                  <h2 className="mt-1 text-lg font-black text-stone-800">Build a home together</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-stone-400">This first version keeps family simulation light: shared home, hearts, two household members and upgrades. Children, pets and schedules can come next.</p>

                  <div className="mt-4 space-y-2 rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
                    <FamilyAvatar member={partners.partner1} fallback="🧑" />
                    <FamilyAvatar member={partners.partner2} fallback="💛" />
                  </div>

                  <div className="mt-3 rounded-2xl border border-stone-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-stone-400">Family name</p>
                        <p className="mt-1 text-sm font-black text-stone-800">{farm.familyName}</p>
                      </div>
                      <button type="button" onClick={() => { setFamilyDraft(farm.familyName); setFamilyEditorOpen(true); }} className="rounded-full bg-stone-100 px-3 py-1.5 text-[10px] font-black text-stone-600 hover:bg-stone-200">Rename</button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-amber-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-700/60">Home level {farm.homeLevel}</p>
                        <p className="mt-1 text-sm font-black text-stone-800">{canUpgradeHome ? 'Make the family home nicer' : 'Starter home fully upgraded'}</p>
                        <p className="mt-1 text-[10px] font-semibold leading-4 text-stone-500">Upgrades add family hearts, XP and visually improve the home.</p>
                      </div>
                      <span className="text-4xl">{farm.homeLevel >= 3 ? '🏠' : '🏡'}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!canUpgradeHome}
                      onClick={() => applyAction({ type: 'upgrade_home' })}
                      className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-stone-300"
                    >
                      {canUpgradeHome ? `Upgrade · ${homeCost} coins` : 'Max level for MVP'}
                    </button>
                  </div>
                </div>
              )}

              {drawer === 'help' && (
                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-600">Starter goals</p>
                  <h2 className="mt-1 text-lg font-black text-stone-800">Learn the daily loop</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-stone-400">Complete these once. Rewards are automatic.</p>
                  <div className="mt-4 space-y-2">
                    <GoalRow done={farm.milestones.plantedThree} label="Plant 3 vegetables" progress={`${Math.min(3, farm.stats.planted)}/3`} />
                    <GoalRow done={farm.milestones.wateredThree} label="Water 3 crops" progress={`${Math.min(3, farm.stats.watered)}/3`} />
                    <GoalRow done={farm.milestones.firstHarvest} label="Harvest your first crop" progress={`${Math.min(1, farm.stats.harvested)}/1`} />
                  </div>

                  <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-xs font-semibold leading-5 text-sky-900/70">
                    <p className="font-black text-sky-800">How one day works</p>
                    <p className="mt-1">1. Pick a seed. 2. Tap empty soil. 3. Tap the crop to water it. 4. End the day. 5. When the crop is ready, tap it to harvest and sell from the bag.</p>
                  </div>

                  <div className="mt-3 rounded-2xl bg-violet-50 p-4 text-xs font-semibold leading-5 text-violet-900/70">
                    <p className="font-black text-violet-800">Save behavior</p>
                    <p className="mt-1">The MVP saves automatically in this browser, separated by world and land. A shared server save can replace this storage adapter later without changing the game rules.</p>
                  </div>
                </div>
              )}
            </aside>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-5">
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-[24px] border border-white/80 bg-white/90 p-2.5 shadow-[0_20px_60px_rgba(61,85,45,.28)] backdrop-blur-xl">
              <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-lg">{CROP_CATALOG[selectedCrop].emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-stone-800">Plant {CROP_CATALOG[selectedCrop].name}</p>
                  <p className="text-[9px] font-bold text-stone-400">{farm.inventory.seeds[selectedCrop]} seeds · {weather.note}</p>
                </div>
              </div>

              <button type="button" onClick={() => setDrawer('market')} className="flex min-w-[64px] flex-1 flex-col items-center rounded-2xl px-2 py-2 text-[9px] font-black text-emerald-700 hover:bg-emerald-50 sm:flex-none">
                <span className="text-lg">🌱</span> Seeds
              </button>
              <button type="button" onClick={() => setDrawer('bag')} className="flex min-w-[64px] flex-1 flex-col items-center rounded-2xl px-2 py-2 text-[9px] font-black text-amber-700 hover:bg-amber-50 sm:flex-none">
                <span className="text-lg">🎒</span> Bag
              </button>
              <button type="button" onClick={() => setDrawer('family')} className="flex min-w-[64px] flex-1 flex-col items-center rounded-2xl px-2 py-2 text-[9px] font-black text-rose-700 hover:bg-rose-50 sm:flex-none">
                <span className="text-lg">🏡</span> Family
              </button>
              <button
                type="button"
                onClick={() => applyAction({ type: 'end_day' })}
                className="flex min-w-[84px] flex-1 flex-col items-center rounded-2xl bg-indigo-600 px-3 py-2 text-[9px] font-black text-white shadow-md transition hover:bg-indigo-700 sm:flex-none"
              >
                <span className="text-lg">🌙</span> End day
              </button>
            </div>
          </div>
        </div>
      </div>

      {familyEditorOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-stone-950/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setFamilyEditorOpen(false)}>
          <div className="w-full max-w-sm rounded-[26px] border border-white bg-[#fffdf8] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="family-name-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-2xl">💛</span>
              <div>
                <h2 id="family-name-title" className="text-base font-black text-stone-800">Name your family farm</h2>
                <p className="text-xs font-semibold text-stone-400">Up to 32 characters</p>
              </div>
            </div>
            <input
              autoFocus
              value={familyDraft}
              maxLength={32}
              onChange={(event) => setFamilyDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  applyAction({ type: 'rename_family', name: familyDraft });
                  setFamilyEditorOpen(false);
                }
              }}
              className="mt-5 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-800 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
              placeholder="Our Family Farm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setFamilyEditorOpen(false)} className="rounded-full px-4 py-2 text-xs font-black text-stone-500 hover:bg-stone-100">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  applyAction({ type: 'rename_family', name: familyDraft });
                  setFamilyEditorOpen(false);
                }}
                className="rounded-full bg-rose-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-rose-600"
              >
                Save name
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
