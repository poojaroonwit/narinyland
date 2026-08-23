import {
  getCropAvailability,
  getProgressionPlotProgress,
  getSeasonPresentation as getProgressionSeasonPresentation,
  isProgressionPlotReady,
  type FarmSeason,
  type FarmWeather,
  type ProgressionCropKey,
  type ProgressionFamilyFarmState,
} from '@/lib/family-farm-progression';
import type { HexBuildingDTO } from './types';

export type LivingBuildingRole = 'home' | 'barn' | 'garden' | 'pond' | 'forage' | 'family' | 'storage' | 'workshop' | 'flowers' | null;
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
  cropKey: ProgressionCropKey;
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
    case 'barn': return 'barn';
    case 'garden_patch': return 'garden';
    case 'pond': return 'pond';
    case 'tree': return 'forage';
    case 'bench': return 'family';
    case 'storage': return 'storage';
    case 'workshop': return 'workshop';
    case 'flower_patch': return 'flowers';
    default: return null;
  }
}

export function getGardenActionTarget(state: ProgressionFamilyFarmState, action: GardenActionKind) {
  if (action === 'plant') return state.plots.find((plot) => !plot.cropKey) ?? null;
  if (action === 'water') {
    return state.plots.find((plot) => !!plot.cropKey && !isProgressionPlotReady(plot) && !plot.watered) ?? null;
  }
  return state.plots.find((plot) => isProgressionPlotReady(plot)) ?? null;
}

export function getGardenSummary(state: ProgressionFamilyFarmState): GardenSummary {
  const planted = state.plots.filter((plot) => !!plot.cropKey).length;
  const ready = state.plots.filter((plot) => isProgressionPlotReady(plot)).length;
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

export function getCropAvailabilityCopy(state: ProgressionFamilyFarmState, cropKey: ProgressionCropKey): string | null {
  const availability = getCropAvailability(state, cropKey);
  return availability.available ? null : availability.reason;
}

export function getCropVisualSamples(
  state: ProgressionFamilyFarmState,
  gardenBuildings: HexBuildingDTO[],
  maxSamples = 12,
): CropVisualSample[] {
  if (gardenBuildings.length === 0 || maxSamples <= 0) return [];
  const gardens = [...gardenBuildings].sort((a, b) => a.id.localeCompare(b.id));
  const visualCapacity = gardens.length * 6;
  const sampleLimit = Math.min(visualCapacity, Math.max(0, Math.floor(maxSamples)));
  return state.plots
    .filter((plot): plot is typeof plot & { cropKey: ProgressionCropKey } => !!plot.cropKey)
    .slice(0, sampleLimit)
    .map((plot, index) => {
      const garden = gardens[index % gardens.length];
      return {
        plotId: plot.id,
        cropKey: plot.cropKey,
        progress: getProgressionPlotProgress(plot),
        watered: plot.watered,
        gardenBuildingId: garden.id,
        anchorQ: garden.anchorQ,
        anchorR: garden.anchorR,
        slot: Math.floor(index / gardens.length),
      };
    });
}

export function getSeasonPresentation(season: FarmSeason): { label: string; emoji: string } {
  return getProgressionSeasonPresentation(season);
}

export function getWeatherPresentation(weather: FarmWeather): { label: string; emoji: string } {
  switch (weather) {
    case 'sunny': return { label: 'Sunny', emoji: '☀️' };
    case 'cloudy': return { label: 'Cloudy', emoji: '☁️' };
    case 'rainy': return { label: 'Rainy', emoji: '🌧️' };
    case 'breezy': return { label: 'Breezy', emoji: '🍃' };
  }
}
