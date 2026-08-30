"use client";

import type { HomesteadLifeAction, HomesteadLifeState } from '@/lib/homestead-life-engine';

function PetPortrait({ kind }: { kind: HomesteadLifeState['animals']['pet']['kind'] }) {
  if (!kind) return null;
  return <FamilyPortrait emoji={kind === 'cat' ? '🐱' : '🐶'} label={kind === 'cat' ? 'Cat' : 'Dog'} tone="amber" />;
}

function FamilyPortrait({ emoji, label, tone = 'rose' }: { emoji: string; label: string; tone?: 'rose' | 'emerald' | 'amber' | 'sky' }) {
  const toneClass = tone === 'emerald'
    ? 'from-emerald-100 to-lime-50 ring-emerald-200/80'
    : tone === 'amber'
      ? 'from-amber-100 to-orange-50 ring-amber-200/80'
      : tone === 'sky'
        ? 'from-sky-100 to-cyan-50 ring-sky-200/80'
        : 'from-rose-100 to-pink-50 ring-rose-200/80';
  return (
    <div className="min-w-0 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br ${toneClass} text-2xl shadow-sm ring-1 sm:h-16 sm:w-16 sm:text-3xl`}>
        {emoji}
      </div>
      <p className="mt-1 truncate text-[9px] font-black text-stone-600">{label}</p>
    </div>
  );
}

function FamilyStat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] bg-white/78 px-3 py-2.5 shadow-sm ring-1 ring-stone-900/[0.04]">
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-stone-400">{label}</p>
          <p className="truncate text-[12px] font-black text-stone-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function HexFamilyPanel({
  state,
  busy,
  onAction,
  onClose,
}: {
  state: HomesteadLifeState;
  busy: boolean;
  onAction: (action: HomesteadLifeAction) => Promise<boolean>;
  onClose: () => void;
}) {
  const hasChild = state.family.stage === 'child';
  const pet = state.animals.pet.kind;
  const growingTogether = state.family.milestones.growingTogether;
  const homeTier = state.buildingTiers.home;
  const familyTimeDone = state.daily.familyTime;
  const familyTitle = state.familyName?.trim() || 'Our Family';

  return (
    <section
      data-hex-family-panel
      aria-label="Family"
      className="pointer-events-auto fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom))] left-3 right-3 z-[97] max-h-[68vh] overflow-y-auto rounded-[2rem] border border-white/80 bg-[#fff8ef]/96 p-4 shadow-2xl shadow-rose-950/[0.12] backdrop-blur-2xl md:bottom-auto md:left-auto md:right-5 md:top-[5.3rem] md:w-[min(430px,calc(100vw-2.5rem))] md:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">Family</p>
          <h2 className="mt-0.5 text-xl font-black tracking-tight text-stone-900">{familyTitle}</h2>
          <p className="mt-1 text-[10px] font-bold text-stone-500">
            {hasChild ? 'Growing a little home together' : 'Two hearts building a home together'}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Family" className="h-10 w-10 shrink-0 rounded-full bg-white/80 text-lg font-black text-stone-400 shadow-sm ring-1 ring-stone-900/[0.04]">×</button>
      </div>

      <div className="mt-4 rounded-[1.6rem] bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-3.5 ring-1 ring-rose-100/90">
        <div className={`grid gap-3 ${hasChild || pet ? 'grid-cols-4' : 'grid-cols-2'} place-items-center`}>
          <FamilyPortrait emoji="🙂" label="You" tone="emerald" />
          <FamilyPortrait emoji="💞" label="Partner" />
          {state.family.stage === 'child' && <FamilyPortrait emoji="🧒" label="Child" tone="sky" />}
          <PetPortrait kind={pet} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <FamilyStat emoji="💗" label="Hearts" value={state.hearts.toLocaleString()} />
        <FamilyStat emoji="🏡" label="Home" value={`Tier ${homeTier}`} />
        <FamilyStat emoji="✨" label="Story" value={growingTogether ? 'Together' : 'Growing'} />
      </div>

      <div className="mt-3 rounded-[1.4rem] bg-white/72 p-3.5 ring-1 ring-stone-900/[0.04]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-500">Growing Together</p>
            <p className="mt-1 text-sm font-black text-stone-800">
              {growingTogether ? 'A family milestone you share' : 'Make the homestead feel more like home'}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${growingTogether ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {growingTogether ? 'Complete' : 'In progress'}
          </span>
        </div>
        <p className="mt-2 text-[10px] font-semibold leading-relaxed text-stone-500">
          {growingTogether
            ? 'Your home, Hearts, and time together have opened the next chapter of family life.'
            : `Keep growing your Hearts and home. Your home is currently Tier ${homeTier}.`}
        </p>
      </div>

      <button
        type="button"
        disabled={busy || state.daily.familyTime}
        onClick={() => void onAction({ type: 'family_time' })}
        className="mt-3 min-h-[50px] w-full rounded-[1.2rem] bg-rose-500 px-4 text-[11px] font-black text-white shadow-lg shadow-rose-900/15 transition active:scale-[0.99] disabled:bg-stone-300 disabled:shadow-none"
      >
        {familyTimeDone ? '💗 Family Time shared today' : '💗 Spend Family Time'}
      </button>
    </section>
  );
}
