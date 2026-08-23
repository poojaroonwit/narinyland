import type { FarmSeason, FarmWeather } from './family-farm-progression';

export type HomesteadEventKind = 'daily' | 'milestone' | 'seasonal';
export type HomesteadEventResourceKey = 'berries' | 'wood' | 'milk' | 'wool';

export type HomesteadEventReward = {
  hearts?: number;
  coins?: number;
  energy?: number;
  resources?: Partial<Record<HomesteadEventResourceKey, number>>;
};

export type HomesteadEventChoice = {
  key: string;
  label: string;
  reward: HomesteadEventReward;
};

export type HomesteadEventDefinition = {
  key: string;
  kind: HomesteadEventKind;
  title: string;
  description: string;
  choices: HomesteadEventChoice[];
};

export type HomesteadCurrentEvent = {
  day: number;
  key: string;
  kind: HomesteadEventKind;
  resolved: boolean;
  choiceKey: string | null;
};

export type HomesteadEventState = {
  current: HomesteadCurrentEvent | null;
  resolvedDailyDays: number[];
  seasonalOccurrences: Record<string, true>;
};

export type DeterministicEventInput = {
  day: number;
  season: FarmSeason;
  weather: FarmWeather;
  hasPet: boolean;
  hasChild: boolean;
  growingTogetherEligible: boolean;
  resolvedDailyDays: number[];
  seasonalOccurrences: Record<string, true>;
};

const PRIMARY = 'primary';

const EVENT_CATALOG: Record<string, HomesteadEventDefinition> = {
  partner_breakfast: {
    key: 'partner_breakfast',
    kind: 'daily',
    title: 'Breakfast Together',
    description: 'Your partner made a warm breakfast before the chores begin.',
    choices: [{ key: PRIMARY, label: 'Share breakfast', reward: { hearts: 1, energy: 2 } }],
  },
  berry_surprise: {
    key: 'berry_surprise',
    kind: 'daily',
    title: 'Berry Surprise',
    description: 'A small patch of wild berries ripened beside the island path.',
    choices: [{ key: PRIMARY, label: 'Gather them together', reward: { resources: { berries: 2 } } }],
  },
  rainy_afternoon: {
    key: 'rainy_afternoon',
    kind: 'daily',
    title: 'Rainy Afternoon',
    description: 'Rain taps softly on the roof and slows the homestead down.',
    choices: [{ key: PRIMARY, label: 'Stay cozy together', reward: { hearts: 2 } }],
  },
  pond_morning: {
    key: 'pond_morning',
    kind: 'daily',
    title: 'Quiet Pond Morning',
    description: 'The pond is glassy and calm before the day gets busy.',
    choices: [{ key: PRIMARY, label: 'Enjoy the view', reward: { hearts: 1, energy: 1 } }],
  },
  pet_discovery: {
    key: 'pet_discovery',
    kind: 'daily',
    title: 'A Tiny Discovery',
    description: 'Your pet proudly brings back something useful from near Home.',
    choices: [{ key: PRIMARY, label: 'Praise your pet', reward: { hearts: 1, resources: { wood: 1 } } }],
  },
  child_helps: {
    key: 'child_helps',
    kind: 'daily',
    title: 'Little Helper',
    description: 'Your child wants to help with one small homestead chore.',
    choices: [{ key: PRIMARY, label: 'Work together', reward: { hearts: 2 } }],
  },
  growing_together: {
    key: 'growing_together',
    kind: 'milestone',
    title: 'Growing Together',
    description: 'The home feels ready for a new chapter in your family story.',
    choices: [{ key: PRIMARY, label: 'Welcome the next chapter', reward: { hearts: 5 } }],
  },
  spring_picnic: {
    key: 'spring_picnic',
    kind: 'seasonal',
    title: 'Spring Picnic',
    description: 'The family lays out a picnic among the new blossoms.',
    choices: [{ key: PRIMARY, label: 'Celebrate Spring', reward: { hearts: 5, coins: 40 } }],
  },
  summer_pond_day: {
    key: 'summer_pond_day',
    kind: 'seasonal',
    title: 'Summer Pond Day',
    description: 'A bright afternoon by the pond becomes the season’s favorite memory.',
    choices: [{ key: PRIMARY, label: 'Spend the day together', reward: { hearts: 5, coins: 45 } }],
  },
  autumn_harvest_fair: {
    key: 'autumn_harvest_fair',
    kind: 'seasonal',
    title: 'Autumn Harvest Fair',
    description: 'The homestead celebrates everything the family grew this season.',
    choices: [{ key: PRIMARY, label: 'Celebrate the harvest', reward: { hearts: 5, coins: 55 } }],
  },
  winter_family_dinner: {
    key: 'winter_family_dinner',
    kind: 'seasonal',
    title: 'Winter Family Dinner',
    description: 'Everyone gathers close for a warm dinner at the end of the year.',
    choices: [{ key: PRIMARY, label: 'Share the dinner', reward: { hearts: 6, coins: 50 } }],
  },
};

