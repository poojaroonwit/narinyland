import type { CharacterMapPosition, CharacterMapPositions, WorldPresenceVector } from '@/types';

export const DEFAULT_WORLD_POSITION: WorldPresenceVector = { x: -3.5, y: 0, z: 5 };

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

export function normalizeWorldPosition(value: unknown, fallback: WorldPresenceVector = DEFAULT_WORLD_POSITION): WorldPresenceVector {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<WorldPresenceVector>
    : {};
  return {
    x: clampNumber(input.x, -28, 28, fallback.x),
    y: clampNumber(input.y, -3, 6, fallback.y),
    z: clampNumber(input.z, -28, 28, fallback.z),
  };
}

export function cleanWorldMapKey(value: unknown) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return '';
  return /^[A-Za-z0-9_.:-]+$/.test(trimmed) ? trimmed : '';
}

export function normalizeWorldLocationMap(value: unknown): CharacterMapPositions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entry]): [string, CharacterMapPosition] | null => {
        const cleanKey = cleanWorldMapKey(key);
        if (!cleanKey || !entry || typeof entry !== 'object' || Array.isArray(entry)) return null;

        const record = entry as Partial<CharacterMapPosition>;
        return [cleanKey, {
          position: normalizeWorldPosition(record.position),
          zone: cleanText(record.zone, 'Narinyland Commons', 80),
          ...(typeof record.updatedAt === 'string' ? { updatedAt: record.updatedAt.slice(0, 40) } : {}),
        }];
      })
      .filter((entry): entry is [string, CharacterMapPosition] => Boolean(entry))
      .slice(-24)
  );
}

export function withWorldLocationMapEntry(
  value: unknown,
  mapKey: string,
  position: WorldPresenceVector,
  zone: string,
  updatedAt = new Date().toISOString()
): CharacterMapPositions {
  const cleanKey = cleanWorldMapKey(mapKey);
  const map = normalizeWorldLocationMap(value);
  if (!cleanKey) return map;

  return normalizeWorldLocationMap({
    ...map,
    [cleanKey]: {
      position: normalizeWorldPosition(position),
      zone: cleanText(zone, 'Narinyland Commons', 80),
      updatedAt,
    },
  });
}
