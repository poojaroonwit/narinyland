import type { HomesteadLifeState } from '@/lib/homestead-life-engine';
import type { HexResidentId } from './explore-interactions';

export type HexResidentDialogue = {
  title: string;
  line: string;
  primaryVerb: 'Talk' | 'Pet';
  canFamilyTime: boolean;
  canPetTime: boolean;
};

type DialogueInput = {
  residentId: HexResidentId;
  petKind?: 'cat' | 'dog';
  state: HomesteadLifeState;
};

function stableIndex(seed: string, size: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return size > 0 ? (hash >>> 0) % size : 0;
}

function timeBucket(minutes: number): 'morning' | 'day' | 'evening' {
  if (minutes < 720) return 'morning';
  if (minutes >= 1080) return 'evening';
  return 'day';
}

function contextualLines({ residentId, petKind, state }: DialogueInput): string[] {
  const bucket = timeBucket(state.timeMinutes);
  const lowEnergy = state.energy <= Math.max(1, Math.floor(state.maxEnergy * 0.25));
  const shared: string[] = [];

  if (state.weather === 'rainy') shared.push('The rain makes the whole homestead feel quiet today.');
  if (state.season === 'spring') shared.push('Everything feels a little more alive this spring.');
  if (state.season === 'summer') shared.push('It is warm out here — the garden will need a little extra care.');
  if (state.season === 'autumn') shared.push('The air smells like leaves and a slower kind of afternoon.');
  if (state.season === 'winter') shared.push('The cold makes home feel especially cozy today.');
  if (bucket === 'morning') shared.push('Morning light looks good on our little island.');
  if (bucket === 'evening') shared.push('It is getting late. The lanterns make home feel close.');
  if (lowEnergy) shared.push('You look tired. We can take the rest of the day gently.');

  if (residentId === 'child') {
    shared.push('Can we go see what is happening by the pond?');
    shared.push('I found a tiny place that feels like it belongs in a storybook.');
  } else if (residentId === 'pet') {
    const animal = petKind === 'dog' ? 'dog' : 'cat';
    shared.push(`Your ${animal} trots over and waits for attention.`);
    shared.push(`Your ${animal} stays close, watching the homestead with you.`);
  } else {
    shared.push('The homestead feels better when we slow down and notice it together.');
    shared.push('I like how this place keeps changing a little every day.');
  }

  return shared;
}

export function getResidentDialogue(input: DialogueInput): HexResidentDialogue {
  const { residentId, petKind, state } = input;
  const lines = contextualLines(input);
  const bucket = timeBucket(state.timeMinutes);
  const seed = `${residentId}:${state.day}:${state.season}:${state.weather}:${bucket}:${state.energy <= Math.max(1, Math.floor(state.maxEnergy * 0.25))}`;
  const line = lines[stableIndex(seed, lines.length)] ?? 'It is nice to be here together.';
  const isPet = residentId === 'pet';
  const title = isPet
    ? petKind === 'dog' ? 'Dog' : 'Cat'
    : residentId === 'child' ? 'Child' : 'Partner';

  return {
    title,
    line,
    primaryVerb: isPet ? 'Pet' : 'Talk',
    canFamilyTime: !isPet && state.daily.familyTime !== true,
    canPetTime: isPet && !!state.animals.pet.kind && state.animals.pet.interactedDay !== state.day,
  };
}
