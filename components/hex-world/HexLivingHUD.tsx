"use client";

import React from 'react';
import {
  formatFarmTime,
  getDailyGoals,
  xpToNextLevel,
  type FamilyFarmState,
  type FarmAction,
} from '@/lib/family-farm-game';
import { getWeatherPresentation } from '@/lib/hex-world/living-homestead';

export function HexLivingHUD({
  state,
  points,
  loading,
  error,
  busy,
  onAction,
  onRetry,
}: {
  state: FamilyFarmState | null;
  points: number;
  loading: boolean;
  error: string | null;
  busy: boolean;
  onAction: (action: FarmAction) => Promise<boolean>;
  onRetry: () => void;
}) {
  const [goalsOpen, setGoalsOpen] = React.useState(false);

  if (!state) {
    return (
      <div className="pointer-events-auto fixed left-1/2 top-4 z-[95] -translate-x-1/2 rounded-full border border-white/70 bg-white/82 px-4 py-2 text-xs font-bold text-stone-600 shadow-xl backdrop-blur-xl">
        {loading ? 'Waking the homestead…' : (
          <button type="button" onClick={onRetry} className="min-h-[36px] font-black text-rose-600">
            {error ? 'Life sync unavailable · Retry' : 'Load homestead life'}
          </button>
        )}
      </div>
    );
  }

  const weather = getWeatherPresentation(state.weather);
  const goals = getDailyGoals(state);
  const completedGoals = goals.filter((goal) => goal.complete).length;
  const nextXp = xpToNextLevel(state.level);
  const rewardReady = completedGoals === goals.length && !state.daily.rewardClaimed;

  return (
    <div className="pointer-events-auto fixed left-1/2 top-3 z-[95] w-[min(96vw,760px)] -translate-x-1/2 md:top-4">
      <div className="rounded-[1.45rem] border border-white/70 bg-white/76 px-3 py-2 shadow-xl shadow-emerald-950/[0.07] backdrop-blur-xl md:px-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-[10px] font-black text-stone-700 md:justify-center md:text-xs">
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-800">Day {state.day}</span>
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1.5">{weather.emoji} {weather.label}</span>
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1.5">🕒 {formatFarmTime(state.timeMinutes)}</span>
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1.5">⚡ Energy {state.energy}/{state.maxEnergy}</span>
          <span className="shrink-0 rounded-full bg-yellow-50 px-2.5 py-1.5">🪙 Coins {state.coins}</span>
          <span className="shrink-0 rounded-full bg-pink-50 px-2.5 py-1.5">💗 Hearts {state.hearts}</span>
          <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1.5">✨ Points {points.toLocaleString()}</span>
          <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1.5">Lv {state.level} · {state.xp}/{nextXp} XP</span>
          <button
            type="button"
            onClick={() => setGoalsOpen((value) => !value)}
            className="min-h-[36px] shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-white"
          >
            Goals {completedGoals}/{goals.length}
          </button>
        </div>

        {goalsOpen && (
          <div className="mt-2 grid gap-1.5 border-t border-stone-900/[0.06] pt-2 sm:grid-cols-2">
            {goals.map((goal) => (
              <div key={goal.key} className="flex min-h-[40px] items-center gap-2 rounded-xl bg-white/65 px-3 py-2">
                <span>{goal.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-black text-stone-700">{goal.label}</p>
                  <p className="text-[9px] font-bold text-stone-400">{goal.progress}/{goal.target}</p>
                </div>
                <span className={`text-[10px] font-black ${goal.complete ? 'text-emerald-600' : 'text-stone-300'}`}>
                  {goal.complete ? '✓' : '○'}
                </span>
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
      </div>
    </div>
  );
}
