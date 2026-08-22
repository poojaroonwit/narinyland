export type PetKind = 'cat' | 'dog';

export type HomesteadAnimalsState = {
  cow: {
    owned: boolean;
    fedDay: number | null;
    milkReady: boolean;
    milkCollectedDay: number | null;
  };
  sheep: {
    owned: boolean;
    caredDay: number | null;
    caredProgress: number;
    woolReady: boolean;
  };
  pet: {
    kind: PetKind | null;
    interactedDay: number | null;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeDay(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(1, Math.floor(value));
}

function safeProgress(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(2, Math.max(0, Math.floor(value)));
}

export function isPetKind(value: unknown): value is PetKind {
  return value === 'cat' || value === 'dog';
}

export function createInitialHomesteadAnimalsState(): HomesteadAnimalsState {
  return {
    cow: { owned: false, fedDay: null, milkReady: false, milkCollectedDay: null },
    sheep: { owned: false, caredDay: null, caredProgress: 0, woolReady: false },
    pet: { kind: null, interactedDay: null },
  };
}

export function normalizeHomesteadAnimalsState(raw: unknown): HomesteadAnimalsState {
  const source = asRecord(raw);
  const cow = asRecord(source.cow);
  const sheep = asRecord(source.sheep);
  const pet = asRecord(source.pet);

  return {
    cow: {
      owned: cow.owned === true,
      fedDay: safeDay(cow.fedDay),
      milkReady: cow.milkReady === true,
      milkCollectedDay: safeDay(cow.milkCollectedDay),
    },
    sheep: {
      owned: sheep.owned === true,
      caredDay: safeDay(sheep.caredDay),
      caredProgress: safeProgress(sheep.caredProgress),
      woolReady: sheep.woolReady === true,
    },
    pet: {
      kind: isPetKind(pet.kind) ? pet.kind : null,
      interactedDay: safeDay(pet.interactedDay),
    },
  };
}

export function advanceHomesteadAnimalsForNewDay(
  current: HomesteadAnimalsState,
  completedDay: number,
): HomesteadAnimalsState {
  const next = normalizeHomesteadAnimalsState(current);

  if (next.cow.owned && next.cow.fedDay === completedDay) {
    next.cow.milkReady = true;
  }

  if (next.sheep.owned && next.sheep.caredDay === completedDay && !next.sheep.woolReady) {
    next.sheep.caredProgress = Math.min(2, next.sheep.caredProgress + 1);
    next.sheep.woolReady = next.sheep.caredProgress >= 2;
  }

  return next;
}
