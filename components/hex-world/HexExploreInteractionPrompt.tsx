"use client";

import React from 'react';
import { getBuildingDefinition } from '@/lib/hex-world/building-catalog';
import type { HexExploreInteractionTarget, HexExploreBuildingInteractionTarget } from '@/lib/hex-world/explore-interactions';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function fallbackBuildingName(target: HexExploreBuildingInteractionTarget): string {
  switch (target.role) {
    case 'home': return 'Home';
    case 'barn': return 'Barn';
    case 'garden': return 'Garden Patch';
    case 'pond': return 'Pond';
    case 'forage': return 'Wild Tree';
    case 'family': return 'Cozy Spot';
    case 'storage': return 'Storage';
    case 'workshop': return 'Workshop';
    case 'flowers': return 'Flower Patch';
  }
}

function targetCopy(target: HexExploreInteractionTarget): { verb: 'Interact' | 'Talk' | 'Pet'; name: string } {
  if (target.kind === 'resident') {
    if (target.residentId === 'pet') return { verb: 'Pet', name: target.petKind === 'dog' ? 'Dog' : 'Cat' };
    return { verb: 'Talk', name: target.residentId === 'child' ? 'Child' : 'Partner' };
  }
  return {
    verb: 'Interact',
    name: getBuildingDefinition(target.building.buildingKey)?.name ?? fallbackBuildingName(target),
  };
}

export function HexExploreInteractionPrompt({ target, disabled = false, onInteract }: {
  target: HexExploreInteractionTarget;
  disabled?: boolean;
  onInteract: () => void;
}) {
  React.useEffect(() => {
    if (disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat || isEditableTarget(event.target)) return;
      event.preventDefault();
      onInteract();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, onInteract]);

  if (disabled) return null;
  const { verb, name } = targetCopy(target);

  return <>
    <div className="pointer-events-none fixed bottom-[calc(11.1rem+env(safe-area-inset-bottom))] left-1/2 z-[94] hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/45 bg-stone-900/74 px-3 py-2 text-white shadow-xl backdrop-blur-xl sm:flex">
      <span className="grid min-h-[28px] min-w-[28px] place-items-center rounded-lg bg-white/15 px-2 text-[10px] font-black">E</span>
      <span className="text-[10px] font-black">{verb}</span>
      <span className="max-w-[180px] truncate text-[9px] font-bold text-white/70">{name}</span>
    </div>
    <button type="button" onPointerDown={(event)=>event.stopPropagation()} onPointerUp={(event)=>event.stopPropagation()} onClick={(event)=>{event.stopPropagation();onInteract();}} className="pointer-events-auto fixed bottom-[calc(10.7rem+env(safe-area-inset-bottom))] right-[calc(0.85rem+env(safe-area-inset-right))] z-[94] min-h-[44px] min-w-[96px] rounded-2xl border border-white/65 bg-stone-900/90 px-3 py-2 text-left text-white shadow-2xl backdrop-blur-xl sm:hidden" aria-label={`${verb} with ${name}`}>
      <span className="block text-[10px] font-black">{verb}</span><span className="block max-w-[130px] truncate text-[8px] font-bold text-white/65">{name}</span>
    </button>
  </>;
}
