import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { redis } from '@/lib/redis';
import { filterWorldPresencesByInterest, getActiveWorldEventForUser, getActiveWorldGuildForUser, getActiveWorldPartyForUser, getWorldPresences, presenceIndexKey, presenceUserKey, PRESENCE_ACTIVE_MS, PRESENCE_TTL_SECONDS, publishWorldUpdate } from '@/lib/world-state';
import { normalizeWorldEquipment } from '@/lib/world-inventory-catalog';
import { cleanWorldMapKey, withWorldLocationMapEntry } from '@/lib/world-location';
import type { CharacterAppearance, CharacterEquipment, WorldAchievementBadge, WorldPresence, WorldPresenceIntent, WorldPresenceIntentKind, WorldPresenceVector } from '@/types';

type PresenceBody = {
  name?: string;
  avatar?: string;
  position?: Partial<WorldPresenceVector>;
  velocity?: Partial<WorldPresenceVector>;
  heading?: number;
  moving?: boolean;
  animation?: string;
  activity?: string;
  status?: string;
  guild?: string;
  guildId?: string;
  party?: string;
  eventId?: string;
  eventName?: string;
  title?: string;
  emote?: string;
  modelUrl?: string | null;
  appearance?: Partial<CharacterAppearance>;
  equipment?: CharacterEquipment;
  cosmetics?: Record<string, unknown>;
  achievements?: WorldAchievementBadge[];
  voiceRoomId?: string;
  voiceRoomName?: string;
  isVoiceMuted?: boolean;
  intent?: Partial<WorldPresenceIntent>;
  currentLandId?: string;
  currentZone?: string;
};

const DEFAULT_APPEARANCE: CharacterAppearance = {
  bodyColor: '#b45309',
  trimColor: '#fde68a',
  hairColor: '#3f2b1f',
  skinColor: '#f5d0b6',
};

const LOCATION_PERSIST_THROTTLE_SECONDS = 8;

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const cleanText = (value: unknown, fallback: string, maxLength = 80) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
};

const cleanOptionalText = (value: unknown, maxLength = 80) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const cleanColor = (value: unknown, fallback: string) => (
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback
);

const parseOptionalNumber = (value: string | null, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
};

const WORLD_INTENT_ICONS: Record<WorldPresenceIntentKind, string> = {
  explore: 'fa-compass',
  walk_to: 'fa-location-crosshairs',
  follow: 'fa-route',
  chat: 'fa-comment',
  voice: 'fa-microphone',
  party: 'fa-users',
  guild: 'fa-shield-heart',
  event: 'fa-star',
  trade: 'fa-handshake',
  create: 'fa-pen-nib',
  inspect: 'fa-magnifying-glass',
};

const WORLD_INTENT_KINDS = new Set<WorldPresenceIntentKind>(Object.keys(WORLD_INTENT_ICONS) as WorldPresenceIntentKind[]);

function normalizeAppearance(value: unknown): CharacterAppearance {
  const input = value && typeof value === 'object' ? value as Partial<CharacterAppearance> : {};
  return {
    bodyColor: cleanColor(input.bodyColor, DEFAULT_APPEARANCE.bodyColor),
    trimColor: cleanColor(input.trimColor, DEFAULT_APPEARANCE.trimColor),
    hairColor: cleanColor(input.hairColor, DEFAULT_APPEARANCE.hairColor),
    skinColor: cleanColor(input.skinColor, DEFAULT_APPEARANCE.skinColor),
  };
}

function normalizeAchievements(value: unknown): WorldAchievementBadge[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const badge = entry as Partial<WorldAchievementBadge>;
      if (typeof badge.achievementKey !== 'string' || typeof badge.name !== 'string') return null;
      return {
        achievementKey: cleanText(badge.achievementKey, '', 80),
        name: cleanText(badge.name, '', 80),
        icon: cleanText(badge.icon, 'fa-award', 40),
        rarity: badge.rarity === 'rare' || badge.rarity === 'keepsake' ? badge.rarity : 'common',
        ...(typeof badge.titleReward === 'string' ? { titleReward: cleanText(badge.titleReward, '', 80) } : {}),
      };
    })
    .filter((badge): badge is WorldAchievementBadge => Boolean(badge?.achievementKey && badge.name))
    .slice(0, 4);
}

