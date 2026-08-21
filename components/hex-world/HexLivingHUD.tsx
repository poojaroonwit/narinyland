"use client";

import React from 'react';
import {
  formatFarmTime,
  getHomesteadJourney,
  getNextLevelUnlock,
  getProgressionDailyGoals,
  getSeasonPresentation,
  xpToNextLevel,
  type ProgressionFamilyFarmState,
  type ProgressionFarmAction,
} from '@/lib/family-farm-progression';
import { getWeatherPresentation } from '@/lib/hex-world/living-homestead';

type DetailPanel = 'goals' | 'journey' | null;

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
}: {
  state: ProgressionFamilyFarmState | null;
  points: number;
  loading: boolean;
  error: string | null;
  busy: boolean;
  musicMuted: boolean;
  onToggleMusic: () => void;
  onAction: (action: ProgressionFarmAction) => Promise<boolean>;
  onRetry: () => void;
}) {
  const [detailPanel, setDetailPanel] = React.useState<DetailPanel>(null);
  const [dismissedSeasonDay, setDismissedSeasonDay] = React.useState<number | null>(null);

  if (!state) {
    return (
      <div className="pointer-events-auto fixed left-1/2 top-4 z-[95] flex -translate-x-1/2 items-center gap-2">
        <div className="rounded-full border border-white/70 bg-white/82 px-4 py-2 text-xs font-bold text-stone-600 shadow-xl backdrop-blur-xl">
          {loading ? 'Waking the homestead…' : (
            <button type="button" onClick={onRetry} className="min-h-[36px] font-black text-rose-600">
              {error ? 'Life sync unavailable · Retry' : 'Load homestead life'}
            </button>
          )}
        </div>
        <MusicButton muted={musicMuted} onToggle={onToggleMusic} />
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

  return (
    <div className="pointer-events-auto fixed left-1/2 top-3 z-[95] w-[min(96vw,860px)] -translate-x-1/2 md:top-4">
      <div className="rounded-[1.45rem] border border-white/70 bg-white/76 px-3 py-2 shadow-xl shadow-emerald-950/[0.07] backdrop-blur-xl md:px-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-[10px] font-black text-stone-700 md:justify-center md:text-xs">
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-800">Day {state.day}</span>
          <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1.5 text-rose-700">{season.emoji} {season.label}</span>
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1.5">{weather.emoji} {weather.label}</span>
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1.5">🕒 {formatFarmTime(state.timeMinutes)}</span>
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1.5">⚡ Energy {state.energy}/{state.maxEnergy}</span>
          <span className="shrink-0 rounded-full bg-yellow-50 px-2.5 py-1.5">🪙 Coins {state.coins}</span>
          <span className="shrink-0 rounded-full bg-pink-50 px-2.5 py-1.5">💗 Hearts {state.hearts}</span>
          <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1.5">✨ Points {points.toLocaleString()}</span>
          <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1.5">Lv {state.level} · {state.xp}/{nextXp} XP</span>
          <button
            type="button"
            onClick={() => setDetailPanel((value) => value === 'goals' ? null : 'goals')}
            className="min-h-[36px] shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-white"
          >
            Goals {completedGoals}/{goals.length}
          </button>
          <button
            type="button"
            onClick={() => setDetailPanel((value) => value === 'journey' ? null : 'journey')}
            className="min-h-[36px] shrink-0 rounded-full bg-emerald-700 px-3 py-1.5 text-white"
          >
            Journey {completedJourney}/{journey.length}
          </button>
          <MusicButton muted={musicMuted} onToggle={onToggleMusic} compact />
        </div>

        <div className="mt-1 flex items-center justify-center gap-2 text-[9px] font-bold text-stone-500">
          <span className="rounded-full bg-white/60 px-2 py-1">Next unlock · Lv {nextUnlock.level} · {nextUnlock.label}</span>
        </div>

        {detailPanel === 'goals' && (
          <div className="mt-2 grid gap-1.5 border-t border-stone-900/[0.06] pt-2 sm:grid-cols-2">
            {goals.map((goal) => (
              <div key={goal.key} className="flex min-h-[40px] items-center gap-2 rounded-xl bg-white/65 px-3 py-2">
                <span>{goal.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-black text-stone-700">{goal.label}</p>
                  <p className="text-[9px] font-bold text-stone-400">{goal.progress}/{goal.target}</p>
                </div>
                <span className={`text-[10px] font-black ${goal.complete ? 'text-emerald-600' : 'text-stone-300'}`}>{goal.complete ? '✓' : '○'}</span>
              </div>
            ))}
            <button
              type="button"
              disabled={!rewardReady || busy}
              onClick={() => void onAction({ type: 'claim_daily_reward' })}
              className="min-h-[42px] rounded-xl bg-emerald-700 px-3 text-[10px] font-black text-white shadow-md disabled:bg-stone-300 sm:col-span-2"
            >
              {state.daily.rewardClaimed ? 'Daily reward claimed' : rewardReady ? 'Claim daily family reward' : 'Complete all Goals for reward'}
            </button>
          </div>
        )}

        {detailPanel === 'journey' && (
          <div className="mt-2 border-t border-stone-900/[0.06] pt-2">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">Homestead Journey</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {journey.map((entry) => (
                <div key={entry.key} className="flex min-h-[48px] items-center gap-2 rounded-xl bg-white/65 px-3 py-2">
                  <span className="text-base">{entry.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-black text-stone-700">{entry.label}</p>
                    <p className="truncate text-[8px] font-bold text-stone-400">{entry.progress}/{entry.target} · {entry.rewardLabel}</p>
                  </div>
                  <span className={entry.complete ? 'text-emerald-600' : 'text-stone-300'}>{entry.complete ? '✓' : '○'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSeasonSummary && seasonSummary && (
        <div className="mx-auto mt-2 w-[min(92vw,460px)] rounded-[1.4rem] border border-white/80 bg-[#fffdf7]/94 p-3 shadow-xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-600">Season complete</p>
              <p className="mt-0.5 text-sm font-black text-stone-800">
                {getSeasonPresentation(seasonSummary.completedSeason!).emoji} {getSeasonPresentation(seasonSummary.completedSeason!).label} together
              </p>
              <p className="mt-1 text-[10px] font-bold text-stone-500">
                +{seasonSummary.seasonRewardCoins ?? 0} coins · +{seasonSummary.seasonRewardHearts ?? 0} Hearts · {getSeasonPresentation(seasonSummary.nextSeason ?? state.season).label} begins
              </p>
            </div>
            <button type="button" onClick={() => setDismissedSeasonDay(seasonSummary.completedDay)} className="min-h-[36px] rounded-full bg-stone-100 px-3 text-[9px] font-black text-stone-500">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MusicButton({ muted, onToggle, compact = false }: { muted: boolean; onToggle: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      aria-label={muted ? 'Unmute Music' : 'Mute Music'}
      title={muted ? 'Unmute Music' : 'Mute Music'}
      onClick={onToggle}
      className={`${compact ? 'min-h-[36px]' : 'min-h-[42px]'} shrink-0 rounded-full border border-white/70 bg-white/82 px-3 text-[10px] font-black text-stone-600 shadow-sm backdrop-blur-xl`}
    >
      {muted ? '🔇 Music' : '🔊 Music'}
    </button>
  );
}
