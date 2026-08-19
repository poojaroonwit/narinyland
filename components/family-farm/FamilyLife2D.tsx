"use client";

import * as React from 'react';
import Image from 'next/image';
import {
  BEDTIME_MINUTES,
  CROP_CATALOG,
  CROP_KEYS,
  RECIPE_CATALOG,
  RECIPE_KEYS,
  RESOURCE_CATALOG,
  RESOURCE_KEYS,
  canCookRecipe,
  chickenCost,
  createInitialFamilyFarmState,
  dailyGoalsComplete,
  fishingUnlocked,
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
  type RecipeDefinition,
} from '@/lib/family-farm-game';
import { familyFarmAPI } from '@/services/family-farm-api';

type PartnerView = { name?: string; avatar?: string };
type FamilyLife2DProps = {
  activeCircleId?: string | null;
  activeLandId?: string | null;
  activeLandName?: string;
  circleName?: string;
  partners: { partner1: PartnerView; partner2: PartnerView };
  onToast?: (message: string) => void;
};

type Panel = 'market' | 'bag' | 'coop' | 'activities' | 'goals' | 'family';
type SaveMode = 'loading' | 'server' | 'local';
type Position = { x: number; y: number };
type SpotId = 'home' | 'coop' | 'woods' | 'pond' | 'market' | 'garden' | 'family';
type WorldSpot = { id: SpotId; x: number; y: number; emoji: string; label: string; hint: string };

const WEATHER_META = {
  sunny: { emoji: '☀️', label: 'Sunny', note: 'Water crops before sleeping.' },
  cloudy: { emoji: '☁️', label: 'Cloudy', note: 'A calm day for family chores.' },
  rainy: { emoji: '🌧️', label: 'Rainy', note: 'Rain grows every planted crop tonight.' },
  breezy: { emoji: '🍃', label: 'Breezy', note: 'Perfect weather to explore outdoors.' },
} as const;

const WORLD_SPOTS: WorldSpot[] = [
  { id: 'home', x: 17, y: 22, emoji: '🏡', label: 'Home', hint: 'Cook, rest, and improve your home' },
  { id: 'family', x: 47, y: 22, emoji: '💛', label: 'Family', hint: 'Spend quality time together' },
  { id: 'coop', x: 78, y: 22, emoji: '🐔', label: 'Chicken Coop', hint: 'Feed chickens and collect eggs' },
  { id: 'market', x: 17, y: 60, emoji: '🛒', label: 'Market', hint: 'Buy seeds and sell your harvest' },
  { id: 'garden', x: 48, y: 68, emoji: '🥕', label: 'Garden', hint: 'Plant, water, and harvest crops' },
  { id: 'pond', x: 80, y: 48, emoji: '🎣', label: 'Pond', hint: 'Fish after reaching level 2' },
  { id: 'woods', x: 84, y: 73, emoji: '🌲', label: 'Woods', hint: 'Forage for wild resources' },
];

function isImageAvatar(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('/api/') || value.startsWith('/');
}

function FamilyAvatar({ member, fallback }: { member: PartnerView; fallback: string }) {
  const avatar = member.avatar || fallback;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-white text-lg shadow-sm">
        {isImageAvatar(avatar) ? <Image src={avatar} alt="" fill sizes="40px" className="object-cover" unoptimized /> : <span aria-hidden="true">{avatar}</span>}
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
  const label = !crop ? 'Empty garden plot. Plant selected seed.' : ready ? `${crop.name} ready to harvest.` : `${crop.name}, ${plot.growthDays} of ${crop.growDays} growing days${plot.watered ? ', watered today' : ''}.`;
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={label} className={`group relative aspect-square min-h-[46px] overflow-hidden rounded-[14px] border-2 text-center shadow-[inset_0_-8px_16px_rgba(70,35,20,0.14)] transition active:scale-95 disabled:cursor-wait disabled:opacity-70 ${ready ? 'border-amber-300 bg-amber-100 hover:border-amber-400' : crop ? 'border-[#805036] bg-[#9b6848] hover:border-[#70432e]' : 'border-[#a97858] bg-[#b9825e] hover:border-emerald-300'}`}>
      <span className={`relative z-10 grid h-full place-items-center text-xl sm:text-2xl ${ready ? 'animate-bounce' : ''}`} aria-hidden="true">{cropEmoji(plot)}</span>
      {plot.watered && !ready && <span className="absolute right-1 top-1 rounded-full bg-sky-100 px-1 text-[8px] shadow">💧</span>}
      {crop && <div className="absolute inset-x-1.5 bottom-1 h-1 overflow-hidden rounded-full bg-black/15"><div className={`h-full rounded-full ${ready ? 'bg-amber-300' : 'bg-emerald-300'}`} style={{ width: `${Math.max(8, progress * 100)}%` }} /></div>}
    </button>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md"><span className="text-base">{icon}</span><div className="leading-none"><p className="text-[8px] font-black uppercase tracking-wider text-stone-400">{label}</p><p className="mt-1 text-xs font-black text-stone-800">{value}</p></div></div>;
}