const DAILY_EVENT_KEYS = [
  'partner_breakfast',
  'berry_surprise',
  'rainy_afternoon',
  'pond_morning',
  'pet_discovery',
  'child_helps',
] as const;

const SEASONAL_EVENT_KEYS: Record<FarmSeason, string> = {
  spring: 'spring_picnic',
  summer: 'summer_pond_day',
  autumn: 'autumn_harvest_fair',
  winter: 'winter_family_dinner',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isEventKind(value: unknown): value is HomesteadEventKind {
  return value === 'daily' || value === 'milestone' || value === 'seasonal';
}

function safeDay(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(1, Math.floor(value));
}

export function createInitialHomesteadEventState(): HomesteadEventState {
  return { current: null, resolvedDailyDays: [], seasonalOccurrences: {} };
}

export function normalizeHomesteadEventState(raw: unknown): HomesteadEventState {
  const source = asRecord(raw);
  const currentRaw = asRecord(source.current);
  const currentDay = safeDay(currentRaw.day);
  const currentKey = typeof currentRaw.key === 'string' && EVENT_CATALOG[currentRaw.key] ? currentRaw.key : null;
  const currentKind = isEventKind(currentRaw.kind) ? currentRaw.kind : null;
  const resolvedDailyDays = Array.isArray(source.resolvedDailyDays)
    ? [...new Set(source.resolvedDailyDays.map(safeDay).filter((day): day is number => day !== null))].sort((a, b) => a - b)
    : [];
  const seasonalRaw = asRecord(source.seasonalOccurrences);
  const seasonalOccurrences = Object.entries(seasonalRaw).reduce<Record<string, true>>((result, [key, value]) => {
    if (value === true) result[key] = true;
    return result;
  }, {});

  return {
    current: currentDay && currentKey && currentKind
      ? {
          day: currentDay,
          key: currentKey,
          kind: currentKind,
          resolved: currentRaw.resolved === true,
          choiceKey: typeof currentRaw.choiceKey === 'string' ? currentRaw.choiceKey : null,
        }
      : null,
    resolvedDailyDays,
    seasonalOccurrences,
  };
}

export function getHomesteadEventDefinition(key: string): HomesteadEventDefinition | null {
  return EVENT_CATALOG[key] ?? null;
}

export function seasonalOccurrenceKey(day: number, season: FarmSeason): string {
  const safe = Math.max(1, Math.floor(Number.isFinite(day) ? day : 1));
  const year = Math.floor((safe - 1) / 28) + 1;
  return `${year}:${season}`;
}

function isSeasonEventDay(day: number): boolean {
  const safe = Math.max(1, Math.floor(Number.isFinite(day) ? day : 1));
  return ((safe - 1) % 7) + 1 === 7;
}

function deterministicDailyKeys(input: DeterministicEventInput): string[] {
  return DAILY_EVENT_KEYS.filter((key) => {
    if (key === 'rainy_afternoon') return input.weather === 'rainy';
    if (key === 'pet_discovery') return input.hasPet;
    if (key === 'child_helps') return input.hasChild;
    return true;
  });
}

export function selectHomesteadEvent(input: DeterministicEventInput): HomesteadEventDefinition | null {
  if (input.growingTogetherEligible) return EVENT_CATALOG.growing_together;

  const occurrence = seasonalOccurrenceKey(input.day, input.season);
  if (isSeasonEventDay(input.day) && !input.seasonalOccurrences[occurrence]) {
    return EVENT_CATALOG[SEASONAL_EVENT_KEYS[input.season]];
  }

  if (input.resolvedDailyDays.includes(input.day)) return null;
  const eligible = deterministicDailyKeys(input);
  if (eligible.length === 0) return null;
  const seasonOffset: Record<FarmSeason, number> = { spring: 3, summer: 7, autumn: 11, winter: 17 };
  const weatherOffset: Record<FarmWeather, number> = { sunny: 2, cloudy: 5, rainy: 13, breezy: 19 };
  const index = Math.abs(input.day * 31 + seasonOffset[input.season] + weatherOffset[input.weather]) % eligible.length;
  return EVENT_CATALOG[eligible[index]];
}

export function createCurrentHomesteadEvent(day: number, definition: HomesteadEventDefinition): HomesteadCurrentEvent {
  return { day, key: definition.key, kind: definition.kind, resolved: false, choiceKey: null };
}
