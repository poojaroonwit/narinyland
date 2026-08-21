import {
  getPlotProgress,
  isPlotReady,
  type FamilyFarmState,
  type FarmWeather,
} from '@/lib/family-farm-game';
import type { HexBuildingDTO } from './types';

export type LivingBuildingRole = 'home' | 'garden' | 'pond' | 'forage' | 'family' | 'storage' | null;
export type GardenActionKind = 'plant' | 'water' | 'harvest';

export type GardenSummary = {
  total: number;
  empty: number;
  planted: number;
  growing: number;
  watered: number;
  ready: number;
};

export type CropVisualSample = {
  plotId: string;
  cropKey: NonNullable<FamilyFarmState['plots'][number]['cropKey']>;
  progress: number;
  watered: boolean;
  gardenBuildingId: string;
  anchorQ: number;
  anchorR: number;
  slot: number;
};

export function getLivingBuildingRole(buildingKey: string): LivingBuildingRole {
  switch (buildingKey) {
    case 'home': return 'home';
    case 'garden_patch': return 'garden';
    case 'pond': return 'pond';
    case 'tree': return 'forage';
    case 'bench': return 'family';
    case 'storage': return 'storage';
    default: return null;
  }
}

export function getGardenActionTarget(state: FamilyFarmState, action: GardenActionKind) {
  if (action === 'plant') return state.plots.find((plot) => !plot.cropKey) ?? null;
  if (action === 'water') {
    return state.plots.find((plot) => !!plot.cropKey && !isPlotReady(plot) && !plot.watered) ?? null;
  }
  return state.plots.find((plot) => isPlotReady(plot)) ?? null;
}

export function getGardenSummary(state: FamilyFarmState): GardenSummary {
  const planted = state.plots.filter((plot) => !!plot.cropKey).length;
  const ready = state.plots.filter((plot) => isPlotReady(plot)).length;
  const watered = state.plots.filter((plot) => !!plot.cropKey && plot.watered).length;
  return {
    total: state.plots.length,
    empty: state.plots.length - planted,
    planted,
    growing: planted - ready,
    watered,
    ready,
  };
}

export function getCropVisualSamples(
  state: FamilyFarmState,
  gardenBuildings: HexBuildingDTO[],
  maxSamples = 12,
): CropVisualSample[] {
  if (gardenBuildings.length === 0 || maxSamples <= 0) return [];
  const gardens = [...gardenBuildings].sort((a, b) => a.id.localeCompare(b.id));
  return state.plots
    .filter((plot): plot is typeof plot & { cropKey: NonNullable<typeof plot.cropKey> } => !!plot.cropKey)
    .slice(0, Math.max(0, Math.floor(maxSamples)))
    .map((plot, index) => {
      const garden = gardens[index % gardens.length];
      return {
        plotId: plot.id,
        cropKey: plot.cropKey,
        progress: getPlotProgress(plot),
        watered: plot.watered,
        gardenBuildingId: garden.id,
        anchorQ: garden.anchorQ,
        anchorR: garden.anchorR,
        slot: Math.floor(index / gardens.length) % 6,
      };
    });
}

export function getWeatherPresentation(weather: FarmWeather): { label: string; emoji: string } {
  switch (weather) {
    case 'sunny': return { label: 'Sunny', emoji: '☀️' };
    case 'cloudy': return { label: 'Cloudy', emoji: '☁️' };
    case 'rainy': return { label: 'Rainy', emoji: '🌧️' };
    case 'breezy': return { label: 'Breezy', emoji: '🍃' };
  }
}
