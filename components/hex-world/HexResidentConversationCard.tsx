"use client";

import React from 'react';
import type { HomesteadLifeAction, HomesteadLifeState } from '@/lib/homestead-life-engine';
import type { HexExploreResidentInteractionTarget } from '@/lib/hex-world/explore-interactions';
import { getResidentDialogue } from '@/lib/hex-world/resident-dialogue';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function HexResidentConversationCard({ target, state, busy, onAction, onClose }: {
  target: HexExploreResidentInteractionTarget;
  state: HomesteadLifeState;
  busy: boolean;
  onAction: (action: HomesteadLifeAction) => Promise<boolean>;
  onClose: () => void;
}) {
  const dialogue = getResidentDialogue({ residentId: target.residentId, petKind: target.petKind, state });

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat || isEditableTarget(event.target)) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const run = (action: HomesteadLifeAction) => void onAction(action);

  return (
    <aside
      className="pointer-events-auto fixed bottom-[calc(7.2rem+env(safe-area-inset-bottom))] left-1/2 z-[96] w-[min(92vw,390px)] -translate-x-1/2 rounded-[1.5rem] border border-white/70 bg-[#fffdf7]/94 p-4 shadow-2xl shadow-stone-950/15 backdrop-blur-xl sm:bottom-[6.25rem]"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-emerald-700">Homestead</p>
          <h3 className="mt-0.5 text-sm font-black text-stone-900">{dialogue.title}</h3>
        </div>
        <button type="button" onClick={onClose} className="min-h-[36px] rounded-full bg-stone-100 px-3 text-[9px] font-black text-stone-500">Close</button>
      </div>

      <p className="mt-3 rounded-2xl bg-white/80 px-3 py-3 text-[12px] font-semibold leading-5 text-stone-700 shadow-sm">{dialogue.line}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {dialogue.canFamilyTime && (
          <button type="button" disabled={busy} onClick={() => run({ type: 'family_time' })} className="min-h-[44px] rounded-xl bg-emerald-700 px-4 text-[10px] font-black text-white disabled:opacity-45">Family Time</button>
        )}
        {dialogue.canPetTime && (
          <button type="button" disabled={busy} onClick={() => run({ type: 'pet_time' })} className="min-h-[44px] rounded-xl bg-amber-100 px-4 text-[10px] font-black text-amber-800 disabled:opacity-45">Pet</button>
        )}
        <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl bg-stone-100 px-4 text-[10px] font-black text-stone-600">Close</button>
      </div>
    </aside>
  );
}
