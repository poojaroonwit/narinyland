export type CropVisualStage = 'sprout' | 'young' | 'mature' | 'ready';

export function getCropVisualStage(progress: number): CropVisualStage {
  const normalized = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (normalized < 0.25) return 'sprout';
  if (normalized < 0.55) return 'young';
  if (normalized < 0.85) return 'mature';
  return 'ready';
}

export function getCropStageScale(stage: CropVisualStage): number {
  switch (stage) {
    case 'sprout': return 0.58;
    case 'young': return 0.78;
    case 'mature': return 0.96;
    case 'ready': return 1.04;
  }
}

export function getCropSilhouetteKind(cropKey: string): 'root' | 'leafy' | 'vine' | 'stalk' | 'bush' {
  switch (cropKey) {
    case 'carrot':
    case 'potato':
      return 'root';
    case 'lettuce':
    case 'cabbage':
      return 'leafy';
    case 'pumpkin':
      return 'vine';
    case 'corn':
      return 'stalk';
    case 'tomato':
    case 'strawberry':
    default:
      return 'bush';
  }
}
