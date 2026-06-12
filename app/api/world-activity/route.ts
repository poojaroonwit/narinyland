import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { filterWorldPresencesByInterest, getDisplayNameMap, getWorldChatMessages, getWorldPresences, isWorldActivityInInterest, toWorldSocialAction } from '@/lib/world-state';
import { cleanWorldMapKey } from '@/lib/world-location';
import type { WorldActivityFeed, WorldActivityProfileSummary, WorldPresenceVector } from '@/types';

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value || '12');
  return Number.isFinite(parsed) ? Math.min(24, Math.max(1, parsed)) : 12;
}

function parseOptionalNumber(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const targetUserId = cleanOptionalText(searchParams.get('userId'), 120);
    const limit = normalizeLimit(searchParams.get('limit'));
    const currentLandId = cleanWorldMapKey(searchParams.get('currentLandId'));
    const currentZone = cleanOptionalText(searchParams.get('currentZone'), 80);
    const x = parseOptionalNumber(searchParams.get('x'), -28, 28);
    const z = parseOptionalNumber(searchParams.get('z'), -28, 28);
    const radius = parseOptionalNumber(searchParams.get('radius'), 4, 64);
    const center: WorldPresenceVector | undefined = x !== undefined && z !== undefined ? { x, y: 0, z } : undefined;
    if (!targetUserId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const [profile, partner, allPresences, actionRows, visibleChatMessages] = await Promise.all([
      prisma.characterProfile.findUnique({
        where: { configId_userId: { configId: access.configId, userId: targetUserId } },
        select: {
          userId: true,
          displayName: true,
          title: true,
          status: true,
          activity: true,
          updatedAt: true,
        },
      }),
      prisma.partner.findFirst({
        where: {
          configId: access.configId,
          OR: [
            { id: targetUserId },
            { userId: targetUserId },
            { partnerId: targetUserId },
          ],
        },
        select: { id: true, userId: true, partnerId: true, name: true },
      }),
      getWorldPresences(access.configId, 80),
      prisma.worldSocialAction.findMany({
        where: {
          configId: access.configId,
          OR: [
            { fromUserId: targetUserId },
            { toUserId: targetUserId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(80, limit * 4),
      }),
      getWorldChatMessages(access.configId, Math.min(40, limit * 4), access.userId, {
        currentLandId,
        currentZone,
        center,
        radius,
        viewerUserId: access.userId,
      }),
    ]);

    if (!profile && !partner) {
      return NextResponse.json({ error: 'Target is not in this world' }, { status: 404 });
    }

    const visiblePresences = filterWorldPresencesByInterest(allPresences, {
      currentLandId,
      currentZone,
      center,
      radius,
      viewerUserId: access.userId,
    });
    const visibleUserIds = visiblePresences.map(presence => presence.userId);
    const presence = visiblePresences.find(item => item.userId === targetUserId) || null;
    const visibleTargetActions = actionRows
      .filter(action => isWorldActivityInInterest(action.metadata, [action.fromUserId, action.toUserId], {
        currentLandId,
        currentZone,
        center,
        radius,
        viewerUserId: access.userId,
        visibleUserIds,
      }))
      .slice(0, limit);
    const visibleTargetMessages = visibleChatMessages
      .filter(message => message.fromUserId === targetUserId || message.toUserId === targetUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const names = await getDisplayNameMap(
      access.configId,
      [
        targetUserId,
        ...visibleTargetActions.flatMap(action => [action.fromUserId, action.toUserId || '']),
        ...visibleTargetMessages.flatMap(message => [message.fromUserId, message.toUserId || '']),
      ]
    );
    const name = presence?.name || profile?.displayName || partner?.name || names.get(targetUserId) || 'Explorer';
    const summary: WorldActivityProfileSummary = {
      userId: targetUserId,
      name,
      title: presence?.title || profile?.title || undefined,
      status: presence?.status || profile?.status || 'offline',
      activity: presence?.activity || profile?.activity || 'Exploring',
      updatedAt: presence?.lastSeen || profile?.updatedAt.toISOString(),
    };
    const feed: WorldActivityFeed = {
      userId: targetUserId,
      name,
      profile: summary,
      presence,
      actions: visibleTargetActions.map(action => toWorldSocialAction(action, names)),
      chatMessages: visibleTargetMessages,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ feed });
  } catch (err: unknown) {
    console.error('GET /api/world-activity error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
