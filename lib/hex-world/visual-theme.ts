import type { FarmSeason, FarmWeather } from '@/lib/family-farm-progression';
import type { HexTerrainType } from './types';

export type HexVisualEnvironment = {
  season: FarmSeason;
  weather: FarmWeather;
  daylight: number;
  evening: number;
};

export const HEX_VISUAL_THEME = {
  terrain: {
    grass: { base: '#87aa70', dark: '#6f925d', accent: '#a2bd84', roughness: 0.94 },
    soil: { base: '#9e7452', dark: '#78533d', accent: '#bd936c', roughness: 0.97 },
    stone: { base: '#9c9a91', dark: '#77776f', accent: '#b9b6aa', roughness: 1 },
    water: { base: '#5eb9b5', dark: '#408f94', accent: '#a7dedd', roughness: 0.48 },
  },
  structures: {
    cream: '#f2e4c7',
    warmCream: '#ead7b8',
    wood: '#805c43',
    darkWood: '#654735',
    trim: '#d9ba8e',
    roof: '#b96655',
    barn: '#b75e4d',
    workshopRoof: '#6d8a73',
    stoneBase: '#9b9587',
    window: '#ffe0a4',
    windowGlow: '#ffc978',
  },
  vegetation: {
    trunk: '#7b5b42',
    trunkDark: '#62452f',
    leaf: '#76995f',
    leafLight: '#8eac71',
    leafDark: '#62834f',
    grass: '#6f955a',
    flower: ['#dc91a1', '#efbd76', '#b49bd1', '#efd29e'],
  },
  water: {
    deep: '#438f94',
    surface: '#64c0bd',
    shallow: '#89d1ca',
    highlight: '#dcffff',
    bank: '#8fa895',
  },
  atmosphere: {
    day: '#dceef0',
    evening: '#eadfcf',
    rain: '#cbdde0',
    cloudy: '#d4e3e2',
    breezy: '#d8ebe5',
    spring: '#deeee7',
    summer: '#e8edd8',
    autumn: '#eadfce',
    winter: '#dce8eb',
    fog: '#dceef0',
  },
} as const;

export function getTerrainPresentation(terrainType: HexTerrainType) {
  return HEX_VISUAL_THEME.terrain[terrainType];
}

export function getHexVisualEnvironment(input: {
  season?: FarmSeason | null;
  weather?: FarmWeather | null;
  timeMinutes?: number | null;
}): HexVisualEnvironment {
  const timeMinutes = Number.isFinite(input.timeMinutes) ? Number(input.timeMinutes) : 720;
  const wrappedTime = ((timeMinutes % 1440) + 1440) % 1440;
  const daylight = Math.max(0.12, Math.min(1, 1 - Math.abs(wrappedTime - 720) / 720));
  const evening = Math.max(0, Math.min(1, (wrappedTime - 960) / 300));
  return {
    season: input.season ?? 'spring',
    weather: input.weather ?? 'sunny',
    daylight,
    evening,
  };
}

export function deterministicVisualRatio(seed: string, q: number, r: number, salt = ''): number {
  let hash = 2166136261;
  const value = `${seed}:${q}:${r}:${salt}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
