import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { getDisplayNameMap, publishWorldUpdate, toWorldEvent } from '@/lib/world-state';
import { awardWorldAchievement } from '@/lib/world-achievements';
import { cleanWorldMapKey } from '@/lib/world-location';

type WorldEventBody = {
  action?: 'ensure' | 'join' | 'leave' | 'rally';
  eventId?: string;
  title?: string;
  description?: string;
  district?: string;
  currentLandId?: string;
  currentZone?: string;
  metadata?: Record<string, unknown>;
};

const DEFAULT_EVENT_TITLE = 'Garden Gathering';
const DEFAULT_EVENT_DESCRIPTION = 'A quiet shared world event for nearby avatars.';
const DEFAULT_EVENT_DISTRICT = 'Event Lawn';

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => key.length <= 48 && ['string', 'number', 'boolean'].includes(typeof entry))
      .slice(0, 16)
  );
}

function toInputJson(value: unknown): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function getErrorStatus(err: unknown) {
  if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') {
    return Math.min(599, Math.max(400, err.status));
  }

  return 500;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value.trim() : '';
}

function activeEventWhere(configId: string, now = new Date()) {
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

async function ensureWorldEvent(configId: string, body: WorldEventBody = {}) {
  const eventId = cleanOptionalText(body.eventId, 120);
  const currentLandId = cleanWorldMapKey(body.currentLandId);
  const currentZone = cleanOptionalText(body.currentZone, 80);
  if (eventId) {
    const event = await prisma.worldEvent.findFirst({
      where: {
        ...activeEventWhere(configId),
        id: eventId,
      },
      include: {
        participants: {
          where: { status: 'attending' },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!event) throw Object.assign(new Error('Event is no longer active'), { status: 404 });
    return event;
  }

  const existingEvents = await prisma.worldEvent.findMany({
    where: activeEventWhere(configId),
    orderBy: { startsAt: 'desc' },
    take: 20,
    include: {
      participants: {
        where: { status: 'attending' },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
  const existing = existingEvents.find((event) => {
    if (!currentLandId) return true;
    return getMetadataString(normalizeMetadata(event.metadata), 'currentLandId').toLowerCase() === currentLandId.toLowerCase();
  });
  if (existing) return existing;

  const district = cleanOptionalText(body.district, 80) ||
    currentZone ||
    DEFAULT_EVENT_DISTRICT;

  return prisma.worldEvent.create({
    data: {
      configId,
      title: cleanOptionalText(body.title, 80) || DEFAULT_EVENT_TITLE,
      description: cleanOptionalText(body.description, 220) || DEFAULT_EVENT_DESCRIPTION,
      district,
      metadata: toInputJson({
        ...normalizeMetadata(body.metadata),
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
        createdFrom: 'world',
      }),
    },
    include: {
      participants: {
        where: { status: 'attending' },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const event = await ensureWorldEvent(access.configId, {
      currentLandId: cleanWorldMapKey(searchParams.get('currentLandId')),
      currentZone: cleanOptionalText(searchParams.get('currentZone'), 80),
    });
    return NextResponse.json({ event: await toWorldEvent(event) });
  } catch (err: unknown) {
    console.error('GET /api/world-events error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = (await request.json().catch(() => ({}))) as WorldEventBody;
    const action = body.action || 'ensure';
    const currentLandId = cleanWorldMapKey(body.currentLandId);
    const currentZone = cleanOptionalText(body.currentZone, 80);

    if (action === 'leave') {
      const event = await prisma.worldEvent.findFirst({
        where: {
          ...activeEventWhere(access.configId),
          participants: {
            some: {
              userId: access.userId,
              status: 'attending',
            },
          },
        },
        orderBy: { startsAt: 'desc' },
        include: {
          participants: {
            where: { status: 'attending' },
            orderBy: { joinedAt: 'asc' },
          },
        },
      });
      if (!event) return NextResponse.json({ event: null });

      await prisma.worldEventParticipant.updateMany({
        where: {
          eventId: event.id,
          userId: access.userId,
          status: 'attending',
        },
        data: { status: 'left' },
      });

      const refreshed = await prisma.worldEvent.findUniqueOrThrow({
        where: { id: event.id },
        include: {
          participants: {
            where: { status: 'attending' },
            orderBy: { joinedAt: 'asc' },
          },
        },
      });
      await publishWorldUpdate(access.configId, 'event', {
        userId: access.userId,
        currentLandId,
        eventId: event.id,
        action: 'leave',
      });
      return NextResponse.json({ event: await toWorldEvent(refreshed) });
    }

    const event = await ensureWorldEvent(access.configId, body);
    if (action === 'join' || action === 'rally') {
      await prisma.worldEventParticipant.upsert({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: access.userId,
          },
        },
        create: {
          eventId: event.id,
          userId: access.userId,
          status: 'attending',
        },
        update: {
          status: 'attending',
          joinedAt: new Date(),
        },
      });
      await awardWorldAchievement(access.configId, access.userId, 'event_guest', {
        eventId: event.id,
        eventTitle: event.title,
        ...(currentLandId ? { currentLandId } : {}),
        ...(currentZone ? { currentZone } : {}),
      });
    }

    if (action === 'rally') {
      const names = await getDisplayNameMap(access.configId, [access.userId]);
      const eventMetadata = normalizeMetadata(event.metadata);
      const rallyCount = typeof eventMetadata.rallyCount === 'number' ? eventMetadata.rallyCount + 1 : 1;
      const rallyZone = currentZone ||
        cleanOptionalText(body.district, 80) ||
        event.district;

      const rallied = await prisma.worldEvent.update({
        where: { id: event.id },
        data: {
          metadata: toInputJson({
            ...eventMetadata,
            ...(currentLandId ? { currentLandId } : {}),
            rallyCount,
            ...(currentLandId ? { rallyLandId: currentLandId } : {}),
            rallyZone,
            lastRallyAt: new Date().toISOString(),
            lastRallyByName: names.get(access.userId) || 'Explorer',
            lastRallyByUserId: access.userId,
          }),
        },
        include: {
          participants: {
            where: { status: 'attending' },
            orderBy: { joinedAt: 'asc' },
          },
        },
      });

      await publishWorldUpdate(access.configId, 'event', {
        userId: access.userId,
        currentLandId,
        eventId: event.id,
        action,
        rallyCount,
      });

      return NextResponse.json({ event: await toWorldEvent(rallied) });
    }

    const refreshed = await prisma.worldEvent.findUniqueOrThrow({
      where: { id: event.id },
      include: {
        participants: {
          where: { status: 'attending' },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    await publishWorldUpdate(access.configId, 'event', {
      userId: access.userId,
      currentLandId,
      eventId: event.id,
      action,
    });

    return NextResponse.json({ event: await toWorldEvent(refreshed) });
  } catch (err: unknown) {
    console.error('POST /api/world-events error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: getErrorStatus(err) });
  }
}
