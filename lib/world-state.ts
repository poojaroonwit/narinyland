import type { Prisma, WorldChatMessage as PrismaWorldChatMessage, WorldInventoryItem as PrismaWorldInventoryItem, WorldRelationship as PrismaWorldRelationship, WorldSocialAction as PrismaWorldSocialAction } from '@prisma/client';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getStats } from '@/lib/stats-service';
import { getWorldAchievements } from '@/lib/world-achievements';
import { cleanWorldInventoryRarity, DEFAULT_WORLD_EQUIPMENT, normalizeWorldEquipment, WORLD_EQUIPMENT_ITEMS } from '@/lib/world-inventory-catalog';
import type { CharacterEquipment, WorldActionType, WorldChatChannel, WorldChatMessage, WorldEvent, WorldGuild, WorldInventoryCatalogItem, WorldInventoryItem, WorldParty, WorldPresence, WorldPresenceVector, WorldRelationship, WorldRelationshipStatus, WorldRelationshipType, WorldSnapshot, WorldSocialAction, WorldVoiceKind, WorldVoiceRoom } from '@/types';

export const PRESENCE_TTL_SECONDS = 35;
export const PRESENCE_ACTIVE_MS = PRESENCE_TTL_SECONDS * 1000;
const DEFAULT_WORLD_LIMIT = 22;
const DEFAULT_ACTION_LIMIT = 12;
const DEFAULT_CHAT_LIMIT = 18;
const WORLD_CHAT_CHANNELS = new Set<WorldChatChannel>(['world', 'direct', 'party', 'guild']);
const WORLD_RELATIONSHIP_TYPES = new Set<WorldRelationshipType>(['follow', 'friend']);
const WORLD_RELATIONSHIP_STATUSES = new Set<WorldRelationshipStatus>(['active', 'pending', 'accepted', 'removed']);
const WORLD_VOICE_KINDS = new Set<WorldVoiceKind>(['proximity', 'party', 'guild', 'direct']);
const WORLD_REQUEST_TYPES = new Set<WorldActionType>(['voice_call', 'invite_party', 'invite_guild', 'trade', 'collaborate']);
const ACTIVE_REQUEST_STATUSES = ['requested', 'accepted'];

type WorldPresenceInterest = {
  currentLandId?: string;
  currentZone?: string;
  center?: WorldPresenceVector;
  radius?: number;
  viewerUserId?: string;
};

export type WorldActivityInterest = {
  currentLandId?: string;
  currentZone?: string;
  center?: WorldPresenceVector;
  radius?: number;
  viewerUserId?: string;
  visibleUserIds?: Iterable<string>;
};

type WorldSnapshotOptions = {
  presenceLimit?: number;
  actionLimit?: number;
  chatLimit?: number;
  viewerUserId?: string;
  currentLandId?: string;
  currentZone?: string;
  center?: WorldPresenceVector;
  radius?: number;
};

type WorldVoiceInterest = {
  currentLandId?: string;
  currentZone?: string;
  center?: WorldPresenceVector;
  radius?: number;
  viewerUserId?: string;
};

const WORLD_ACTION_TYPES = new Set<WorldActionType>([
  'view_profile',
  'start_chat',
  'voice_call',
  'follow_user',
  'add_friend',
  'invite_party',
  'invite_guild',
  'trade',
  'collaborate',
  'activity_feed',
  'join_activity',
  'npc_interact',
]);

export const presenceIndexKey = (configId: string) => `presence:${configId}:index`;
export const presenceUserKey = (configId: string, userId: string) => `presence:${configId}:user:${userId}`;
export const worldUpdateChannelKey = (configId: string) => `world:${configId}:updates`;

export type WorldUpdateKind =
  | 'presence'
  | 'chat'
  | 'action'
  | 'event'
  | 'party'
  | 'guild'
  | 'request'
  | 'relationship'
  | 'voice'
  | 'inventory'
  | 'achievement';

export async function publishWorldUpdate(
  configId: string,
  kind: WorldUpdateKind,
  metadata: Record<string, string | number | boolean | null | undefined> = {}
) {
  await redis.publish(worldUpdateChannelKey(configId), JSON.stringify({
    kind,
    metadata: Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== undefined)
    ),
    serverTime: new Date().toISOString(),
  }));
}

function normalizeActionType(value: string): WorldActionType {
  return WORLD_ACTION_TYPES.has(value as WorldActionType) ? value as WorldActionType : 'view_profile';
}