function normalizeCosmetics(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => (
        key.length <= 32 &&
        typeof entry === 'string' &&
        entry.length <= 48 &&
        /^[a-z0-9_-]+$/i.test(entry)
      ))
      .slice(0, 8)
  );
}

function normalizeIntentTargetPosition(value: unknown): WorldPresenceVector | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Partial<WorldPresenceVector>;
  return {
    x: clampNumber(input.x, -28, 28, 0),
    y: clampNumber(input.y, -3, 6, 0),
    z: clampNumber(input.z, -28, 28, 0),
  };
}

function normalizeMovementVector(value: unknown): WorldPresenceVector {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<WorldPresenceVector>
    : {};
  return {
    x: clampNumber(input.x, -8, 8, 0),
    y: clampNumber(input.y, -4, 4, 0),
    z: clampNumber(input.z, -8, 8, 0),
  };
}

function normalizePresenceIntent(value: unknown, now: number): WorldPresenceIntent | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Partial<WorldPresenceIntent>;
  const kind = typeof input.kind === 'string' && WORLD_INTENT_KINDS.has(input.kind as WorldPresenceIntentKind)
    ? input.kind as WorldPresenceIntentKind
    : undefined;
  if (!kind) return undefined;

  const label = cleanOptionalText(input.label, 64);
  if (!label) return undefined;
  const detail = cleanOptionalText(input.detail, 96);
  const targetUserId = cleanOptionalText(input.targetUserId, 120);
  const targetName = cleanOptionalText(input.targetName, 64);
  const zone = cleanOptionalText(input.zone, 64);
  const targetPosition = normalizeIntentTargetPosition(input.targetPosition);

  return {
    kind,
    label,
    ...(detail ? { detail } : {}),
    icon: cleanOptionalText(input.icon, 40) || WORLD_INTENT_ICONS[kind],
    ...(targetUserId ? { targetUserId } : {}),
    ...(targetName ? { targetName } : {}),
    ...(targetPosition ? { targetPosition } : {}),
    ...(zone ? { zone } : {}),
    updatedAt: cleanOptionalText(input.updatedAt, 40) || new Date(now).toISOString(),
  };
}

function toInputJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function locationPersistKey(configId: string, userId: string, mapKey: string) {
  return `world:location-persist:${configId}:${userId}:${mapKey || 'global'}`;
}

async function getPartnerProfile(configId: string, userId: string) {
  return prisma.partner.findFirst({
    where: {
      configId,
      OR: [
        { id: userId },
        { userId },
        { partnerId: userId },
      ],
    },
    select: { name: true, avatar: true },
  });
}

async function getCharacterProfile(configId: string, userId: string) {
  return prisma.characterProfile.findUnique({
    where: { configId_userId: { configId, userId } },
    select: {
      displayName: true,
      title: true,
      status: true,
      activity: true,
      emote: true,
      modelUrl: true,
      appearance: true,
      equipment: true,
      cosmetics: true,
    },
  });
}

async function persistCharacterLocation(configId: string, userId: string, presence: WorldPresence) {
  try {
    const mapKey = cleanWorldMapKey(presence.currentLandId);
    const persistKey = locationPersistKey(configId, userId, mapKey);
    const recentlyPersisted = await redis.get(persistKey);
    if (recentlyPersisted) return;

    await redis.setex(persistKey, LOCATION_PERSIST_THROTTLE_SECONDS, '1');
    const existing = await prisma.characterProfile.findUnique({
      where: { configId_userId: { configId, userId } },
      select: { lastMapPositions: true },
    });
    const nextMapPositions = mapKey
      ? withWorldLocationMapEntry(existing?.lastMapPositions, mapKey, presence.position, presence.currentZone)
      : undefined;

    await prisma.characterProfile.upsert({
      where: { configId_userId: { configId, userId } },
      create: {
        configId,
        userId,
        displayName: presence.name,
        lastPosition: toInputJson(presence.position),
        lastZone: presence.currentZone,
        ...(nextMapPositions ? { lastMapPositions: toInputJson(nextMapPositions) } : {}),
      },
      update: {
        lastPosition: toInputJson(presence.position),
        lastZone: presence.currentZone,
        ...(nextMapPositions ? { lastMapPositions: toInputJson(nextMapPositions) } : {}),
      },
    });
  } catch (err) {
    console.warn('Character location persist failed:', err);
  }
}

