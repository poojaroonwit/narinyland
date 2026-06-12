import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { getActiveWorldGuildForUser, getActiveWorldPartyForUser, getDisplayNameMap, publishWorldUpdate } from '@/lib/world-state';
import { cleanWorldMapKey } from '@/lib/world-location';
import type { WorldVoiceKind, WorldVoiceRoom } from '@/types';

type WorldVoiceBody = {
  action?: 'join' | 'leave' | 'mute';
  kind?: string;
  roomId?: string;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
  x?: number;
  z?: number;
  isMuted?: boolean;
};

type VoiceRoomRecord = Prisma.WorldVoiceRoomGetPayload<{
  include: { members: { where?: { status?: string }; orderBy?: { joinedAt?: 'asc' } } };
}>;

const VOICE_KINDS = new Set<WorldVoiceKind>(['proximity', 'party', 'guild', 'direct']);
const PROXIMITY_VOICE_RANGE = 6;
const PROXIMITY_VOICE_CELL_SIZE = 6;

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function parseOptionalNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeKind(value: unknown): WorldVoiceKind {
  return typeof value === 'string' && VOICE_KINDS.has(value as WorldVoiceKind)
    ? value as WorldVoiceKind
    : 'proximity';
}

function normalizeMetadata(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => key.length <= 48 && ['string', 'number', 'boolean'].includes(typeof entry))
      .slice(0, 16)
  );
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getMetadataNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toInputJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function directScope(userA: string, userB: string) {
  return ['direct', ...[userA, userB].sort()].join(':');
}

function proximityCellFromPosition(x = 0, z = 0) {
  const cellX = Math.round(x / PROXIMITY_VOICE_CELL_SIZE);
  const cellZ = Math.round(z / PROXIMITY_VOICE_CELL_SIZE);
  return {
    cellX,
    cellZ,
    centerX: cellX * PROXIMITY_VOICE_CELL_SIZE,
    centerZ: cellZ * PROXIMITY_VOICE_CELL_SIZE,
  };
}

async function targetBelongsToConfig(configId: string, targetUserId: string) {
  const [profile, partner] = await Promise.all([
    prisma.characterProfile.findUnique({
      where: { configId_userId: { configId, userId: targetUserId } },
      select: { userId: true },
    }),
    prisma.partner.findFirst({
      where: {
        configId,
        OR: [
          { id: targetUserId },
          { userId: targetUserId },
          { partnerId: targetUserId },
        ],
      },
      select: { id: true },
    }),
  ]);

  return Boolean(profile || partner);
}