function normalizeChatChannel(value: string): WorldChatChannel {
  return WORLD_CHAT_CHANNELS.has(value as WorldChatChannel) ? value as WorldChatChannel : 'world';
}

function normalizeRelationshipType(value: string): WorldRelationshipType {
  return WORLD_RELATIONSHIP_TYPES.has(value as WorldRelationshipType) ? value as WorldRelationshipType : 'follow';
}

function normalizeRelationshipStatus(value: string): WorldRelationshipStatus {
  return WORLD_RELATIONSHIP_STATUSES.has(value as WorldRelationshipStatus) ? value as WorldRelationshipStatus : 'active';
}

function normalizeMetadata(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => key.length <= 48 && ['string', 'number', 'boolean'].includes(typeof entry))
      .slice(0, 40)
  );
}

function getMetadataString(value: Prisma.JsonValue, key: string) {
  const metadata = normalizeMetadata(value);
  const entry = metadata[key];
  return typeof entry === 'string' && entry.trim() ? entry.trim() : null;
}

function getMetadataNumber(value: Prisma.JsonValue, key: string) {
  const metadata = normalizeMetadata(value);
  const entry = metadata[key];
  return typeof entry === 'number' && Number.isFinite(entry) ? entry : null;
}

function getRecordString(metadata: Record<string, unknown> | undefined, key: string) {
  const entry = metadata?.[key];
  return typeof entry === 'string' && entry.trim() ? entry.trim() : null;
}

function getRecordNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const entry = metadata?.[key];
  return typeof entry === 'number' && Number.isFinite(entry) ? entry : null;
}

