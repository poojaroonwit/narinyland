"use client";

import * as React from 'react';
import { useAuth } from '@/components/AuthProvider';

type Quest = {
  key: string;
  title: string;
  prompt: string;
  category: 'discover' | 'dream' | 'care';
  icon: string;
  mineDone: boolean;
  partnerDone: boolean;
  revealed: boolean;
  answers: Array<{ name: string; answer: string }>;
};

type WorldState = {
  worldName: string;
  dayKey: string;
  partnerCount: number;
  completedMoments: number;
  chapter: { title: string; description: string; nextAt: number | null };
  quests: Quest[];
};

const MOODS: Record<Quest['category'], { tag: string; background: string }> = {
  discover: { tag: 'Explore', background: 'from-sky-50 to-indigo-50/60' },
  dream: { tag: 'Imagine', background: 'from-violet-50 to-pink-50/60' },
  care: { tag: 'Connect', background: 'from-emerald-50 to-amber-50/60' },
};

async function requestWorld(circleId: string, data?: { questKey: string; answer: string }, signal?: AbortSignal): Promise<WorldState> {
  const response = await fetch('/api/couple-world/quests', {
    method: data ? 'POST' : 'GET',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json', 'X-Circle-Id': circleId },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not load your adventures.');
  return result as WorldState;
}

/** A low-pressure private place for the two people who share this world. */
export function CoupleWorldAdventure() {
  const { activeCircleId } = useAuth();
  const currentWorldRef = React.useRef(activeCircleId);
  currentWorldRef.current = activeCircleId;
  const [state, setState] = React.useState<WorldState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<string | null>(null);
  const [answer, setAnswer] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const refresh = React.useCallback(async (signal?: AbortSignal) => {
    if (!activeCircleId) return;
    const next = await requestWorld(activeCircleId, undefined, signal);
    if (!signal?.aborted && currentWorldRef.current === activeCircleId) setState(next);
  }, [activeCircleId]);

  React.useEffect(() => {
    const abort = new AbortController();
    setState(null);
    setError('');
    setEditing(null);
    setAnswer('');
    setLoading(true);
    refresh(abort.signal)
      .catch((cause) => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load adventures.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [refresh]);

  async function submit(key: string) {
    if (!activeCircleId || submitting || answer.trim().length < 2) return;
    setSubmitting(true);
    setError('');
    try {
      const next = await requestWorld(activeCircleId, { questKey: key, answer: answer.trim() });
      if (currentWorldRef.current !== activeCircleId) return;
      setState(next);
      window.dispatchEvent(new CustomEvent('narinyland:couple-stories-updated', {
        detail: { circleId: activeCircleId, completedMoments: next.completedMoments },
      }));
      setEditing(null);
      setAnswer('');
    } catch (cause) {
      if (currentWorldRef.current !== activeCircleId) return;
      setError(cause instanceof Error ? cause.message : 'Could not save your answer.');
      // Refresh on conflict because the other partner may just have answered.
      await refresh().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 text-slate-800 sm:px-6" aria-label="Our couple adventures">
      <div className="overflow-hidden rounded-[2rem] border border-white/85 bg-white/90 shadow-[0_24px_90px_rgba(65,53,93,0.16)] backdrop-blur-xl">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f9f4ff] via-[#fff7f4] to-[#ecf9f3] p-6 sm:p-9">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-pink-200/25 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500">Narinyland · A world for two</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">Our adventures</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">A little journey you build together. Write your part privately, then discover your partner&apos;s story when you&apos;ve both answered.</p>
            </div>
            <div className="rounded-2xl border border-white bg-white/75 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Our shared world</p>
              <p className="mt-1 max-w-52 truncate text-lg font-bold text-slate-800">{state?.worldName || 'Our world'}</p>
              <p className="mt-1 text-xs text-slate-500">{state ? state.partnerCount + ' of 2 adventurers here' : 'Private to your world'}</p>
            </div>
          </div>

          {state && (
            <div className="relative mt-7 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-white/80 bg-white/70 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Your story chapter</p>
                <h2 className="mt-1 text-xl font-bold">{state.chapter.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{state.chapter.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5" role="img" aria-label={state.completedMoments + ' completed shared moments'}>
                  {Array.from({ length: 14 }, (_, i) => (
                    <span key={i} className={'h-3 w-3 rounded-full border ' + (i < state.completedMoments ? 'border-amber-300 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.65)]' : 'border-violet-100 bg-slate-200/70')} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">{state.completedMoments} shared moments saved{state.chapter.nextAt ? ' · Next chapter at ' + state.chapter.nextAt : ' · The story keeps growing'}</p>
              </div>
              <div className="flex min-w-40 flex-col justify-center rounded-2xl border border-white/80 bg-white/70 p-5 text-center">
                <div className="text-4xl">🏮</div>
                <strong className="mt-2 text-3xl text-violet-700">{state.completedMoments}</strong>
                <span className="text-xs text-slate-500">Story lanterns</span>
              </div>
            </div>
          )}
        </section>

        <section className="px-5 py-7 sm:px-9 sm:py-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Today&apos;s three journeys</h2>
              <p className="mt-1 text-sm text-slate-500">No streaks or rush. New journeys arrive daily at 00:00 UTC.</p>
            </div>
            <button type="button" onClick={() => { setError(''); setLoading(true); refresh().catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not refresh.')).finally(() => setLoading(false)); }} disabled={!activeCircleId || loading} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Refresh</button>
          </div>

          {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
          {loading && <p role="status" className="mt-8 py-10 text-center text-sm text-slate-500">Opening your shared story…</p>}
          {!activeCircleId && <p className="mt-5 text-sm text-slate-600">Create or select a world to begin.</p>}
          {state?.partnerCount === 1 && (
            <div className="mt-6 rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 p-4 text-sm text-violet-800">
              Your world is ready. Invite your partner through the world&apos;s AppKit membership. Your answers will remain hidden until they join and contribute.
            </div>
          )}

          {state && (
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {state.quests.map((quest) => {
                const mood = MOODS[quest.category];
                const isEditing = editing === quest.key;
                return (
                  <article key={quest.key} className={'flex min-h-72 flex-col rounded-[1.5rem] border border-slate-100 bg-gradient-to-br p-5 shadow-sm ' + mood.background}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-2xl shadow-sm" aria-hidden>{quest.icon}</span>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600">{mood.tag}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold">{quest.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{quest.prompt}</p>
                    <div className="mt-5 rounded-xl bg-white/75 p-3 text-xs text-slate-600">
                      <div className="flex justify-between gap-2">
                        <span>{quest.mineDone ? '✓ Your part is saved' : '○ Your part is waiting'}</span>
                        <span>{quest.partnerDone ? '✓ Partner replied' : '○ Partner pending'}</span>
                      </div>
                    </div>
                    {quest.revealed ? (
                      <div className="mt-4 space-y-3" aria-label="Revealed partner stories">
                        <p className="text-xs font-bold text-violet-700">✨ Your story lantern is lit!</p>
                        {quest.answers.map((item, index) => (
                          <div className="rounded-xl bg-white/80 p-3" key={index}>
                            <p className="text-xs font-bold text-slate-700">{item.name}</p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">{item.answer}</p>
                          </div>
                        ))}
                      </div>
                    ) : quest.mineDone ? (
                      <p className="mt-4 rounded-xl bg-white/70 px-3 py-3 text-sm text-slate-600">Your answer is sealed ✉️. You&apos;ll both see the reveal after your partner replies.</p>
                    ) : isEditing ? (
                      <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(quest.key); }}>
                        <label htmlFor={'quest-' + quest.key} className="block text-xs font-semibold text-slate-600">Your private answer</label>
                        <textarea id={'quest-' + quest.key} value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={240} rows={4} autoFocus className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-violet-400" placeholder="Write a little piece of your story…" />
                        <p className="text-right text-[11px] text-slate-400">{answer.length}/240</p>
                        <div className="flex gap-2">
                          <button type="submit" disabled={submitting || answer.trim().length < 2} className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Seal my answer</button>
                          <button type="button" onClick={() => { setEditing(null); setAnswer(''); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <button type="button" onClick={() => { setEditing(quest.key); setAnswer(''); }} className="mt-4 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700">Write my part →</button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