function distance(a: Position, b: Position) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clampPosition(position: Position): Position { return { x: Math.max(5, Math.min(95, position.x)), y: Math.max(8, Math.min(91, position.y)) }; }

function WorldLandmark({ spot, nearby, locked }: { spot: WorldSpot; nearby: boolean; locked?: boolean }) {
  return (
    <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${spot.x}%`, top: `${spot.y}%` }} aria-label={`${spot.label}: ${spot.hint}`}>
      <div className={`relative grid h-16 w-16 place-items-center rounded-[22px] border-2 text-4xl shadow-lg transition sm:h-20 sm:w-20 sm:text-5xl ${nearby ? 'scale-110 border-amber-300 bg-amber-50/95 ring-4 ring-amber-200/50' : 'border-white/70 bg-white/72'} ${locked ? 'grayscale' : ''}`}>
        {spot.emoji}{locked && <span className="absolute -right-1 -top-1 rounded-full bg-stone-800 px-1.5 py-0.5 text-[9px] text-white">🔒</span>}
      </div>
      <div className={`mx-auto mt-1 w-max max-w-[110px] rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider shadow-sm backdrop-blur ${nearby ? 'bg-amber-500 text-white' : 'bg-white/80 text-stone-600'}`}>{spot.label}</div>
    </div>
  );
}

function ingredientLabel(recipe: RecipeDefinition) {
  return recipe.ingredients.map((ingredient) => {
    const item = ingredient.source === 'produce' ? CROP_CATALOG[ingredient.key] : RESOURCE_CATALOG[ingredient.key];
    return `${item.emoji} ${ingredient.quantity}`;
  }).join(' + ');
}

function nextActionLabel(farm: FamilyFarmState) {
  if (farm.energy <= 3 || farm.timeMinutes >= 20 * 60) return '🌙 Head home and sleep';
  if (dailyGoalsComplete(farm) && !farm.daily.rewardClaimed) return '🎁 Claim today’s family reward';
  const goal = getDailyGoals(farm).find((candidate) => !candidate.complete);
  if (!goal) return '✨ Explore and grow your family world';
  if (goal.key === 'tend') return farm.plots.some((plot) => plot.cropKey && !plot.watered && !isPlotReady(plot)) ? '💧 Water a crop' : '🌱 Plant or harvest in the garden';
  if (goal.key === 'outdoor') return fishingUnlocked(farm) ? '🌲 Forage or 🎣 fish once' : '🌲 Forage in the woods';
  if (goal.key === 'animals') return farm.livestock.eggsAvailable > 0 ? '🥚 Collect eggs at the coop' : '🐔 Feed the chickens';
  return '💛 Spend time with your family';
}

export default function FamilyLife2D({ activeCircleId, activeLandId, activeLandName, circleName, partners, onToast }: FamilyLife2DProps) {
  const [farm, setFarm] = React.useState<FamilyFarmState | null>(null);
  const [selectedCrop, setSelectedCrop] = React.useState<CropKey>('carrot');
  const [panel, setPanel] = React.useState<Panel>('goals');
  const [notice, setNotice] = React.useState('');
  const [saveMode, setSaveMode] = React.useState<SaveMode>('loading');
  const [busy, setBusy] = React.useState(false);
  const [familyEditorOpen, setFamilyEditorOpen] = React.useState(false);
  const [familyDraft, setFamilyDraft] = React.useState('');
  const [player, setPlayer] = React.useState<Position>({ x: 48, y: 48 });
  const [facing, setFacing] = React.useState<'up' | 'down' | 'left' | 'right'>('down');
  const [coachOpen, setCoachOpen] = React.useState(false);
  const [daySummaryOpen, setDaySummaryOpen] = React.useState(false);
  const loadedStorageKeyRef = React.useRef<string | null>(null);

  const familyFallbackName = React.useMemo(() => `${(circleName || 'Our Family').trim()} Farm`.slice(0, 32), [circleName]);
  const storageKey = React.useMemo(() => `narinyland:family-farm:v1:${activeCircleId || 'default'}:${activeLandId || 'main'}`, [activeCircleId, activeLandId]);

  React.useEffect(() => {
    let cancelled = false;
    let cached = createInitialFamilyFarmState(familyFallbackName);
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) cached = normalizeFamilyFarmState(JSON.parse(saved), familyFallbackName);
    } catch (error) { console.warn('Could not read cached family farm save.', error); }

    loadedStorageKeyRef.current = storageKey;
    setFarm(cached);
    setFamilyDraft(cached.familyName);
    setNotice(cached.lastMessage);
    setSaveMode(activeLandId ? 'loading' : 'local');
    setPlayer({ x: 48, y: 48 });
    setCoachOpen(cached.day === 1 && cached.stats.planted === 0);
    setDaySummaryOpen(false);

    if (!activeLandId) return () => { cancelled = true; };
    familyFarmAPI.get(activeLandId)
      .then((response) => {
        if (cancelled) return;
        const normalized = normalizeFamilyFarmState(response.state, familyFallbackName);
        setFarm(normalized);
        setFamilyDraft(normalized.familyName);
        setNotice(normalized.lastMessage);
        setSaveMode('server');
        setCoachOpen(normalized.day === 1 && normalized.stats.planted === 0);
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
    try { window.localStorage.setItem(storageKey, JSON.stringify(farm)); } catch (error) { console.warn('Could not cache family farm save.', error); }
  }, [farm, storageKey]);

  const applyAction = React.useCallback(async (action: FarmAction) => {
    if (!farm || busy || saveMode === 'loading') return;
    let optimistic;
    try { optimistic = performFarmAction(farm, action); }
    catch (error) {
      const message = error instanceof Error ? error.message : 'That action could not be completed.';
      setNotice(message); onToast?.(message); return;
    }

    const previous = farm;
    setFarm(optimistic.state);
    setNotice(optimistic.message);
    if (action.type === 'end_day') setDaySummaryOpen(true);
    if (action.type === 'plant') setCoachOpen(false);

    if (saveMode !== 'server' || !activeLandId) { onToast?.(optimistic.message); return; }
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
      try { const latest = await familyFarmAPI.get(activeLandId); setFarm(normalizeFamilyFarmState(latest.state, familyFallbackName)); }
      catch { setFarm(previous); }
      setNotice(`Action not saved: ${message}`);
      onToast?.(`Action not saved: ${message}`);
      if (action.type === 'end_day') setDaySummaryOpen(false);
    } finally { setBusy(false); }
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
    const sorted = WORLD_SPOTS.map((spot) => ({ spot, distance: distance(player, spot) })).sort((a, b) => a.distance - b.distance);
    return sorted[0]?.distance <= 18 ? sorted[0].spot : null;
  }, [player]);

  const handlePlot = (plot: FarmPlot) => {
    const garden = WORLD_SPOTS.find((spot) => spot.id === 'garden');
    if (garden && distance(player, garden) > 31) { setNotice('Walk closer to the vegetable garden before tending a plot.'); return; }
    if (!plot.cropKey) { void applyAction({ type: 'plant', plotId: plot.id, cropKey: selectedCrop }); return; }
    if (isPlotReady(plot)) { void applyAction({ type: 'harvest', plotId: plot.id }); return; }
    if (!plot.watered) { void applyAction({ type: 'water', plotId: plot.id }); return; }
    setNotice(`${CROP_CATALOG[plot.cropKey].name} is watered. It will grow after you sleep.`);
  };

  const interact = React.useCallback(() => {
    if (!farm || !nearestSpot) { setNotice('Walk closer to a place and press Interact.'); return; }
    switch (nearestSpot.id) {
      case 'home':
        if (farm.timeMinutes >= 18 * 60 || farm.energy <= 3) void applyAction({ type: 'end_day' });
        else { setPanel('activities'); setNotice('Welcome home. Cook a meal, check family life, or sleep when evening comes.'); }
        break;
      case 'family': void applyAction({ type: 'family_time' }); break;
      case 'coop':
        setPanel('coop');
        if (farm.livestock.eggsAvailable > 0) void applyAction({ type: 'collect_eggs' });
        else if (!farm.livestock.fedToday) void applyAction({ type: 'feed_chickens' });
        else setNotice('The chickens are happy and fed. Eggs will be ready after you sleep.');
        break;
      case 'woods': void applyAction({ type: 'forage' }); break;
      case 'pond':
        setPanel('activities');
        if (fishingUnlocked(farm)) void applyAction({ type: 'fish' });
        else setNotice('Fishing unlocks at level 2. Keep tending the farm to gain XP.');
        break;
      case 'market': setPanel('market'); setNotice('The family market is open. Buy seeds or sell items from your bag.'); break;
      case 'garden': setPanel('market'); setNotice(`Selected ${CROP_CATALOG[selectedCrop].name}. Tap an empty plot to plant it.`); break;
    }
  }, [applyAction, farm, nearestSpot, selectedCrop]);

  React.useEffect(() => {
    const handleInteractKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e') return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      event.preventDefault(); interact();
    };
    window.addEventListener('keydown', handleInteractKey);
    return () => window.removeEventListener('keydown', handleInteractKey);
  }, [interact]);

  if (!farm) return <div className="grid min-h-dvh place-items-center bg-[#dff4ca] px-6"><div className="rounded-[28px] border border-white/80 bg-white/85 px-8 py-7 text-center shadow-xl"><div className="text-4xl">🌱</div><p className="mt-3 text-sm font-black text-stone-700">Opening the family world…</p></div></div>;

  const weather = WEATHER_META[farm.weather];
  const xpTarget = xpToNextLevel(farm.level);
  const xpPercent = Math.min(100, Math.round((farm.xp / xpTarget) * 100));
  const actionDisabled = busy || saveMode === 'loading';
  const selected = CROP_CATALOG[selectedCrop];
  const goals = getDailyGoals(farm);
  const goalsDone = dailyGoalsComplete(farm);
  const completedGoals = goals.filter((goal) => goal.complete).length;
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
  const suggestedAction = nextActionLabel(farm);
  const summary = farm.lastDaySummary;

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#dff4ca] text-stone-800">
      <div className="min-h-dvh" style={{ backgroundImage: 'linear-gradient(180deg, #dff5d0 0%, #c8ebaf 48%, #9dd27e 100%)' }}>
        <div className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col px-3 pb-36 pt-20 sm:px-5 md:px-7 md:pt-5">
          <header className="relative z-30 flex flex-col gap-3 pr-0 md:pr-[360px]">
            <div className="flex flex-wrap items-center gap-2">
              <Stat icon="📅" label="Day" value={farm.day} /><Stat icon="🕒" label="Time" value={formatFarmTime(farm.timeMinutes)} /><Stat icon={weather.emoji} label="Weather" value={weather.label} /><Stat icon="🪙" label="Coins" value={farm.coins.toLocaleString()} /><Stat icon="⚡" label="Energy" value={`${farm.energy}/${farm.maxEnergy}`} /><Stat icon="⭐" label="Level" value={farm.level} />
              <div className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wider shadow-sm ${saveMode === 'server' ? 'border-emerald-100 bg-emerald-50/90 text-emerald-700' : saveMode === 'local' ? 'border-amber-100 bg-amber-50/90 text-amber-700' : 'border-white/70 bg-white/80 text-stone-400'}`}>{busy ? 'Saving…' : saveMode === 'server' ? '☁ Shared' : saveMode === 'local' ? '💾 Device' : 'Syncing…'}</div>
            </div>

            <div className="max-w-3xl rounded-[22px] border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🌼</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{farm.familyName}</p><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700/60">{activeLandName || 'Home Garden'} · Spring · {nearestSpot ? `Near ${nearestSpot.label}` : 'Exploring'}</p></div><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500">♥ {farm.hearts}</span></div>
                  <p className="mt-1.5 text-xs font-semibold leading-5 text-stone-500">{notice || weather.note}</p>
                  <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200/70"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${xpPercent}%` }} /></div><span className="text-[9px] font-black text-stone-400">{farm.xp}/{xpTarget} XP</span></div>
                  <button type="button" onClick={() => setPanel('goals')} className="mt-2 flex w-full items-center justify-between rounded-xl bg-violet-50 px-3 py-2 text-left"><span className="text-[10px] font-black text-violet-700">NEXT · {suggestedAction}</span><span className="text-[9px] font-black text-violet-400">{completedGoals}/4 today →</span></button>
                </div>
              </div>
            </div>
          </header>

          <div className="relative mt-4 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
            <section className="relative min-h-[720px] overflow-hidden rounded-[34px] border-[4px] border-white/65 bg-[#8fca70] shadow-[0_30px_90px_rgba(67,112,44,.22)]" aria-label="Interactive 2D family world">
              <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              <div className="absolute left-[34%] top-0 h-full w-[13%] rotate-[5deg] bg-[#e4ce94]/55" />
              <div className="absolute bottom-0 left-0 h-[22%] w-full bg-[#75ba5e]/45" />
              <div className="absolute right-[70px] top-[39%] h-32 w-32 rounded-full border-[10px] border-sky-100/60 bg-sky-300/75 shadow-inner"><div className="grid h-full place-items-center text-3xl">🐟</div></div>

              {WORLD_SPOTS.map((spot) => <WorldLandmark key={spot.id} spot={spot} nearby={nearestSpot?.id === spot.id} locked={spot.id === 'pond' && !fishingUnlocked(farm)} />)}

              {coachOpen && (
                <div className="absolute left-4 top-4 z-50 w-[min(310px,calc(100%-32px))] rounded-[22px] border border-white/80 bg-white/95 p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">First day</p><h2 className="mt-1 text-base font-black">Start small 🌱</h2></div><button type="button" onClick={() => setCoachOpen(false)} className="grid h-7 w-7 place-items-center rounded-full bg-stone-100 text-xs">×</button></div>
                  <div className="mt-3 space-y-2 text-[10px] font-semibold text-stone-600"><p>1. Move with WASD / arrows or the D-pad.</p><p>2. Walk near the garden and plant + water a few crops.</p><p>3. Visit the coop, woods, and family to finish today’s achievable goals.</p></div>
                  <button type="button" onClick={() => { setPanel('goals'); setCoachOpen(false); }} className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white">Show today’s goals</button>
                </div>
              )}

              <div className="absolute bottom-[4%] left-[35%] z-20 w-[44%] min-w-[250px] max-w-[540px] rounded-[22px] border-2 border-[#d2aa72] bg-[#d8b383]/95 p-2.5 shadow-xl sm:p-3">
                <div className="mb-2 flex items-center justify-between px-1"><div><p className="text-[8px] font-black uppercase tracking-widest text-[#70462d]">Vegetable garden</p><p className="text-[9px] font-bold text-white/90">{selected.emoji} {selected.name} selected</p></div><span className="rounded-full bg-white/70 px-2 py-1 text-[8px] font-black text-stone-600">{plantedCount} growing · {readyCount} ready</span></div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">{farm.plots.map((plot) => <PlotTile key={plot.id} plot={plot} disabled={actionDisabled} onClick={() => handlePlot(plot)} />)}</div>
              </div>

              <div className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-all duration-150" style={{ left: `${player.x}%`, top: `${player.y}%` }}><div className={`relative grid h-12 w-12 place-items-center rounded-full border-[3px] border-white bg-amber-100 text-3xl shadow-xl ${nearestSpot ? 'ring-4 ring-amber-200/60' : ''}`}><span className={facing === 'left' ? '-scale-x-100' : ''}>🧑‍🌾</span><span className="absolute -bottom-3 rounded-full bg-stone-800/75 px-1.5 py-0.5 text-[7px] font-black uppercase text-white">You</span></div></div>
              {nearestSpot && <button type="button" disabled={actionDisabled} onClick={interact} className="absolute left-1/2 top-[45%] z-50 -translate-x-1/2 rounded-full border-2 border-white bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-xl disabled:opacity-50">E · Interact with {nearestSpot.label}</button>}
              <div className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-700 ${isEvening ? 'bg-indigo-950/20' : 'bg-transparent'}`} style={{ opacity: isEvening ? Math.min(0.52, 0.18 + dayProgress * 0.35) : 0 }} />
              {isLate && <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-indigo-950/75 px-4 py-2 text-[10px] font-black text-white">🌙 It is getting late. Head home soon.</div>}
            </section>

            <aside className="relative z-20 rounded-[30px] border border-white/70 bg-[#fffdf7]/92 p-4 shadow-xl backdrop-blur-xl lg:min-h-[720px]">
              <div className="grid grid-cols-6 rounded-2xl bg-stone-100/80 p-1">
                {([['market','🌱','Market'],['bag','🎒','Bag'],['coop','🐔','Coop'],['activities','🎣','Life'],['goals','📋','Goals'],['family','💛','Family']] as const).map(([key,icon,label]) => <button key={key} type="button" onClick={() => setPanel(key)} className={`rounded-xl px-1 py-2 text-[7px] font-black transition ${panel === key ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400'}`}><span className="block text-base">{icon}</span>{label}</button>)}
              </div>

              {panel === 'market' && <div className="mt-4"><div className="flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Seed market</p><h2 className="text-lg font-black">Choose a crop</h2></div><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">🪙 {farm.coins}</span></div><div className="mt-3 space-y-2">{CROP_KEYS.map((key) => { const crop=CROP_CATALOG[key]; const active=selectedCrop===key; return <div key={key} className={`rounded-2xl border p-3 ${active?'border-emerald-300 bg-emerald-50':'border-stone-100 bg-white'}`}><div className="flex items-center gap-2"><button type="button" onClick={() => setSelectedCrop(key)} className={`grid h-10 w-10 place-items-center rounded-xl text-2xl ${active?'bg-emerald-500':'bg-stone-50'}`}>{crop.emoji}</button><div className="min-w-0 flex-1"><p className="text-sm font-black">{crop.name}</p><p className="text-[9px] font-semibold text-stone-400">{crop.growDays}d · sell {crop.sellPrice} · own {farm.inventory.seeds[key]}</p></div><button type="button" disabled={actionDisabled} onClick={() => void applyAction({type:'buy_seed',cropKey:key})} className="rounded-full bg-amber-100 px-2 py-1.5 text-[9px] font-black text-amber-800 disabled:opacity-40">+1 · {crop.seedCost}🪙</button></div></div>; })}</div></div>}

              {panel === 'bag' && <div className="mt-4"><p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Inventory</p><div className="flex items-end justify-between"><h2 className="text-lg font-black">Family bag</h2><span className="text-xs font-black text-stone-400">{produceCount+resourceCount} items</span></div><div className="mt-3 max-h-[570px] space-y-2 overflow-y-auto pr-1">{CROP_KEYS.map((key)=>{const crop=CROP_CATALOG[key];const quantity=farm.inventory.produce[key];return <div key={key} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3"><span className="text-2xl">{crop.emoji}</span><div className="flex-1"><p className="text-xs font-black">{crop.name}</p><p className="text-[9px] text-stone-400">{quantity} · {crop.sellPrice}🪙 each</p></div><button type="button" disabled={!quantity||actionDisabled} onClick={()=>void applyAction({type:'sell',cropKey:key,quantity:'all'})} className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black text-emerald-800 disabled:opacity-35">Sell</button></div>})}<div className="my-2 border-t border-stone-100"/>{RESOURCE_KEYS.map((key)=>{const item=RESOURCE_CATALOG[key];const quantity=farm.inventory.resources[key];return <div key={key} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3"><span className="text-2xl">{item.emoji}</span><div className="flex-1"><p className="text-xs font-black">{item.name}</p><p className="text-[9px] text-stone-400">{quantity} · {item.sellPrice}🪙 each</p></div><button type="button" disabled={!quantity||actionDisabled} onClick={()=>void applyAction({type:'sell_resource',resourceKey:key,quantity:'all'})} className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black text-emerald-800 disabled:opacity-35">Sell</button></div>})}</div></div>}

              {panel === 'coop' && <div className="mt-4"><p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Chicken coop</p><h2 className="text-lg font-black">Your flock</h2><div className="mt-3 rounded-[24px] bg-amber-50 p-4 text-center"><div className="text-5xl">🐔🐥</div><p className="mt-2 text-2xl font-black text-amber-800">{farm.livestock.chickens} chickens</p><p className="text-xs font-bold text-amber-600/70">Capacity {farm.livestock.chickens}/{maxChickens} · {farm.livestock.fedToday?'Fed today ✓':'Hungry today'}</p></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={actionDisabled||farm.livestock.fedToday} onClick={()=>void applyAction({type:'feed_chickens'})} className="rounded-2xl bg-emerald-600 px-3 py-3 text-xs font-black text-white disabled:opacity-35">🌾 Feed<br/><span className="text-[9px]">1 energy · 15m</span></button><button type="button" disabled={actionDisabled||farm.livestock.eggsAvailable===0} onClick={()=>void applyAction({type:'collect_eggs'})} className="rounded-2xl bg-amber-500 px-3 py-3 text-xs font-black text-white disabled:opacity-35">🥚 Collect {farm.livestock.eggsAvailable}<br/><span className="text-[9px]">10m</span></button></div><button type="button" disabled={actionDisabled||farm.livestock.chickens>=maxChickens||farm.coins<chickenPrice} onClick={()=>void applyAction({type:'buy_chicken'})} className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-3 py-3 text-xs font-black text-amber-800 disabled:opacity-35">🐥 Adopt chicken · {chickenPrice} coins</button></div>}

              {panel === 'activities' && <div className="mt-4"><p className="text-[9px] font-black uppercase tracking-widest text-sky-600">Life skills</p><h2 className="text-lg font-black">Fishing & cooking</h2><div className={`mt-3 rounded-[22px] border p-4 ${fishingUnlocked(farm)?'border-sky-100 bg-sky-50':'border-stone-100 bg-stone-50'}`}><div className="flex items-center justify-between"><div><p className="text-sm font-black">🎣 Pond fishing</p><p className="text-[9px] font-semibold text-stone-500">2 energy · 30m · {farm.daily.fishingCharges} casts left</p></div><span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-sky-700">{fishingUnlocked(farm)?'Unlocked':'Level 2 🔒'}</span></div><p className="mt-2 text-[10px] leading-5 text-stone-500">Rain and evening fishing can produce a bigger catch. Fish sell for {RESOURCE_CATALOG.fish.sellPrice} coins or become family stew.</p><button type="button" disabled={actionDisabled||!fishingUnlocked(farm)||farm.daily.fishingCharges===0} onClick={()=>void applyAction({type:'fish'})} className="mt-3 w-full rounded-xl bg-sky-600 px-3 py-2.5 text-[10px] font-black text-white disabled:opacity-35">🎣 Cast a line</button></div><div className="mt-4"><p className="text-[9px] font-black uppercase tracking-widest text-orange-600">Home kitchen</p><div className="mt-2 space-y-2">{RECIPE_KEYS.map((key)=>{const recipe=RECIPE_CATALOG[key];const available=canCookRecipe(farm,key);const locked=farm.homeLevel<recipe.minHomeLevel;return <div key={key} className="rounded-2xl border border-stone-100 bg-white p-3"><div className="flex items-center gap-3"><span className="text-2xl">{recipe.emoji}</span><div className="min-w-0 flex-1"><p className="text-xs font-black">{recipe.name}</p><p className="text-[9px] text-stone-400">{ingredientLabel(recipe)} · +{recipe.energy}⚡ +{recipe.hearts}♥</p></div><button type="button" disabled={actionDisabled||!available} onClick={()=>void applyAction({type:'cook',recipeKey:key})} className="rounded-full bg-orange-100 px-3 py-1.5 text-[9px] font-black text-orange-800 disabled:opacity-35">{locked?`Home ${recipe.minHomeLevel} 🔒`:'Cook'}</button></div></div>})}</div></div></div>}

              {panel === 'goals' && <div className="mt-4"><div className="flex items-end justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-violet-600">Daily family goals</p><h2 className="text-lg font-black">A day you can finish</h2></div><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">🔥 {farm.dailyStreak} streak</span></div><p className="mt-2 rounded-xl bg-violet-50 p-2.5 text-[9px] font-semibold leading-4 text-violet-700">Goals adapt to unlocked systems and avoid requiring crops that cannot be ready yet.</p><div className="mt-3 space-y-2">{goals.map((goal)=><div key={goal.key} className={`flex items-center gap-3 rounded-2xl border p-3 ${goal.complete?'border-emerald-100 bg-emerald-50':'border-stone-100 bg-white'}`}><span className="text-xl">{goal.emoji}</span><div className="flex-1"><p className={`text-xs font-black ${goal.complete?'text-emerald-700':'text-stone-700'}`}>{goal.label}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${Math.min(100,(goal.progress/goal.target)*100)}%`}}/></div></div><span className="text-[9px] font-black text-stone-400">{goal.progress}/{goal.target}</span></div>)}</div><button type="button" disabled={actionDisabled||!goalsDone||farm.daily.rewardClaimed} onClick={()=>void applyAction({type:'claim_daily_reward'})} className="mt-3 w-full rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white disabled:opacity-35">{farm.daily.rewardClaimed?'✓ Reward claimed':goalsDone?'🎁 Claim family reward':`${completedGoals}/4 goals complete`}</button></div>}

              {panel === 'family' && <div className="mt-4"><p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Family life</p><h2 className="text-lg font-black">Home & relationships</h2><div className="mt-3 space-y-2 rounded-[24px] bg-rose-50/70 p-4"><FamilyAvatar member={partners.partner1} fallback="🧑"/><FamilyAvatar member={partners.partner2} fallback="💛"/><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-rose-400" style={{width:`${farm.hearts}%`}}/></div><p className="text-center text-[10px] font-black text-rose-600">♥ {farm.hearts}/100 family hearts</p></div><button type="button" disabled={actionDisabled||farm.daily.familyTime} onClick={()=>void applyAction({type:'family_time'})} className="mt-3 w-full rounded-2xl bg-rose-500 px-4 py-3 text-xs font-black text-white disabled:opacity-35">💛 Spend family time · 45m</button><div className="mt-3 rounded-2xl border border-stone-100 bg-white p-3"><div className="flex items-center justify-between"><div><p className="text-xs font-black">🏡 Home level {farm.homeLevel}</p><p className="text-[9px] text-stone-400">Coop {maxChickens} · unlocks better recipes</p></div><button type="button" disabled={actionDisabled||farm.homeLevel>=4||farm.coins<homeCost} onClick={()=>void applyAction({type:'upgrade_home'})} className="rounded-full bg-amber-100 px-3 py-1.5 text-[9px] font-black text-amber-800 disabled:opacity-35">Upgrade · {homeCost}🪙</button></div></div><button type="button" onClick={()=>setFamilyEditorOpen(true)} className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs font-black text-stone-600">✏️ Rename family farm</button><button type="button" disabled={actionDisabled} onClick={()=>void applyAction({type:'end_day'})} className="mt-2 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40">🌙 Sleep until tomorrow</button></div>}
            </aside>
          </div>
        </div>
      </div>

      <div className="fixed bottom-3 left-1/2 z-[75] w-[calc(100%-20px)] max-w-4xl -translate-x-1/2 sm:bottom-5"><div className="flex items-center justify-between gap-2 rounded-[26px] border border-white/80 bg-white/94 p-2.5 shadow-xl backdrop-blur-xl"><div className="grid grid-cols-3 gap-1 sm:w-36"><span/><button type="button" onClick={()=>movePlayer(0,-3,'up')} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-xs font-black">▲</button><span/><button type="button" onClick={()=>movePlayer(-3,0,'left')} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-xs font-black">◀</button><button type="button" onClick={()=>movePlayer(0,3,'down')} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-xs font-black">▼</button><button type="button" onClick={()=>movePlayer(3,0,'right')} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-xs font-black">▶</button></div><div className="hidden min-w-0 flex-1 px-3 text-center sm:block"><p className="text-xs font-black text-stone-700">WASD / arrows to walk · E to interact</p><p className="mt-0.5 truncate text-[9px] font-semibold text-stone-400">{nearestSpot?`${nearestSpot.emoji} ${nearestSpot.hint}`:suggestedAction}</p></div><button type="button" disabled={actionDisabled||!nearestSpot} onClick={interact} className="min-w-[120px] rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-white disabled:bg-stone-200 disabled:text-stone-400">{nearestSpot?`${nearestSpot.emoji} Interact`:'Walk closer'}</button><button type="button" onClick={()=>setPanel('goals')} className="hidden rounded-2xl bg-violet-100 px-4 py-3 text-xs font-black text-violet-700 md:block">📋 {completedGoals}/4</button></div></div>

      {familyEditorOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-stone-950/35 p-4 backdrop-blur-sm" onMouseDown={()=>setFamilyEditorOpen(false)}><div className="w-full max-w-sm rounded-[26px] border border-white bg-[#fffdf8] p-5 shadow-2xl" role="dialog" aria-modal="true" onMouseDown={(event)=>event.stopPropagation()}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-2xl">💛</span><div><h2 className="text-base font-black">Name your family farm</h2><p className="text-xs font-semibold text-stone-400">Up to 32 characters</p></div></div><input autoFocus value={familyDraft} maxLength={32} onChange={(event)=>setFamilyDraft(event.target.value)} className="mt-5 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold outline-none"/><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setFamilyEditorOpen(false)} className="rounded-full px-4 py-2 text-xs font-black text-stone-500">Cancel</button><button type="button" disabled={actionDisabled} onClick={()=>{void applyAction({type:'rename_family',name:familyDraft});setFamilyEditorOpen(false)}} className="rounded-full bg-rose-500 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Save name</button></div></div></div>}

      {daySummaryOpen && summary && <div className="fixed inset-0 z-[95] grid place-items-center bg-indigo-950/45 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[30px] border border-white/80 bg-[#fffdf8] p-6 shadow-2xl"><div className="text-center"><div className="text-5xl">🌅</div><p className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Day {summary.completedDay} complete</p><h2 className="mt-1 text-2xl font-black">Good morning, family</h2><p className="mt-1 text-xs font-semibold text-stone-400">Tomorrow is {WEATHER_META[summary.tomorrowWeather].emoji} {WEATHER_META[summary.tomorrowWeather].label}</p></div><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-emerald-50 p-3 text-center"><p className="text-xl">🌱 {summary.cropsGrown}</p><p className="text-[9px] font-black text-emerald-700">Crops grew</p></div><div className="rounded-2xl bg-amber-50 p-3 text-center"><p className="text-xl">🥚 {summary.eggsProduced}</p><p className="text-[9px] font-black text-amber-700">Eggs produced</p></div><div className={`rounded-2xl p-3 text-center ${summary.goalsCompleted?'bg-violet-50':'bg-stone-50'}`}><p className="text-xl">{summary.goalsCompleted?'🎁':'📋'}</p><p className="text-[9px] font-black text-stone-700">{summary.goalsCompleted?'Daily goals done':'Goals incomplete'}</p></div><div className="rounded-2xl bg-rose-50 p-3 text-center"><p className="text-xl">🔥 {summary.streakAfter}</p><p className="text-[9px] font-black text-rose-700">Day streak</p></div></div><div className="mt-4 flex justify-center gap-4 text-xs font-black text-stone-600"><span>🪙 {summary.coinsAfter}</span><span>♥ {summary.heartsAfter}/100</span></div><button type="button" onClick={()=>setDaySummaryOpen(false)} className="mt-5 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white">Start day {farm.day}</button></div></div>}
    </main>
  );
}