async function toWorldVoiceRoom(room: VoiceRoomRecord, names?: Map<string, string>): Promise<WorldVoiceRoom> {
  const nameMap = names || await getDisplayNameMap(room.configId, room.members.map(member => member.userId));
  return {
    id: room.id,
    configId: room.configId,
    kind: normalizeKind(room.kind),
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

function isVoiceRoomVisible(
  room: WorldVoiceRoom,
  userId: string,
  options: { currentLandId?: string; currentZone?: string; x?: number; z?: number; radius?: number } = {}
) {
  if (room.kind !== 'proximity') return true;
  if (room.members.some(member => member.userId === userId && member.status === 'active')) return true;

  const roomLandId = getMetadataString(room.metadata, 'currentLandId');
  if (options.currentLandId && roomLandId && roomLandId.toLowerCase() !== options.currentLandId.toLowerCase()) return false;

  const roomZone = getMetadataString(room.metadata, 'currentZone');
  if (options.currentZone && roomZone && roomZone.toLowerCase() !== options.currentZone.toLowerCase()) return false;

  const roomX = getMetadataNumber(room.metadata, 'centerX');
  const roomZ = getMetadataNumber(room.metadata, 'centerZ');
  if (options.x === undefined || options.z === undefined || roomX === null || roomZ === null) {
    return !options.currentZone || !roomZone || roomZone.toLowerCase() === options.currentZone.toLowerCase();
  }

  const roomRadius = getMetadataNumber(room.metadata, 'radius') || PROXIMITY_VOICE_RANGE;
  const radius = options.radius || PROXIMITY_VOICE_RANGE;
  const dx = options.x - roomX;
  const dz = options.z - roomZ;
  return Math.sqrt(dx * dx + dz * dz) <= radius + roomRadius;
}

async function getVoiceRooms(
  configId: string,
  userId: string,
  options: { currentLandId?: string; currentZone?: string; x?: number; z?: number; radius?: number } = {}
) {
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
  const visible = mapped.filter(room => isVoiceRoomVisible(room, userId, options));
  return {
    rooms: visible,
    myRooms: visible.filter(room => room.members.some(member => member.userId === userId && member.status === 'active')),
  };
}

async function getOrCreateRoom(
  configId: string,
  kind: WorldVoiceKind,
  scopeKey: string,
  name: string,
  metadata: Record<string, unknown> = {}
) {
  const existing = await prisma.worldVoiceRoom.findFirst({
    where: { configId, kind, scopeKey, status: 'active' },
    include: {
      members: {
        where: { status: 'active' },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
  if (existing) return existing;

  return prisma.worldVoiceRoom.create({
    data: {
      configId,
      kind,
      scopeKey,
      name,
      metadata: toInputJson(metadata),
    },
    include: {
      members: {
        where: { status: 'active' },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
}

async function resolveRoomTarget(configId: string, userId: string, body: WorldVoiceBody) {
  const kind = normalizeKind(body.kind);
  const currentLandId = cleanWorldMapKey(body.currentLandId);
  const currentZone = cleanOptionalText(body.currentZone, 80) || 'Narinyland Commons';

  if (kind === 'party') {
    const party = await getActiveWorldPartyForUser(configId, userId, { currentLandId });
    if (!party) throw Object.assign(new Error('Join a party before opening party voice'), { status: 403 });
    return {
      kind,
      scopeKey: `party:${party.id}`,
      name: `${party.name} Voice`.slice(0, 80),
      metadata: { partyId: party.id, currentLandId, currentZone },
    };
  }

  if (kind === 'guild') {
    const guild = await getActiveWorldGuildForUser(configId, userId, { currentLandId });
    if (!guild) throw Object.assign(new Error('Join a guild before opening guild voice'), { status: 403 });
    return {
      kind,
      scopeKey: `guild:${guild.id}`,
      name: `${guild.name} Voice`.slice(0, 80),
      metadata: { guildId: guild.id, currentLandId, currentZone },
    };
  }

  if (kind === 'direct') {
    const targetUserId = cleanOptionalText(body.targetUserId, 120);
    if (!targetUserId) throw Object.assign(new Error('targetUserId is required for direct voice'), { status: 400 });
    if (targetUserId === userId) throw Object.assign(new Error('Cannot open direct voice with yourself'), { status: 400 });
    const validTarget = await targetBelongsToConfig(configId, targetUserId);
    if (!validTarget) throw Object.assign(new Error('Target is not in this world'), { status: 404 });
    const targetName = cleanOptionalText(body.targetName, 80) || 'Explorer';
    return {
      kind,
      scopeKey: directScope(userId, targetUserId),
      name: `Voice with ${targetName}`.slice(0, 80),
      metadata: { targetUserId, targetName, currentLandId, currentZone },
      targetUserId,
    };
  }

  const x = parseOptionalNumber(body.x, -28, 28) || 0;
  const z = parseOptionalNumber(body.z, -28, 28) || 0;
  const cell = proximityCellFromPosition(x, z);
  return {
    kind,
    scopeKey: `proximity:${currentLandId || currentZone}:${cell.cellX}:${cell.cellZ}`,
    name: `${currentZone} Voice`.slice(0, 80),
    metadata: {
      currentLandId,
      currentZone,
      radius: PROXIMITY_VOICE_RANGE,
      centerX: cell.centerX,
      centerZ: cell.centerZ,
    },
  };
}

async function deactivateEmptyRoom(roomId: string) {
  const activeMembers = await prisma.worldVoiceMember.count({
    where: { roomId, status: 'active' },
  });
  if (activeMembers === 0) {
    await prisma.worldVoiceRoom.update({
      where: { id: roomId },
      data: { status: 'idle' },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const currentLandId = cleanWorldMapKey(searchParams.get('currentLandId'));
    const currentZone = cleanOptionalText(searchParams.get('currentZone'), 80);
    const x = parseOptionalNumber(searchParams.get('x'), -28, 28);
    const z = parseOptionalNumber(searchParams.get('z'), -28, 28);

    return NextResponse.json(await getVoiceRooms(access.configId, access.userId, {
      currentLandId,
      currentZone,
      x,
      z,
      radius: PROXIMITY_VOICE_RANGE,
    }));
  } catch (err: unknown) {
    console.error('GET /api/world-voice error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldVoiceBody;
    const action = body.action || 'join';
    const requestLandId = cleanWorldMapKey(body.currentLandId);
    const requestVoiceInterest = {
      currentLandId: requestLandId,
      currentZone: cleanOptionalText(body.currentZone, 80),
      x: parseOptionalNumber(body.x, -28, 28),
      z: parseOptionalNumber(body.z, -28, 28),
      radius: PROXIMITY_VOICE_RANGE,
    };

    if (action === 'leave') {
      const roomId = cleanOptionalText(body.roomId, 120);
      const updated = await prisma.worldVoiceMember.updateMany({
        where: {
          userId: access.userId,
          status: 'active',
          ...(roomId ? { roomId } : {}),
          room: { configId: access.configId },
        },
        data: { status: 'left' },
      });
      if (roomId && updated.count > 0) await deactivateEmptyRoom(roomId);
      await publishWorldUpdate(access.configId, 'voice', {
        userId: access.userId,
        roomId: roomId || null,
        action: 'leave',
        currentLandId: requestLandId,
      });
      return NextResponse.json(await getVoiceRooms(access.configId, access.userId, requestVoiceInterest));
    }

    if (action === 'mute') {
      const roomId = cleanOptionalText(body.roomId, 120);
      if (!roomId) return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
      await prisma.worldVoiceMember.updateMany({
        where: {
          roomId,
          userId: access.userId,
          status: 'active',
          room: { configId: access.configId },
        },
        data: {
          isMuted: Boolean(body.isMuted),
          lastSeen: new Date(),
        },
      });
      await publishWorldUpdate(access.configId, 'voice', {
        userId: access.userId,
        roomId,
        action: 'mute',
        isMuted: Boolean(body.isMuted),
        currentLandId: requestLandId,
      });
      return NextResponse.json(await getVoiceRooms(access.configId, access.userId, requestVoiceInterest));
    }

    const target = await resolveRoomTarget(access.configId, access.userId, body);
    const room = await getOrCreateRoom(access.configId, target.kind, target.scopeKey, target.name, target.metadata);
    const previousProximityRoomIds = target.kind === 'proximity'
      ? await prisma.worldVoiceMember.findMany({
        where: {
          userId: access.userId,
          status: 'active',
          roomId: { not: room.id },
          room: { configId: access.configId, kind: 'proximity' },
        },
        select: { roomId: true },
      })
      : [];
    if (previousProximityRoomIds.length > 0) {
      await prisma.worldVoiceMember.updateMany({
        where: {
          userId: access.userId,
          status: 'active',
          roomId: { in: previousProximityRoomIds.map(member => member.roomId) },
          room: { configId: access.configId, kind: 'proximity' },
        },
        data: { status: 'left' },
      });
      await Promise.all(previousProximityRoomIds.map(member => deactivateEmptyRoom(member.roomId)));
    }
    await prisma.worldVoiceMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: access.userId } },
      create: {
        roomId: room.id,
        userId: access.userId,
        status: 'active',
        isMuted: Boolean(body.isMuted),
      },
      update: {
        status: 'active',
        isMuted: Boolean(body.isMuted),
        lastSeen: new Date(),
      },
    });
    if (target.kind === 'direct' && target.targetUserId) {
      await prisma.worldVoiceMember.upsert({
        where: { roomId_userId: { roomId: room.id, userId: target.targetUserId } },
        create: {
          roomId: room.id,
          userId: target.targetUserId,
          status: 'invited',
          isMuted: false,
        },
        update: {},
      });
    }

    const rooms = await getVoiceRooms(access.configId, access.userId, {
      ...requestVoiceInterest,
    });
    const joinedRoom = rooms.rooms.find(item => item.id === room.id) || null;
    await publishWorldUpdate(access.configId, 'voice', {
      userId: access.userId,
      roomId: room.id,
      action: 'join',
      kind: target.kind,
      currentLandId: requestLandId,
      centerX: typeof target.metadata.centerX === 'number' ? target.metadata.centerX : null,
      centerZ: typeof target.metadata.centerZ === 'number' ? target.metadata.centerZ : null,
    });
    return NextResponse.json({ ...rooms, room: joinedRoom });
  } catch (err: unknown) {
    console.error('POST /api/world-voice error:', err);
    const status = typeof err === 'object' && err && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;
    return NextResponse.json({ error: getErrorMessage(err) }, { status });
  }
}