async function leaveActiveVoiceRooms(configId: string, userId: string) {
  const activeMemberships = await prisma.worldVoiceMember.findMany({
    where: {
      userId,
      status: 'active',
      room: {
        configId,
        status: 'active',
      },
    },
    select: { roomId: true },
  });
  const roomIds = Array.from(new Set(activeMemberships.map(member => member.roomId)));
  if (roomIds.length === 0) return roomIds;

  await prisma.worldVoiceMember.updateMany({
    where: {
      userId,
      status: 'active',
      roomId: { in: roomIds },
      room: { configId },
    },
    data: {
      status: 'left',
      lastSeen: new Date(),
    },
  });

  const emptyRoomIds = (
    await Promise.all(roomIds.map(async (roomId) => {
      const activeCount = await prisma.worldVoiceMember.count({
        where: { roomId, status: 'active' },
      });
      return activeCount === 0 ? roomId : null;
    }))
  ).filter((roomId): roomId is string => Boolean(roomId));

  if (emptyRoomIds.length > 0) {
    await prisma.worldVoiceRoom.updateMany({
      where: {
        id: { in: emptyRoomIds },
        configId,
        status: 'active',
      },
      data: { status: 'idle' },
    });
  }

  return roomIds;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const currentLandId = cleanWorldMapKey(searchParams.get('currentLandId'));
    const currentZone = searchParams.get('currentZone')?.trim().slice(0, 64) || undefined;
    const x = parseOptionalNumber(searchParams.get('x'), -28, 28);
    const z = parseOptionalNumber(searchParams.get('z'), -28, 28);
    const radius = parseOptionalNumber(searchParams.get('radius'), 4, 64);
    const allPresences = await getWorldPresences(access.configId, 48);
    const presences = filterWorldPresencesByInterest(allPresences, {
      currentLandId,
      currentZone,
      center: x !== undefined && z !== undefined ? { x, y: 0, z } : undefined,
      radius,
      viewerUserId: access.userId,
    });

    return NextResponse.json({
      presences,
      interest: {
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
        ...(x !== undefined && z !== undefined ? { center: { x, y: 0, z } } : {}),
        ...(radius ? { radius } : {}),
        totalOnline: allPresences.length,
        visibleOnline: presences.length,
      },
    });
  } catch (err: unknown) {
    console.error('GET /api/presence error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as PresenceBody;
    const currentLandId = cleanWorldMapKey(body.currentLandId);
    const [partner, character, party, event, guild] = await Promise.all([
      getPartnerProfile(access.configId, access.userId),
      getCharacterProfile(access.configId, access.userId),
      getActiveWorldPartyForUser(access.configId, access.userId, { currentLandId }),
      getActiveWorldEventForUser(access.configId, access.userId, { currentLandId }),
      getActiveWorldGuildForUser(access.configId, access.userId, { currentLandId }),
    ]);
    const position = body.position || {};
    const now = Date.now();
    const appearance = normalizeAppearance(body.appearance || character?.appearance);
    const equipment = normalizeWorldEquipment(body.equipment || character?.equipment);
    const cosmetics = normalizeCosmetics(body.cosmetics || character?.cosmetics);
    const intent = normalizePresenceIntent(body.intent, now);
    const animation = cleanText(body.animation, 'idle', 32);
    const velocity = normalizeMovementVector(body.velocity);
    const moving = body.moving === undefined
      ? animation === 'walk' || Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) > 0.08
      : Boolean(body.moving);

    const presence: WorldPresence = {
      userId: access.userId,
      name: cleanText(body.name, character?.displayName || partner?.name || 'Explorer', 48),
      avatar: cleanText(body.avatar, partner?.avatar || '', 240),
      position: {
        x: clampNumber(position.x, -28, 28, 0),
        y: clampNumber(position.y, -3, 6, 0),
        z: clampNumber(position.z, -28, 28, 0),
      },
      velocity,
      heading: clampNumber(body.heading, -Math.PI, Math.PI, 0),
      moving,
      animation,
      activity: cleanText(body.activity, character?.activity || 'Exploring', 56),
      status: cleanText(body.status, character?.status || 'online', 32),
      currentZone: cleanText(body.currentZone, 'Narinyland Commons', 56),
      lastSeen: new Date(now).toISOString(),
      ...(currentLandId ? { currentLandId } : {}),
      ...(guild?.name || body.guild ? { guild: cleanText(guild?.name || body.guild, '', 48) } : {}),
      ...(guild?.id || body.guildId ? { guildId: cleanText(guild?.id || body.guildId, '', 120) } : {}),
      ...(party?.name || body.party ? { party: cleanText(party?.name || body.party, '', 48) } : {}),
      ...(party?.id ? { partyId: party.id } : {}),
      ...(event?.title || body.eventName ? { eventName: cleanText(event?.title || body.eventName, '', 80) } : {}),
      ...(event?.id || body.eventId ? { eventId: cleanText(event?.id || body.eventId, '', 120) } : {}),
      title: cleanText(body.title, character?.title || 'Explorer', 48),
      emote: cleanText(body.emote, character?.emote || 'idle', 32),
      modelUrl: body.modelUrl !== undefined ? body.modelUrl : character?.modelUrl || null,
      appearance,
      equipment,
      cosmetics,
      achievements: normalizeAchievements(body.achievements),
      ...(body.voiceRoomId ? { voiceRoomId: cleanText(body.voiceRoomId, '', 120) } : {}),
      ...(body.voiceRoomName ? { voiceRoomName: cleanText(body.voiceRoomName, '', 80) } : {}),
      ...(body.voiceRoomId ? { isVoiceMuted: Boolean(body.isVoiceMuted) } : {}),
      ...(intent ? { intent } : {}),
    };

    await Promise.all([
      redis.setex(presenceUserKey(access.configId, access.userId), PRESENCE_TTL_SECONDS, JSON.stringify(presence)),
      redis.zadd(presenceIndexKey(access.configId), now, access.userId),
      redis.zremrangebyscore(presenceIndexKey(access.configId), 0, now - PRESENCE_ACTIVE_MS),
      persistCharacterLocation(access.configId, access.userId, presence),
    ]);
    await publishWorldUpdate(access.configId, 'presence', {
      userId: access.userId,
      currentLandId: presence.currentLandId,
      currentZone: presence.currentZone,
      animation: presence.animation,
      status: presence.status,
      moving: presence.moving,
      intentKind: presence.intent?.kind,
      intentLabel: presence.intent?.label,
    });

    return NextResponse.json({ presence });
  } catch (err: unknown) {
    console.error('POST /api/presence error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const currentLandId = cleanWorldMapKey(searchParams.get('currentLandId'));
    const currentZone = searchParams.get('currentZone')?.trim().slice(0, 80) || undefined;
    const voiceRoomIds = await leaveActiveVoiceRooms(access.configId, access.userId);
    await Promise.all([
      redis.del(presenceUserKey(access.configId, access.userId)),
      redis.zrem(presenceIndexKey(access.configId), access.userId),
    ]);
    await publishWorldUpdate(access.configId, 'presence', {
      userId: access.userId,
      currentLandId,
      currentZone,
      status: 'offline',
    });
    if (voiceRoomIds.length > 0) {
      await publishWorldUpdate(access.configId, 'voice', {
        userId: access.userId,
        roomIds: voiceRoomIds.join(','),
        action: 'leave',
      });
    }

    return NextResponse.json({ success: true, voiceRoomIds });
  } catch (err: unknown) {
    console.error('DELETE /api/presence error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
