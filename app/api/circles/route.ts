import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthSession, refreshSession } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { addCircleMemberViaServer, createCircleViaServer } from '@/lib/appkit-server';
import { getErrorMessage } from '@/lib/errors';
import { debugLog, debugWarn } from '@/lib/logger';
import { ensureActiveLand } from '@/lib/config-access';
import { redis } from '@/lib/redis';

type AppKitCircle = {
  id?: string;
  _id?: string;
  name?: string;
  role?: string;
  memberCount?: number;
  createdAt?: string;
  data?: AppKitCircle;
  circle?: AppKitCircle;
  [key: string]: unknown;
};

type CircleCreateBody = { name?: string; description?: string };

const APPKIT_TIMEOUT_MS = 8_000;

function appKitDomain(): string {
  return (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app')
    .trim()
    .replace(/\/+$/, '');
}

function extractCircleList(payload: unknown): AppKitCircle[] {
  const candidates = [
    payload,
    payload && typeof payload === 'object' ? (payload as { circles?: unknown }).circles : undefined,
    payload && typeof payload === 'object' ? (payload as { data?: unknown }).data : undefined,
    payload && typeof payload === 'object' && (payload as { data?: unknown }).data && typeof (payload as { data?: unknown }).data === 'object'
      ? ((payload as { data: { circles?: unknown } }).data).circles
      : undefined,
  ];
  for (const candidate of candidates) if (Array.isArray(candidate)) return candidate as AppKitCircle[];
  return [];
}

function extractCircleId(payload: AppKitCircle | null | undefined): string {
  const data = payload?.data || payload?.circle || payload;
  return data?.id || data?._id || '';
}

async function fetchUserCircles(token: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPKIT_TIMEOUT_MS);
  try {
    return await fetch(`${appKitDomain()}/api/v1/circles`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function localCirclesForUser(userId: string) {
  return prisma.appConfig.findMany({
    where: {
      partners: {
        some: { OR: [{ partnerId: userId }, { userId }] },
      },
    },
    include: { lands: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    let token = session.token;
    const { userId, error, status } = session;
    if (error || !userId) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    // When a live AppKit token is available, reconcile only circles AppKit says
    // this user can see. A long-lived opaque Narinyland session can still use
    // already-provisioned local circles without inventing new memberships.
    if (token) {
      let response: Response | null = null;
      try {
        response = await fetchUserCircles(token);
      } catch (err) {
        debugWarn('GET /api/circles AppKit fetch failed; using existing local memberships.', getErrorMessage(err));
      }

      if (response?.status === 401 && await refreshSession()) {
        token = (await cookies()).get('appkit_access_token')?.value;
        if (token) {
          try {
            response = await fetchUserCircles(token);
          } catch {
            response = null;
          }
        }
      }

      if (response?.ok) {
        const circles = extractCircleList(await response.json().catch(() => []));
        for (const circle of circles) {
          const id = extractCircleId(circle);
          if (!id) continue;
          await prisma.appConfig.upsert({
            where: { id },
            create: { id, appName: circle.name || 'Untitled World' },
            update: {},
          });
          await ensureActiveLand(id).catch(() => {});
          await prisma.partner.upsert({
            where: { configId_partnerId: { configId: id, partnerId: userId } },
            create: {
              partnerId: userId,
              userId,
              name: session.user?.name || 'Partner',
              avatar: session.user?.avatar || '',
              configId: id,
            },
            update: { userId },
          });
        }

        const localConfigs = await localCirclesForUser(userId);
        const localMap = new Map(localConfigs.map((config) => [config.id, config]));
        return NextResponse.json(circles.map((circle) => {
          const id = extractCircleId(circle);
          const local = localMap.get(id);
          return {
            ...circle,
            id,
            name: local?.appName || circle.name || 'Untitled World',
          };
        }).filter((circle) => circle.id));
      }
    }

    const configs = await localCirclesForUser(userId);
    debugLog('BFF /api/circles: returning existing local memberships.', { count: configs.length });
    return NextResponse.json(configs
      .filter((config) => Boolean(config.id) && config.id !== 'undefined')
      .map((config) => ({
        id: config.id,
        name: config.appName,
        description: config.appName,
        role: 'member',
        memberCount: undefined,
        createdAt: config.createdAt,
      })));
  } catch (err: unknown) {
    console.error('GET /api/circles error:', getErrorMessage(err));
    return NextResponse.json({ error: 'Failed to load circles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description } = (await req.json().catch(() => ({}))) as CircleCreateBody;
    const worldName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    const worldDescription = typeof description === 'string' && description.trim()
      ? description.trim().slice(0, 240)
      : worldName;
    if (!worldName) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const session = await getAuthSession(req);
    if (session.error || !session.userId) {
      return NextResponse.json({ error: session.error || 'unauthorized' }, { status: session.status || 401 });
    }

    let token = session.token;
    if (!token && await refreshSession()) token = (await cookies()).get('appkit_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'appkit_reauthentication_required' }, { status: 401 });

    let circleId = '';
    try {
      const circle = await createCircleViaServer(worldName, worldDescription, token) as AppKitCircle;
      circleId = extractCircleId(circle);
    } catch (appkitErr: unknown) {
      debugWarn('AppKit circle creation failed.', getErrorMessage(appkitErr));
      return NextResponse.json({ error: 'Could not create AppKit circle' }, { status: 502 });
    }
    if (!circleId) return NextResponse.json({ error: 'AppKit created no circle ID. Please try again.' }, { status: 502 });

    try {
      await addCircleMemberViaServer(circleId, session.userId, 'owner', token);
    } catch (memberErr: unknown) {
      // A service-created circle without a proven owner is unsafe to expose.
      debugWarn('AppKit creator owner association failed.', getErrorMessage(memberErr));
      return NextResponse.json({ error: 'Could not associate circle owner' }, { status: 502 });
    }

    const config = await prisma.appConfig.upsert({
      where: { id: circleId },
      create: { id: circleId, appName: worldName },
      update: { appName: worldName },
    });

    await prisma.partner.upsert({
      where: { configId_partnerId: { configId: circleId, partnerId: session.userId } },
      create: {
        partnerId: session.userId,
        userId: session.userId,
        name: session.user?.name || 'Partner',
        avatar: session.user?.avatar || '',
        configId: circleId,
      },
      update: { userId: session.userId },
    });

    await ensureActiveLand(circleId);
    const land = await prisma.land.findFirstOrThrow({
      where: { configId: circleId, isActive: true },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    await prisma.land.updateMany({
      where: { configId: circleId, id: { not: land.id }, isActive: true },
      data: { isActive: false },
    });
    await redis.del(`app_config:${circleId}`).catch(() => {});

    return NextResponse.json({
      circleId,
      id: circleId,
      name: worldName,
      description: worldDescription,
      creatorLinked: true,
      role: 'owner',
      config,
      defaultLand: land,
    });
  } catch (err: unknown) {
    console.error('POST /api/circles error:', getErrorMessage(err));
    return NextResponse.json({ error: 'Failed to create circle' }, { status: 500 });
  }
}
