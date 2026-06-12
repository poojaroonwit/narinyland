import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { DEFAULT_WORLD_EQUIPMENT, normalizeWorldEquipment } from '@/lib/world-inventory-catalog';
import { DEFAULT_WORLD_POSITION, normalizeWorldLocationMap, normalizeWorldPosition } from '@/lib/world-location';
import type { CharacterAppearance, CharacterEquipment, CharacterMapPositions, CharacterProfile, WorldPresenceVector } from '@/types';

type CharacterBody = {
  displayName?: string;
  title?: string;
  status?: string;
  activity?: string;
  emote?: string;
  modelUrl?: string | null;
  appearance?: Partial<CharacterAppearance>;
  equipment?: CharacterEquipment;
  cosmetics?: Record<string, unknown>;
  lastPosition?: Partial<WorldPresenceVector> | null;
  lastZone?: string | null;
  lastMapPositions?: CharacterMapPositions;
};

const DEFAULT_APPEARANCE: CharacterAppearance = {
  bodyColor: '#b45309',
  trimColor: '#fde68a',
  hairColor: '#3f2b1f',
  skinColor: '#f5d0b6',
};

const ALLOWED_STATUSES = new Set(['online', 'exploring', 'working', 'creating', 'chatting', 'trading', 'event', 'afk']);
const ALLOWED_EMOTES = new Set(['idle', 'wave', 'heart', 'dance', 'sit']);
const DEFAULT_LAST_POSITION: WorldPresenceVector = DEFAULT_WORLD_POSITION;

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function cleanUrl(value: unknown) {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//.test(trimmed) && !trimmed.startsWith('/')) return undefined;
  return trimmed.slice(0, 500);
}

function cleanColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function normalizeAppearance(value: unknown): CharacterAppearance {
  const input = value && typeof value === 'object' ? value as Partial<CharacterAppearance> : {};
  return {
    bodyColor: cleanColor(input.bodyColor, DEFAULT_APPEARANCE.bodyColor),
    trimColor: cleanColor(input.trimColor, DEFAULT_APPEARANCE.trimColor),
    hairColor: cleanColor(input.hairColor, DEFAULT_APPEARANCE.hairColor),
    skinColor: cleanColor(input.skinColor, DEFAULT_APPEARANCE.skinColor),
  };
}

function normalizeCosmetics(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => key.length <= 40 && ['string', 'number', 'boolean'].includes(typeof entry))
      .slice(0, 12)
  );
}

function normalizePosition(value: unknown, fallback: WorldPresenceVector = DEFAULT_LAST_POSITION): WorldPresenceVector {
  return normalizeWorldPosition(value, fallback);
}

function toInputJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function toCharacterProfile(profile: {
  userId: string;
  configId: string;
  displayName: string;
  title: string;
  status: string;
  activity: string;
  emote: string;
  modelUrl: string | null;
  appearance: Prisma.JsonValue;
  equipment: Prisma.JsonValue;
  cosmetics: Prisma.JsonValue;
  lastPosition: Prisma.JsonValue;
  lastZone: string;
  lastMapPositions: Prisma.JsonValue;
  updatedAt: Date;
}): CharacterProfile {
  return {
    userId: profile.userId,
    configId: profile.configId,
    displayName: profile.displayName,
    title: profile.title,
    status: profile.status,
    activity: profile.activity,
    emote: profile.emote,
    modelUrl: profile.modelUrl,
    appearance: normalizeAppearance(profile.appearance),
    equipment: normalizeWorldEquipment(profile.equipment),
    cosmetics: normalizeCosmetics(profile.cosmetics),
    lastPosition: normalizePosition(profile.lastPosition),
    lastZone: profile.lastZone,
    lastMapPositions: normalizeWorldLocationMap(profile.lastMapPositions),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

async function getPartnerDefaults(configId: string, userId: string) {
  return prisma.partner.findFirst({
    where: {
      configId,
      OR: [
        { id: userId },
        { userId },
        { partnerId: userId },
      ],
    },
    select: { name: true },
  });
}

async function ensureProfile(configId: string, userId: string) {
  await prisma.appConfig.upsert({
    where: { id: configId },
    create: { id: configId },
    update: {},
  });

  const partner = await getPartnerDefaults(configId, userId);

  return prisma.characterProfile.upsert({
    where: { configId_userId: { configId, userId } },
    create: {
      configId,
      userId,
      displayName: partner?.name || 'Explorer',
      appearance: toInputJson(DEFAULT_APPEARANCE),
      equipment: toInputJson(DEFAULT_WORLD_EQUIPMENT),
      cosmetics: toInputJson({}),
      lastPosition: toInputJson(DEFAULT_LAST_POSITION),
      lastZone: 'Narinyland Commons',
      lastMapPositions: toInputJson({}),
    },
    update: {},
  });
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const profile = await ensureProfile(access.configId, access.userId);
    return NextResponse.json({ profile: toCharacterProfile(profile) });
  } catch (err: unknown) {
    console.error('GET /api/character error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as CharacterBody;
    const existing = await ensureProfile(access.configId, access.userId);
    const status = ALLOWED_STATUSES.has(body.status || '') ? body.status! : existing.status;
    const emote = ALLOWED_EMOTES.has(body.emote || '') ? body.emote! : existing.emote;
    const modelUrl = cleanUrl(body.modelUrl);

    const profile = await prisma.characterProfile.update({
      where: { configId_userId: { configId: access.configId, userId: access.userId } },
      data: {
        displayName: cleanText(body.displayName, existing.displayName, 48),
        title: cleanText(body.title, existing.title, 48),
        status,
        activity: cleanText(body.activity, existing.activity, 56),
        emote,
        ...(modelUrl !== undefined ? { modelUrl } : {}),
        appearance: toInputJson(normalizeAppearance(body.appearance || existing.appearance)),
        equipment: toInputJson(normalizeWorldEquipment(body.equipment || existing.equipment)),
        cosmetics: toInputJson(normalizeCosmetics(body.cosmetics || existing.cosmetics)),
        ...(body.lastPosition ? { lastPosition: toInputJson(normalizePosition(body.lastPosition, normalizePosition(existing.lastPosition))) } : {}),
        ...(body.lastZone ? { lastZone: cleanText(body.lastZone, existing.lastZone, 56) } : {}),
        ...(body.lastMapPositions ? { lastMapPositions: toInputJson(normalizeWorldLocationMap(body.lastMapPositions)) } : {}),
      },
    });

    return NextResponse.json({ profile: toCharacterProfile(profile) });
  } catch (err: unknown) {
    console.error('PUT /api/character error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
