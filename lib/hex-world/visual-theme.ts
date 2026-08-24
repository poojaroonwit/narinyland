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
    grass: { base: '#718a58', dark: '#536a43', accent: '#8d9f6b', roughness: 0.96 },
    soil: { base: '#806047', dark: '#5f4536', accent: '#9b7757', roughness: 0.98 },
    stone: { base: '#85857c', dark: '#5f625c', accent: '#a09e92', roughness: 1 },
    water: { base: '#4f9696', dark: '#356f77', accent: '#87bab4', roughness: 0.4 },
    pathDirt: '#8a7158',
    cliffRock: '#62645d',
    dampBank: '#66705f',
  },
  structures: {
    cream: '#d9cfba',
    warmCream: '#cfc2a8',
    wood: '#6e503b',
    darkWood: '#4b382c',
    trim: '#b8a58a',
    roof: '#765447',
    barn: '#8a5146',
    workshopRoof: '#586b5d',
    stoneBase: '#77766f',
    window: '#9eb3b1',
    windowGlow: '#d9aa70',
    glass: '#77989d',
    metal: '#687177',
  },
  vegetation: {
    trunk: '#654a35',
    trunkDark: '#493426',
    leaf: '#627b4c',
    leafLight: '#78915a',
    leafDark: '#4b633e',
    grass: '#607947',
    flower: ['#b66f7f', '#c9975d', '#8879a0', '#c8a873'],
  },
  water: {
    deep: '#315f69',
    surface: '#4d8e8d',
    shallow: '#73a9a0',
    highlight: '#d2e4df',
    bank: '#697564',
  },
  atmosphere: {
    day: '#cfdcdf',
    evening: '#d7cbbd',
    rain: '#b9c8cb',
    cloudy: '#c5d0d0',
    breezy: '#cad9d3',
    spring: '#d1ddd5',
    summer: '#d9dcc9',
    autumn: '#d7ccb9',
    winter: '#ced8db',
    fog: '#cad8da',
    sunDay: '#f4ead5',
    horizonHaze: '#b9c8c7',
  },
  explore: {
    character: {
      skin: '#e7b58a',
      hair: '#4e3d34',
      hairLight: '#675044',
      tunic: '#4f806c',
      tunicLight: '#6a9b82',
      shirt: '#f0e1c7',
      trousers: '#5b5650',
      leather: '#76513a',
      leatherDark: '#513a2e',
      scarf: '#557c86',
      metal: '#b99a69',
    },
    ground: {
      turfLight: '#8fa36f',
      turfDark: '#647b50',
      packedEarth: '#8c6b52',
      pathLight: '#a99f8d',
    },
    props: {
      lantern: '#d7b172',
      planter: '#8f6048',
      barrel: '#72523f',
      rope: '#aa8e67',
    },
    atmosphere: {
      fogDay: '#c9d7da',
      fogEvening: '#d3c8bd',
      distantRock: '#707f79',
      distantGrass: '#738764',
      cloud: '#ecece6',
    },
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
