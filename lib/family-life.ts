export type FamilyStage = 'partners' | 'child';

export type FamilyLifeState = {
  stage: FamilyStage;
  milestones: {
    growingTogether: boolean;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function createInitialFamilyLifeState(): FamilyLifeState {
  return {
    stage: 'partners',
    milestones: {
      growingTogether: false,
    },
  };
}

export function normalizeFamilyLifeState(raw: unknown): FamilyLifeState {
  const source = asRecord(raw);
  const milestones = asRecord(source.milestones);

  return {
    stage: source.stage === 'child' ? 'child' : 'partners',
    milestones: {
      growingTogether: milestones.growingTogether === true,
    },
  };
}