export async function getWorldPresences(configId: string, limit = DEFAULT_WORLD_LIMIT): Promise<WorldPresence[]> {
  const now = Date.now();
  const indexKey = presenceIndexKey(configId);
  await redis.zremrangebyscore(indexKey, 0, now - PRESENCE_ACTIVE_MS);

  const userIds = await redis.zrangebyscore(indexKey, now - PRESENCE_ACTIVE_MS, now);
  const uniqueUserIds = Array.from(new Set(userIds)).slice(-limit);
  const records = uniqueUserIds.length
    ? await redis.mget(...uniqueUserIds.map(userId => presenceUserKey(configId, userId)))
    : [];

  return records
    .map((record) => {
      if (!record) return null;
      try {
        return JSON.parse(record) as WorldPresence;
      } catch {
        return null;
      }
    })
    .filter((presence): presence is WorldPresence => {
      if (!presence?.userId) return false;
      return now - new Date(presence.lastSeen).getTime() <= PRESENCE_ACTIVE_MS;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getPresenceDistance(a: WorldPresenceVector, b: WorldPresenceVector) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function isSameWorldZone(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isSameWorldMap(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function getVisibleUserSet(visibleUserIds?: Iterable<string>) {
  return new Set(Array.from(visibleUserIds || []).filter(Boolean));
}

function getMetadataZone(value: Prisma.JsonValue, keys: string[]) {
  const metadata = normalizeMetadata(value);
  for (const key of keys) {
    const entry = metadata[key];
    if (typeof entry === 'string' && entry.trim()) return entry.trim();
  }
  return null;
}

function isWorldRecordInMapInterest(metadata: Prisma.JsonValue, options: Pick<WorldSnapshotOptions, 'currentLandId'> = {}) {
  const currentLandId = options.currentLandId?.trim();
  if (!currentLandId) return true;

  const recordLandId = getMetadataZone(metadata, ['currentLandId']);
  return !recordLandId || isSameWorldMap(recordLandId, currentLandId);
}

export function isWorldActivityInInterest(
  metadata: Prisma.JsonValue,
  participantUserIds: Array<string | null | undefined>,
  interest: WorldActivityInterest = {}
) {
  const currentZone = interest.currentZone?.trim();
  const currentLandId = interest.currentLandId?.trim();
  const viewerUserId = interest.viewerUserId;
  const visibleUserIds = getVisibleUserSet(interest.visibleUserIds);
  const radius = Number.isFinite(interest.radius) && interest.radius
    ? Math.max(4, Math.min(64, interest.radius))
    : undefined;
  const center = interest.center;

  if (!currentLandId && !currentZone && !center && !radius && !viewerUserId && visibleUserIds.size === 0) return true;

  const activityLandId = getMetadataZone(metadata, ['currentLandId', 'targetLandId', 'sessionLandId']);
  if (currentLandId && activityLandId && !isSameWorldMap(activityLandId, currentLandId)) return false;

  if (viewerUserId && participantUserIds.includes(viewerUserId)) return true;
  if (participantUserIds.some(userId => userId && visibleUserIds.has(userId))) return true;

  const activityZone = getMetadataZone(metadata, ['currentZone', 'targetZone', 'sessionZone']);
  if (currentZone && activityZone && !isSameWorldZone(activityZone, currentZone)) return false;

  if (center && radius) {
    const activityX = getMetadataNumber(metadata, 'senderX') ?? getMetadataNumber(metadata, 'x');
    const activityZ = getMetadataNumber(metadata, 'senderZ') ?? getMetadataNumber(metadata, 'z');
    if (activityX !== null && activityZ !== null) {
      return getPresenceDistance(center, { x: activityX, y: 0, z: activityZ }) <= radius;
    }
  }

  if (currentLandId && activityLandId) return isSameWorldMap(activityLandId, currentLandId);
  if (!activityZone) return !currentLandId && !currentZone && !center && !radius;
  return isSameWorldZone(activityZone, currentZone);
}

function isWorldRequestInMapInterest(metadata: Prisma.JsonValue, currentLandId?: string) {
  const landId = currentLandId?.trim();
  if (!landId) return true;

  const requestMetadata = normalizeMetadata(metadata);
  const requestLandIds = [
    'currentLandId',
    'targetLandId',
    'sessionLandId',
    'responseLandId',
    'sessionReadyLandId',
    'sessionCompletedLandId',
  ]
    .map(key => requestMetadata[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return requestLandIds.length === 0 || requestLandIds.some(requestLandId => isSameWorldMap(requestLandId, landId));
}

export function filterWorldPresencesByInterest(
  presences: WorldPresence[],
  interest: WorldPresenceInterest = {}
) {
  const radius = Number.isFinite(interest.radius) && interest.radius
    ? Math.max(4, Math.min(64, interest.radius))
    : undefined;
  const center = interest.center;
  const currentZone = interest.currentZone?.trim();
  const currentLandId = interest.currentLandId?.trim();

  if (!radius && !center && !currentZone && !currentLandId) return presences;

  return presences.filter((presence) => {
    if (interest.viewerUserId && presence.userId === interest.viewerUserId) return true;
    if (currentLandId && presence.currentLandId && !isSameWorldMap(presence.currentLandId, currentLandId)) return false;
    if (currentLandId && presence.currentLandId && isSameWorldMap(presence.currentLandId, currentLandId)) return true;
    if (currentZone && isSameWorldZone(presence.currentZone, currentZone)) return true;
    if (center && radius && getPresenceDistance(center, presence.position) <= radius) return true;
    return false;
  });
}

export async function getDisplayNameMap(configId: string, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, string>();

  const [profiles, partners] = await Promise.all([
    prisma.characterProfile.findMany({
      where: { configId, userId: { in: ids } },
      select: { userId: true, displayName: true },
    }),
    prisma.partner.findMany({
      where: {
        configId,
        OR: [
          { partnerId: { in: ids } },
          { userId: { in: ids } },
          { id: { in: ids } },
        ],
      },
      select: { id: true, userId: true, partnerId: true, name: true },
    }),
  ]);

  const names = new Map<string, string>();
  partners.forEach((partner) => {
    [partner.id, partner.userId, partner.partnerId].filter(Boolean).forEach((id) => {
      if (id) names.set(id, partner.name);
    });
  });
  profiles.forEach(profile => names.set(profile.userId, profile.displayName));
  return names;
}

export function toWorldSocialAction(action: PrismaWorldSocialAction, names: Map<string, string>): WorldSocialAction {
  const metadata = normalizeMetadata(action.metadata);
  const metadataTargetName = typeof metadata.targetName === 'string' && metadata.targetName.trim()
    ? metadata.targetName.trim()
    : null;

  return {
    id: action.id,
    configId: action.configId,
    type: normalizeActionType(action.type),
    status: action.status,
    fromUserId: action.fromUserId,
    fromName: names.get(action.fromUserId) || 'Explorer',
    toUserId: action.toUserId,
    toName: action.toUserId ? names.get(action.toUserId) || null : metadataTargetName,
    message: action.message,
    metadata,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  };
}

export async function getWorldActions(
  configId: string,
  limit = DEFAULT_ACTION_LIMIT,
  interest: WorldActivityInterest = {}
): Promise<WorldSocialAction[]> {
  const safeLimit = Math.min(40, Math.max(1, limit));
  const fetchLimit = Math.min(120, Math.max(safeLimit * 5, safeLimit));
  const actions = await prisma.worldSocialAction.findMany({
    where: { configId },
    orderBy: { createdAt: 'desc' },
    take: fetchLimit,
  });
  const visibleActions = actions
    .filter(action => isWorldActivityInInterest(action.metadata, [action.fromUserId, action.toUserId], interest))
    .slice(0, safeLimit);
  const names = await getDisplayNameMap(
    configId,
    visibleActions.flatMap(action => [action.fromUserId, action.toUserId || ''])
  );

  return visibleActions.map(action => toWorldSocialAction(action, names));
}

export async function getWorldActionById(
  configId: string,
  actionId: string,
  interest: WorldActivityInterest = {}
): Promise<WorldSocialAction | null> {
  const action = await prisma.worldSocialAction.findFirst({
    where: { id: actionId, configId },
  });
  if (!action) return null;
  if (!isWorldActivityInInterest(action.metadata, [action.fromUserId, action.toUserId], interest)) return null;

  const names = await getDisplayNameMap(configId, [action.fromUserId, action.toUserId || '']);
  return toWorldSocialAction(action, names);
}

export function toWorldRelationship(relationship: PrismaWorldRelationship, names: Map<string, string>): WorldRelationship {
  return {
    id: relationship.id,
    configId: relationship.configId,
    fromUserId: relationship.fromUserId,
    fromName: names.get(relationship.fromUserId) || 'Explorer',
    toUserId: relationship.toUserId,
    toName: names.get(relationship.toUserId) || 'Explorer',
    type: normalizeRelationshipType(relationship.type),
    status: normalizeRelationshipStatus(relationship.status),
    metadata: normalizeMetadata(relationship.metadata),
    createdAt: relationship.createdAt.toISOString(),
    updatedAt: relationship.updatedAt.toISOString(),
  };
}

export async function getWorldRelationshipsForUser(configId: string, userId: string): Promise<WorldRelationship[]> {
  const relationships = await prisma.worldRelationship.findMany({
    where: {
      configId,
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
      status: { in: ['active', 'pending', 'accepted'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  });
  const names = await getDisplayNameMap(
    configId,
    relationships.flatMap(relationship => [relationship.fromUserId, relationship.toUserId])
  );

  return relationships.map(relationship => toWorldRelationship(relationship, names));
}

export function toWorldChatMessage(message: PrismaWorldChatMessage, names: Map<string, string>): WorldChatMessage {
  return {
    id: message.id,
    configId: message.configId,
    channel: normalizeChatChannel(message.channel),
    fromUserId: message.fromUserId,
    fromName: names.get(message.fromUserId) || 'Explorer',
    toUserId: message.toUserId,
    toName: message.toUserId ? names.get(message.toUserId) || null : null,
    body: message.body,
    metadata: normalizeMetadata(message.metadata),
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  };
}

type WorldPartyRecord = Prisma.WorldPartyGetPayload<{
  include: { members: { where?: { status?: string }; orderBy?: { joinedAt?: 'asc' } } };
}>;

type WorldEventRecord = Prisma.WorldEventGetPayload<{
  include: { participants: true };
}>;

type WorldGuildRecord = Prisma.WorldGuildGetPayload<{
  include: { members: { where?: { status?: string }; orderBy?: { joinedAt?: 'asc' } } };
}>;

type WorldVoiceRoomRecord = Prisma.WorldVoiceRoomGetPayload<{
  include: { members: { where?: { status?: string }; orderBy?: { joinedAt?: 'asc' } } };
}>;

function normalizeVoiceKind(value: string): WorldVoiceKind {
  return WORLD_VOICE_KINDS.has(value as WorldVoiceKind) ? value as WorldVoiceKind : 'proximity';
}

export async function toWorldParty(party: WorldPartyRecord): Promise<WorldParty> {
  const names = await getDisplayNameMap(party.configId, party.members.map(member => member.userId));

  return {
    id: party.id,
    configId: party.configId,
    name: party.name,
    leaderUserId: party.leaderUserId,
    status: party.status,
    members: party.members.map(member => ({
      userId: member.userId,
      name: names.get(member.userId) || 'Explorer',
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt.toISOString(),
    })),
    metadata: normalizeMetadata(party.metadata),
    createdAt: party.createdAt.toISOString(),
    updatedAt: party.updatedAt.toISOString(),
  };
}

export async function getActiveWorldPartyForUser(
  configId: string,
  userId: string,
  options: Pick<WorldSnapshotOptions, 'currentLandId'> = {}
): Promise<WorldParty | null> {
  const memberships = await prisma.worldPartyMember.findMany({
    where: {
      userId,
      status: 'active',
      party: { configId, status: 'active' },
    },
    orderBy: { joinedAt: 'desc' },
    take: 12,
    include: {
      party: {
        include: {
          members: {
            where: { status: 'active' },
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
    },
  });
  const membership = memberships.find(item => isWorldRecordInMapInterest(item.party.metadata, options)) || null;

  return membership ? toWorldParty(membership.party) : null;
}

export async function toWorldGuild(guild: WorldGuildRecord): Promise<WorldGuild> {
  const names = await getDisplayNameMap(guild.configId, guild.members.map(member => member.userId));

  return {
    id: guild.id,
    configId: guild.configId,
    name: guild.name,
    leaderUserId: guild.leaderUserId,
    status: guild.status,
    bannerColor: guild.bannerColor,
    motto: guild.motto,
    members: guild.members.map(member => ({
      userId: member.userId,
      name: names.get(member.userId) || 'Explorer',
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt.toISOString(),
    })),
    metadata: normalizeMetadata(guild.metadata),
    createdAt: guild.createdAt.toISOString(),
    updatedAt: guild.updatedAt.toISOString(),
  };
}

export async function getActiveWorldGuildForUser(
  configId: string,
  userId: string,
  options: Pick<WorldSnapshotOptions, 'currentLandId'> = {}
): Promise<WorldGuild | null> {
  const memberships = await prisma.worldGuildMember.findMany({
    where: {
      userId,
      status: 'active',
      guild: { configId, status: 'active' },
    },
    orderBy: { joinedAt: 'desc' },
    take: 12,
    include: {
      guild: {
        include: {
          members: {
            where: { status: 'active' },
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
    },
  });
  const membership = memberships.find(item => isWorldRecordInMapInterest(item.guild.metadata, options)) || null;

  return membership ? toWorldGuild(membership.guild) : null;
}

export async function getWorldRequestsForUser(
  configId: string,
  userId: string,
  limit = 24,
  options: Pick<WorldSnapshotOptions, 'currentLandId'> = {}
): Promise<WorldSocialAction[]> {
  const requests = await prisma.worldSocialAction.findMany({
    where: {
      configId,
      type: { in: Array.from(WORLD_REQUEST_TYPES) },
      status: { in: ACTIVE_REQUEST_STATUSES },
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(120, Math.max(1, limit * 5)),
  });
  const currentLandId = options.currentLandId?.trim();
  const visibleRequests = currentLandId
    ? requests.filter(request => isWorldRequestInMapInterest(request.metadata, currentLandId))
    : requests;
  const limitedRequests = visibleRequests.slice(0, Math.min(40, Math.max(1, limit)));
  const names = await getDisplayNameMap(
    configId,
    limitedRequests.flatMap(request => [request.fromUserId, request.toUserId || ''])
  );

  return limitedRequests.map(request => toWorldSocialAction(request, names));
}

export async function toWorldVoiceRoom(room: WorldVoiceRoomRecord, names?: Map<string, string>): Promise<WorldVoiceRoom> {
  const nameMap = names || await getDisplayNameMap(room.configId, room.members.map(member => member.userId));
  return {
    id: room.id,
    configId: room.configId,
    kind: normalizeVoiceKind(room.kind),
    scopeKey: room.scopeKey,
    name: room.name,
    status: room.status,
    members: room.members.map(member => ({
      userId: member.userId,
      name: nameMap.get(member.userId) || 'Explorer',
      status: member.status,
      isMuted: member.isMuted,
      joinedAt: member.joinedAt.toISOString(),
      lastSeen: member.lastSeen.toISOString(),
    })),
    metadata: normalizeMetadata(room.metadata),
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

function isWorldVoiceRoomInInterest(room: WorldVoiceRoom, interest: WorldVoiceInterest = {}) {
  if (room.kind !== 'proximity') return true;
  if (interest.viewerUserId && room.members.some(member => member.userId === interest.viewerUserId && member.status === 'active')) {
    return true;
  }

  const roomLandId = getRecordString(room.metadata, 'currentLandId');
  const currentLandId = interest.currentLandId?.trim();
  if (currentLandId && roomLandId && !isSameWorldMap(roomLandId, currentLandId)) return false;

  const roomZone = getRecordString(room.metadata, 'currentZone');
  const currentZone = interest.currentZone?.trim();
  if (currentZone && roomZone && !isSameWorldZone(roomZone, currentZone)) return false;

  const roomX = getRecordNumber(room.metadata, 'centerX');
  const roomZ = getRecordNumber(room.metadata, 'centerZ');
  if (!interest.center || roomX === null || roomZ === null) return !currentZone || !roomZone || isSameWorldZone(roomZone, currentZone);

  const voiceRadius = getRecordNumber(room.metadata, 'radius') || 6;
  const interestRadius = Number.isFinite(interest.radius) && interest.radius
    ? Math.max(4, Math.min(64, interest.radius))
    : voiceRadius;
  const dx = interest.center.x - roomX;
  const dz = interest.center.z - roomZ;
  return Math.sqrt(dx * dx + dz * dz) <= interestRadius + voiceRadius;
}

export async function getWorldVoiceRoomsForUser(configId: string, userId: string, interest: WorldVoiceInterest = {}) {
  const rooms = await prisma.worldVoiceRoom.findMany({
    where: {
      configId,
      status: 'active',
      OR: [
        { kind: { in: ['proximity', 'party', 'guild'] } },
        { members: { some: { userId, status: 'active' } } },
      ],
    },
    include: {
      members: {
        where: { status: 'active' },
        orderBy: { joinedAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 32,
  });
  const names = await getDisplayNameMap(configId, rooms.flatMap(room => room.members.map(member => member.userId)));
  const mapped = await Promise.all(rooms.map(room => toWorldVoiceRoom(room, names)));
  const visibleRooms = mapped.filter(room => isWorldVoiceRoomInInterest(room, {
    ...interest,
    viewerUserId: userId,
  }));
  return {
    rooms: visibleRooms,
    myRooms: visibleRooms.filter(room => room.members.some(member => member.userId === userId && member.status === 'active')),
  };
}

function toWorldInventoryItem(item: PrismaWorldInventoryItem, equipment: CharacterEquipment): WorldInventoryItem {
  return {
    id: item.id,
    configId: item.configId,
    userId: item.userId,
    slot: item.slot as WorldInventoryItem['slot'],
    itemKey: item.itemKey,
    name: item.name,
    rarity: cleanWorldInventoryRarity(item.rarity),
    icon: item.icon,
    isEquipped: equipment[item.slot as keyof CharacterEquipment] === item.itemKey,
    metadata: normalizeMetadata(item.metadata),
    acquiredAt: item.acquiredAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function buildWorldMarketCatalog(inventory: WorldInventoryItem[], equipment: CharacterEquipment): WorldInventoryCatalogItem[] {
  const ownedKeys = new Set(inventory.map(item => item.itemKey));
  return WORLD_EQUIPMENT_ITEMS.map(item => ({
    slot: item.slot,
    itemKey: item.itemKey,
    name: item.name,
    rarity: item.rarity,
    icon: item.icon,
    price: item.price,
    description: item.description,
    source: item.source,
    isOwned: ownedKeys.has(item.itemKey),
    isEquipped: equipment[item.slot] === item.itemKey,
  }));
}

export async function getWorldPlayerStateForUser(configId: string, userId: string) {
  const profile = await prisma.characterProfile.findUnique({
    where: { configId_userId: { configId, userId } },
    select: { title: true, equipment: true },
  });
  const equipment = normalizeWorldEquipment(profile?.equipment || DEFAULT_WORLD_EQUIPMENT);
  const [items, stats, achievements] = await Promise.all([
    prisma.worldInventoryItem.findMany({
      where: { configId, userId },
      orderBy: [
        { slot: 'asc' },
        { acquiredAt: 'asc' },
      ],
    }),
    getStats(configId),
    getWorldAchievements(configId, userId, profile?.title || ''),
  ]);
  const inventory = items.map(item => toWorldInventoryItem(item, equipment));

  return {
    inventory,
    marketCatalog: buildWorldMarketCatalog(inventory, equipment),
    marketStats: stats,
    achievements,
    characterEquipment: equipment,
    characterTitle: profile?.title || '',
  };
}

function activeWorldEventWhere(configId: string, now = new Date()) {
  return {
    configId,
    status: 'active',
    startsAt: { lte: now },
    OR: [
      { endsAt: null },
      { endsAt: { gt: now } },
    ],
  };
}

export async function toWorldEvent(event: WorldEventRecord): Promise<WorldEvent> {
  const names = await getDisplayNameMap(event.configId, event.participants.map(participant => participant.userId));

  return {
    id: event.id,
    configId: event.configId,
    title: event.title,
    description: event.description,
    district: event.district,
    status: event.status,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() || null,
    participants: event.participants.map(participant => ({
      userId: participant.userId,
      name: names.get(participant.userId) || 'Explorer',
      status: participant.status,
      joinedAt: participant.joinedAt.toISOString(),
    })),
    metadata: normalizeMetadata(event.metadata),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function isWorldEventInInterest(event: WorldEventRecord, options: Pick<WorldSnapshotOptions, 'currentLandId'> = {}) {
  const currentLandId = options.currentLandId?.trim();
  if (!currentLandId) return true;

  const eventLandId = getMetadataZone(event.metadata, ['currentLandId']);
  return Boolean(eventLandId && isSameWorldMap(eventLandId, currentLandId));
}

export async function getActiveWorldEvent(
  configId: string,
  options: Pick<WorldSnapshotOptions, 'currentLandId'> = {}
): Promise<WorldEvent | null> {
  const events = await prisma.worldEvent.findMany({
    where: activeWorldEventWhere(configId),
    orderBy: { startsAt: 'desc' },
    take: 20,
    include: {
      participants: {
        where: { status: 'attending' },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
  const event = events.find(item => isWorldEventInInterest(item, options)) || null;

  return event ? toWorldEvent(event) : null;
}

export async function getActiveWorldEventForUser(
  configId: string,
  userId: string,
  options: Pick<WorldSnapshotOptions, 'currentLandId'> = {}
): Promise<WorldEvent | null> {
  const participants = await prisma.worldEventParticipant.findMany({
    where: {
      userId,
      status: 'attending',
      event: activeWorldEventWhere(configId),
    },
    orderBy: { joinedAt: 'desc' },
    take: 12,
    include: {
      event: {
        include: {
          participants: {
            where: { status: 'attending' },
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
    },
  });
  const participant = participants.find(item => isWorldEventInInterest(item.event, options)) || null;

  return participant ? toWorldEvent(participant.event) : null;
}

export async function getWorldChatMessages(
  configId: string,
  limit = DEFAULT_CHAT_LIMIT,
  viewerUserId?: string,
  interest: WorldActivityInterest = {}
): Promise<WorldChatMessage[]> {
  const safeLimit = Math.min(40, Math.max(1, limit));
  const fetchLimit = Math.min(120, Math.max(safeLimit * 5, safeLimit));
  const [viewerParty, viewerGuild] = viewerUserId
    ? await Promise.all([
      getActiveWorldPartyForUser(configId, viewerUserId, { currentLandId: interest.currentLandId }),
      getActiveWorldGuildForUser(configId, viewerUserId, { currentLandId: interest.currentLandId }),
    ])
    : [null, null];

  const messages = await prisma.worldChatMessage.findMany({
    where: {
      configId,
      OR: [
        { channel: 'world' },
        ...(viewerUserId ? [
          { channel: 'direct', fromUserId: viewerUserId },
          { channel: 'direct', toUserId: viewerUserId },
          { channel: 'party' },
          { channel: 'guild' },
        ] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: fetchLimit,
  });
  const visibleMessages = messages
    .filter((message) => {
      const channel = normalizeChatChannel(message.channel);
      if (channel === 'world') return true;
      if (channel === 'direct') {
        return Boolean(viewerUserId && (message.fromUserId === viewerUserId || message.toUserId === viewerUserId));
      }
      if (channel === 'party') return Boolean(viewerParty?.id && getMetadataString(message.metadata, 'partyId') === viewerParty.id);
      if (channel === 'guild') return Boolean(viewerGuild?.id && getMetadataString(message.metadata, 'guildId') === viewerGuild.id);
      return false;
    })
    .filter((message) => {
      const channel = normalizeChatChannel(message.channel);
      if (channel !== 'world') return true;
      return isWorldActivityInInterest(message.metadata, [message.fromUserId, message.toUserId], {
        ...interest,
        viewerUserId: viewerUserId || interest.viewerUserId,
      });
    })
    .slice(0, safeLimit);
  const names = await getDisplayNameMap(
    configId,
    visibleMessages.flatMap(message => [message.fromUserId, message.toUserId || ''])
  );

  return visibleMessages.map(message => toWorldChatMessage(message, names)).reverse();
}

export async function getWorldChatMessageById(
  configId: string,
  messageId: string,
  viewerUserId?: string,
  interest: WorldActivityInterest = {}
): Promise<WorldChatMessage | null> {
  const message = await prisma.worldChatMessage.findFirst({
    where: { id: messageId, configId },
  });
  if (!message) return null;

  const channel = normalizeChatChannel(message.channel);
  const [viewerParty, viewerGuild] = viewerUserId
    ? await Promise.all([
      getActiveWorldPartyForUser(configId, viewerUserId, { currentLandId: interest.currentLandId }),
      getActiveWorldGuildForUser(configId, viewerUserId, { currentLandId: interest.currentLandId }),
    ])
    : [null, null];
  const channelVisible = channel === 'world'
    ? true
    : channel === 'direct'
      ? Boolean(viewerUserId && (message.fromUserId === viewerUserId || message.toUserId === viewerUserId))
      : channel === 'party'
        ? Boolean(viewerParty?.id && getMetadataString(message.metadata, 'partyId') === viewerParty.id)
        : channel === 'guild'
          ? Boolean(viewerGuild?.id && getMetadataString(message.metadata, 'guildId') === viewerGuild.id)
          : false;
  if (!channelVisible) return null;
  if (channel === 'world' && !isWorldActivityInInterest(message.metadata, [message.fromUserId, message.toUserId], {
    ...interest,
    viewerUserId: viewerUserId || interest.viewerUserId,
  })) return null;

  const names = await getDisplayNameMap(configId, [message.fromUserId, message.toUserId || '']);
  return toWorldChatMessage(message, names);
}

export async function getWorldSnapshot(
  configId: string,
  options: WorldSnapshotOptions = {}
): Promise<WorldSnapshot> {
  const [presences, event] = await Promise.all([
    getWorldPresences(configId, Math.max(options.presenceLimit || DEFAULT_WORLD_LIMIT, DEFAULT_WORLD_LIMIT)),
    getActiveWorldEvent(configId, { currentLandId: options.currentLandId }),
  ]);
  const visiblePresences = filterWorldPresencesByInterest(presences, {
    currentLandId: options.currentLandId,
    currentZone: options.currentZone,
    center: options.center,
    radius: options.radius,
    viewerUserId: options.viewerUserId,
  }).slice(0, options.presenceLimit || DEFAULT_WORLD_LIMIT);
  const visibleUserIds = visiblePresences.map(presence => presence.userId);
  const [actions, chatMessages] = await Promise.all([
    getWorldActions(configId, options.actionLimit || DEFAULT_ACTION_LIMIT, {
      currentLandId: options.currentLandId,
      currentZone: options.currentZone,
      center: options.center,
      radius: options.radius,
      viewerUserId: options.viewerUserId,
      visibleUserIds,
    }),
    getWorldChatMessages(configId, options.chatLimit || DEFAULT_CHAT_LIMIT, options.viewerUserId, {
      currentLandId: options.currentLandId,
      currentZone: options.currentZone,
      center: options.center,
      radius: options.radius,
      viewerUserId: options.viewerUserId,
      visibleUserIds,
    }),
  ]);
  const [party, guild, relationships, requests, voice, playerState] = options.viewerUserId
    ? await Promise.all([
      getActiveWorldPartyForUser(configId, options.viewerUserId, { currentLandId: options.currentLandId }),
      getActiveWorldGuildForUser(configId, options.viewerUserId, { currentLandId: options.currentLandId }),
      getWorldRelationshipsForUser(configId, options.viewerUserId),
      getWorldRequestsForUser(configId, options.viewerUserId, 24, { currentLandId: options.currentLandId }),
      getWorldVoiceRoomsForUser(configId, options.viewerUserId, {
        currentLandId: options.currentLandId,
        currentZone: options.currentZone,
        center: options.center,
        radius: options.radius,
      }),
      getWorldPlayerStateForUser(configId, options.viewerUserId),
    ])
    : [null, null, [], [], { rooms: [], myRooms: [] }, {
      inventory: [],
      marketCatalog: [],
      marketStats: null,
      achievements: [],
      characterEquipment: DEFAULT_WORLD_EQUIPMENT,
      characterTitle: '',
    }];

  return {
    presences: visiblePresences,
    actions,
    chatMessages,
    interest: {
      ...(options.currentZone ? { currentZone: options.currentZone } : {}),
      ...(options.currentLandId ? { currentLandId: options.currentLandId } : {}),
      ...(options.center ? { center: options.center } : {}),
      ...(options.radius ? { radius: options.radius } : {}),
      totalOnline: presences.length,
      visibleOnline: visiblePresences.length,
    },
    event,
    party,
    guild,
    relationships,
    requests,
    voiceRooms: voice.rooms,
    myVoiceRooms: voice.myRooms,
    inventory: playerState.inventory,
    marketCatalog: playerState.marketCatalog,
    marketStats: playerState.marketStats,
    achievements: playerState.achievements,
    characterEquipment: playerState.characterEquipment,
    characterTitle: playerState.characterTitle,
    serverTime: new Date().toISOString(),
  };
}
