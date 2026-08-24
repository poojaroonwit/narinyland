"use client";

import React from 'react';
import {
  formatFarmTime,
  getHomesteadJourney,
  getNextLevelUnlock,
  getProgressionDailyGoals,
  getSeasonPresentation,
  xpToNextLevel,
} from '@/lib/family-farm-progression';
import type { HomesteadLifeAction, HomesteadLifeState } from '@/lib/homestead-life-engine';
import { getHomesteadEventDefinition } from '@/lib/homestead-events';
import { getWeatherPresentation } from '@/lib/hex-world/living-homestead';

export type HexHudPanel = 'wallet' | 'goals' | 'journey' | null;

export function HexLivingHUD({
  state,
  points,
  loading,
  error,
  busy,
  musicMuted,
  onToggleMusic,
  onAction,
  onRetry,
  panel,
  onPanelChange,
}: {
  state: HomesteadLifeState | null;
  points: number;
  loading: boolean;
  error: string | null;
  busy: boolean;
  musicMuted: boolean;
  onToggleMusic: () => void;
  onAction: (action: HomesteadLifeAction) => Promise<boolean>;
  onRetry: () => void;
  panel?: HexHudPanel;
  onPanelChange?: (panel: HexHudPanel) => void;
}) {
  const [localPanel, setLocalPanel] = React.useState<HexHudPanel>(null);
  const [dismissedSeasonDay, setDismissedSeasonDay] = React.useState<number | null>(null);
  const activePanel = panel === undefined ? localPanel : panel;
  const setPanel = (next: HexHudPanel) => {
    if (onPanelChange) onPanelChange(next);
    else setLocalPanel(next);
  };
  const togglePanel = (next: Exclude<HexHudPanel, null>) => setPanel(activePanel === next ? null : next);

  if (!state) {
    return (
      <div className="pointer-events-auto fixed left-1/2 top-4 z-[95] flex -translate-x-1/2 items-center gap-2">
        <div className="rounded-full border border-white/70 bg-white/86 px-4 py-2 text-xs font-bold text-stone-600 shadow-xl backdrop-blur-xl">
          {loading ? 'Waking the homestead…' : (
            <button type="button" onClick={onRetry} className="min-h-[36px] font-black text-rose-600">
              {error ? 'Life sync unavailable · Retry' : 'Load homestead life'}
            </button>
          )}
        </div>
        <MusicButton musicMuted={musicMuted} onToggle={onToggleMusic} />
      </div>
    );
  }

  const weather = getWeatherPresentation(state.weather);
  const season = getSeasonPresentation(state.season);
  const goals = getProgressionDailyGoals(state);
  const journey = getHomesteadJourney(state);
  const completedGoals = goals.filter((goal) => goal.complete).length;
  const completedJourney = journey.filter((entry) => entry.complete).length;
  const nextXp = xpToNextLevel(state.level);
  const nextUnlock = getNextLevelUnlock(state.level);
  const rewardReady = completedGoals === goals.length && !state.daily.rewardClaimed;
  const seasonSummary = state.lastDaySummary?.completedSeason ? state.lastDaySummary : null;
  const showSeasonSummary = !!seasonSummary && dismissedSeasonDay !== seasonSummary.completedDay;
  const currentEvent = state.events.current;
  const currentEventDefinition = currentEvent && !currentEvent.resolved
    ? getHomesteadEventDefinition(currentEvent.key)
    : null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[95] flex items-start justify-between gap-2 md:inset-x-5 md:top-4">
        <div className="pointer-events-auto flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/70 bg-white/82 px-3 py-2 shadow-lg shadow-emerald-950/[0.06] backdrop-blur-xl">
          <span className="text-lg leading-none">{season.emoji}</span>
          <div className="leading-tight">
            <p className="text-[11px] font-black text-stone-800">Day {state.day} · {season.label}</p>
            <p className="text-[9px] font-bold text-stone-500">{weather.emoji} {weather.label} · {formatFarmTime(state.timeMinutes)}</p>
          </div>
        </div>

        <div className="pointer-events-auto flex max-w-[68vw] items-center justify-end gap-1.5 overflow-x-auto rounded-2xl border border-white/70 bg-white/82 p-1.5 shadow-lg shadow-emerald-950/[0.06] backdrop-blur-xl md:max-w-none">
          <StatusChip copy={`⚡ ${state.energy}/${state.maxEnergy}`} label="Energy" />
          <StatusChip copy={`🪙 ${state.coins}`} label="Coins" />
          <button type="button" onClick={() => togglePanel('journey')} className="min-h-[40px] shrink-0 rounded-xl bg-sky-50 px-2.5 text-[9px] font-black text-sky-800" aria-label="Open level progress">
            Lv {state.level} · {state.xp}/{nextXp}
          </button>
          <button type="button" onClick={() => togglePanel('wallet')} className={`min-h-[40px] shrink-0 rounded-xl px-2.5 text-[9px] font-black ${activePanel === 'wallet' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-800'}`}>
            Wallet
          </button>
          <button type="button" onClick={() => togglePanel('goals')} className={`min-h-[40px] shrink-0 rounded-xl px-2.5 text-[9px] font-black ${activePanel === 'goals' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>
            Goals {completedGoals}/{goals.length}
          </button>
          <MusicButton musicMuted={musicMuted} onToggle={onToggleMusic} />
        </div>
      </div>

      {activePanel && (
        <div className="pointer-events-auto fixed right-3 top-[4.75rem] z-[96] max-h-[52vh] w-[min(92vw,390px)] overflow-y-auto rounded-[1.4rem] border border-white/80 bg-[#fffdf7]/96 p-3.5 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-xl md:right-5 md:top-[5.25rem]">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                {activePanel === 'wallet' ? 'Family Wallet' : activePanel === 'goals' ? 'Today' : 'Progress'}
              </p>
              <p className="text-sm font-black text-stone-850">
                {activePanel === 'wallet' ? 'What you share' : activePanel === 'goals' ? 'Daily Goals' : 'Homestead Journey'}
              </p>
            </div>
            <button type="button" onClick={() => setPanel(null)} aria-label="Close HUD panel" className="h-10 w-10 rounded-full bg-stone-100 text-stone-500">×</button>
          </div>

          {activePanel === 'wallet' && (
            <div className="grid grid-cols-2 gap-2">
              <MetricCard emoji="💗" label="Hearts" value={state.hearts.toLocaleString()} />
              <MetricCard emoji="✨" label="Points" value={points.toLocaleString()} />
              <div className="col-span-2 rounded-2xl bg-white/80 px-3 py-2 text-[9px] font-bold text-stone-500">
                Coins are for homestead life. Shared Points grow the floating land.
              </div>
            </div>
          )}

          {activePanel === 'goals' && (
            <div className="grid gap-1.5">
              {goals.map((goal) => (
                <div key={goal.key} className="flex min-h-[42px] items-center gap-2 rounded-xl bg-white/80 px-3 py-2">
                  <span>{goal.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-black text-stone-700">{goal.label}</p>
                    <p className="text-[9px] font-bold text-stone-400">{goal.progress}/{goal.target}</p>
                  </div>
                  <span className={`text-[10px] font-black ${goal.complete ? 'text-emerald-600' : 'text-stone-300'}`}>{goal.complete ? '✓' : '○'}</span>
                </div>
              ))}
              <button type="button" disabled={!rewardReady || busy} onClick={() => void onAction({ type: 'claim_daily_reward' })} className="min-h-[44px] rounded-xl bg-emerald-700 px-3 text-[10px] font-black text-white shadow-md disabled:bg-stone-300">
                {state.daily.rewardClaimed ? 'Daily reward claimed' : rewardReady ? 'Claim daily family reward' : 'Complete all Goals for reward'}
              </button>
            </div>
          )}

          {activePanel === 'journey' && (
            <div>
              <div className="mb-2 flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2">
                <div><p className="text-[9px] font-black text-sky-800">Level {state.level}</p><p className="text-[8px] font-bold text-sky-500">{state.xp}/{nextXp} XP</p></div>
                <p className="text-right text-[8px] font-black text-stone-500">Next unlock · Lv {nextUnlock.level}<br />{nextUnlock.label}</p>
              </div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">Homestead Journey · {completedJourney}/{journey.length}</p>
              <div className="grid gap-1.5">
                {journey.map((entry) => (
                  <div key={entry.key} className="flex min-h-[46px] items-center gap-2 rounded-xl bg-white/80 px-3 py-2">
                    <span className="text-base">{entry.emoji}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black text-stone-700">{entry.label}</p><p className="truncate text-[8px] font-bold text-stone-400">{entry.progress}/{entry.target} · {entry.rewardLabel}</p></div>
                    <span className={entry.complete ? 'text-emerald-600' : 'text-stone-300'}>{entry.complete ? '✓' : '○'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {currentEvent && currentEventDefinition && (
        <div className="pointer-events-auto fixed left-1/2 top-[5.1rem] z-[94] w-[min(90vw,440px)] -translate-x-1/2 rounded-[1.3rem] border border-white/80 bg-[#fffdf7]/95 p-3 shadow-xl shadow-pink-950/[0.06] backdrop-blur-xl md:top-[5.5rem]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl">{currentEvent.key === 'growing_together' ? '💗' : currentEvent.kind === 'seasonal' ? season.emoji : '✨'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-pink-600">{currentEvent.key === 'growing_together' ? 'Growing Together' : currentEvent.kind === 'seasonal' ? 'Seasonal moment' : 'Homestead moment'}</p>
              <p className="mt-0.5 text-sm font-black text-stone-800">{currentEventDefinition.title}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {currentEventDefinition.choices.map((choice) => <button key={choice.key} type="button" disabled={busy} onClick={() => void onAction({ type: 'resolve_event', choiceKey: choice.key })} className="min-h-[40px] rounded-xl bg-pink-500 px-3 text-[9px] font-black text-white shadow-sm disabled:bg-stone-300">{choice.label}</button>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSeasonSummary && seasonSummary && (
        <div className="pointer-events-auto fixed left-1/2 top-[5.1rem] z-[94] w-[min(90vw,420px)] -translate-x-1/2 rounded-[1.3rem] border border-white/80 bg-[#fffdf7]/96 p-3 shadow-xl backdrop-blur-xl md:top-[5.5rem]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-600">Season complete</p><p className="mt-0.5 text-sm font-black text-stone-800">{getSeasonPresentation(seasonSummary.completedSeason!).emoji} {getSeasonPresentation(seasonSummary.completedSeason!).label} together</p><p className="mt-1 text-[9px] font-bold text-stone-500">+{seasonSummary.seasonRewardCoins ?? 0} coins · +{seasonSummary.seasonRewardHearts ?? 0} Hearts</p></div>
            <button type="button" onClick={() => setDismissedSeasonDay(seasonSummary.completedDay)} className="min-h-[40px] rounded-full bg-stone-100 px-3 text-[9px] font-black text-stone-500">Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

function StatusChip({ copy, label }: { copy: string; label: string }) {
  return <span title={label} className="flex min-h-[40px] shrink-0 items-center rounded-xl bg-white/70 px-2.5 text-[9px] font-black text-stone-700">{copy}</span>;
}

function MetricCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return <div className="rounded-2xl bg-white/85 p-3"><span className="text-lg">{emoji}</span><p className="mt-1 text-[9px] font-black uppercase tracking-wide text-stone-400">{label}</p><p className="text-lg font-black text-stone-800">{value}</p></div>;
}

function MusicButton({ musicMuted, onToggle }: { musicMuted: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-label={musicMuted ? 'Unmute music' : 'Mute music'} title={musicMuted ? 'Unmute music' : 'Mute music'} onClick={onToggle} className="h-10 w-10 shrink-0 rounded-xl bg-white/70 text-sm shadow-sm">
      {musicMuted ? '🔇' : '🔊'}
    </button>
  );
}
