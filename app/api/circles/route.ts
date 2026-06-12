import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
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
  data?: AppKitCircle;
  circle?: AppKitCircle;
  [key: string]: unknown;
};

type CircleCreateBody = {
  name?: string;
  description?: string;
};

function extractCircleList(payload: unknown): AppKitCircle[] {
  const candidates = [
    payload,
    payload && typeof payload === 'object' ? (payload as { circles?: unknown }).circles : undefined,
    payload && typeof payload === 'object' ? (payload as { data?: unknown }).data : undefined,
    payload && typeof payload === 'object' && (payload as { data?: unknown }).data && typeof (payload as { data?: unknown }).data === 'object'
      ? ((payload as { data: { circles?: unknown } }).data).circles
      : undefined,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as AppKitCircle[];
  }

  return [];
}

function extractCircleId(payload: AppKitCircle | null | undefined): string {
  const data = payload?.data || payload?.circle || payload;
  return data?.id || data?._id || '';
}

async function userTokenCanSeeCircle(domain: string, token: string, circleId: string): Promise<boolean> {
  if (!token || token.startsWith('name_session_')) return false;

  try {
    const res = await fetch(`${domain}/api/v1/circles`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) return false;

    const circles = extractCircleList(await res.json());
    return circles.some((circle) => extractCircleId(circle) === circleId);
  } catch (err: unknown) {
    debugWarn('BFF /api/circles: Could not verify creator circle visibility.', getErrorMessage(err));
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    let token = session.token;
    const { userId, error, status, isSoft } = session;
    debugLog('BFF /api/circles: Session resolved.', { hasToken: !!token, hasUserId: !!userId, isSoft, hasError: !!error });

    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();

    // Helper to check if token is valid (this GET route primarily uses Prisma, 
    // but we can use the token to verify the user exists if needed, 
    // 1. AppKit Fetch (Skip for soft sessions)
    if (!isSoft) {
      const fetchCircles = (t: string) => fetch(`${domain}/api/v1/circles`, {
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      let res: Response | null = null;
      try {
        res = await fetchCircles(token);
      } catch (fetchErr: unknown) {
        debugWarn('GET /api/circles AppKit fetch failed, falling back to local configs.', getErrorMessage(fetchErr));
      }

      // --- 401 RETRY LOGIC ---
      if (res?.status === 401) {
        debugLog('BFF /api/circles: 401 from AppKit, attempting refresh.');
        const { refreshSession } = await import('@/lib/auth-server');
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();

        const refreshed = await refreshSession();
        if (refreshed) {
          const newToken = cookieStore.get('appkit_access_token')?.value;
          if (newToken) {
            token = newToken;
            try {
              res = await fetchCircles(token);
            } catch (fetchErr: unknown) {
              debugWarn('GET /api/circles AppKit retry failed, falling back to local configs.', getErrorMessage(fetchErr));
              res = null;
            }
          }
        } else {
          // Refresh failed - no refresh token available.
          // Clear the expired token and fall through to local Prisma fallback.
          debugWarn('BFF /api/circles: Token refresh failed. Falling back to local configs.');
          cookieStore.delete('appkit_access_token');
          // Don't return 401 - let the code fall through to local fallback below
        }
      }

      if (res?.ok) {
        const data = await res.json();
        const circles = extractCircleList(data);

        // Ensure local AppConfig and Partner records exist for circles from AppKit
        for (const circle of circles) {
          const id = circle.id || circle._id;
          if (!id || !userId) continue;

          // Ensure local config exists
          const existingConfig = await prisma.appConfig.findUnique({ where: { id } });
          if (!existingConfig) {
            await prisma.appConfig.create({
              data: { id, appName: circle.name || 'Untitled World' },
            }).catch(() => {}); // Ignore conflicts
          }
          await ensureActiveLand(id).catch((err) => {
            debugWarn('BFF /api/circles: Failed to ensure active land.', { circleId: id, error: getErrorMessage(err) });
          });

          // Ensure Partner record exists linking user to this config
          const existingPartner = await prisma.partner.findUnique({
            where: { configId_partnerId: { configId: id, partnerId: userId } },
          });
          if (!existingPartner) {
            await prisma.partner.create({
              data: {
                partnerId: userId,
                userId,
                name: circle.name || 'Partner',
                avatar: '',
                configId: id,
              },
            }).catch(() => {}); // Ignore conflicts
            debugLog('BFF /api/circles: Auto-created partner for existing circle.', { circleId: id, hasUserId: !!userId });
          }
        }

        const localConfigs = await prisma.appConfig.findMany({
          select: { id: true, appName: true },
        });
        const localConfigMap = new Map(localConfigs.map((c) => [c.id, c]));

        const mergedCircles = circles.map((circle) => {
          const id = circle.id || circle._id;
          if (!id) return null;

          const localConfig = localConfigMap.get(id);
          return {
            ...circle,
            id,
            name: localConfig?.appName || circle.name || 'Untitled World',
          };
        }).filter(Boolean);

        return NextResponse.json(mergedCircles);
      }

      if (res) {
        const appkitError = await res.json().catch(() => ({}));
        debugWarn('GET /api/circles AppKit fallback to local configs.', { status: res.status, appkitError });
      }
    }

    // 2. Local Fallback (Prisma)
    // IMPORTANT: Filter by userId (partnerId) to avoid leaking other users' data!
    let configs: Awaited<ReturnType<typeof prisma.appConfig.findMany>> = [];
    if (userId) {
      debugLog('BFF /api/circles: Querying Prisma for user.', { hasUserId: !!userId });
      configs = await prisma.appConfig.findMany({
        where: {
          partners: {
            some: {
              OR: [{ partnerId: userId }, { userId }],
            },
          }
        },
        include: { lands: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      });
      debugLog('BFF /api/circles: Prisma returned configs.', { count: configs.length });

      // MIGRATION: If user has no partners but circles exist, auto-create partner for first circle
      // This handles legacy circles created before Partner records were added
      if (configs.length === 0) {
        const orphanedConfig = await prisma.appConfig.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        if (orphanedConfig) {
          debugLog('BFF /api/circles: No partners found but orphaned config exists; creating partner record.', { configId: orphanedConfig.id });
          try {
            await prisma.partner.create({
              data: {
                partnerId: userId,
                userId,
                name: 'Partner',
                avatar: '',
                configId: orphanedConfig.id,
              },
            });
            configs = [orphanedConfig];
          } catch (err) {
            debugWarn('BFF /api/circles: Failed to create partner for orphaned config.', err);
          }
        }
      }
    } else {
      debugWarn('BFF /api/circles: No userId available for local fallback.');
    }

    // Filter out any configs without valid IDs and log for debugging
    const validConfigs = configs.filter(config => {
      if (!config.id || config.id === 'undefined') {
        debugWarn('BFF /api/circles: Filtering out config with invalid ID.', { name: config.appName });
        return false;
      }
      return true;
    });

    debugLog('BFF /api/circles: Returning valid circles.', { count: validConfigs.length });

    return NextResponse.json(
      validConfigs.map((config) => ({
        id: config.id,
        name: config.appName,
        description: config.appName,
        role: 'member',
        memberCount: undefined,
        createdAt: config.createdAt,
      }))
    );
  } catch (err: unknown) {
    console.error('GET /api/circles error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/**
 * POST /api/circles
 * Creates a new world (circle) in AppKit, then provisions a local
 * AppConfig row + a default Land so data can be stored immediately.
 */
export async function POST(req: NextRequest) {
  try {
    const { name, description } = (await req.json()) as CircleCreateBody;
    const worldName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    const worldDescription = typeof description === 'string' && description.trim()
      ? description.trim().slice(0, 240)
      : worldName;

    if (!worldName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // 1. Create circle in AppKit
    let circleId: string;
    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    const session = await getAuthSession(req);
    let token = session.token;
    const { userId: sessionUserId, error, status, isSoft } = session;

    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    if (!sessionUserId) {
      return NextResponse.json({ error: 'Could not identify the current user.' }, { status: 401 });
    }

    try {
      let circle = await createCircleViaServer(worldName, worldDescription, token) as AppKitCircle;

      // Proactive retry when AppKit returns an unexpected shape, which can happen
      // after an expired token is refreshed by middleware.
      if (!extractCircleId(circle)) {
         debugLog('BFF Circles: Creation response missing ID. Attempting refresh.');
         const { refreshSession } = await import('@/lib/auth-server');
         if (await refreshSession()) {
           const { cookies } = await import('next/headers');
           token = (await cookies()).get('appkit_access_token')?.value || '';
           if (token) {
              circle = await createCircleViaServer(worldName, worldDescription, token) as AppKitCircle;
           }
         }
      }

      // Handle different possible response structures (root, .data, or .circle)
      circleId = extractCircleId(circle);
    } catch (appkitErr: unknown) {
      debugWarn('AppKit circle creation failed.', getErrorMessage(appkitErr));
      return NextResponse.json(
        { error: `Could not create AppKit circle: ${getErrorMessage(appkitErr)}` },
        { status: 502 }
      );
    }

    if (!circleId) {
       debugWarn('AppKit response missing ID; refusing to create local-only world.');
       return NextResponse.json(
         { error: 'AppKit created no circle ID. Please try again.' },
         { status: 502 }
       );
    }

    let creatorLinked = false;
    try {
      await addCircleMemberViaServer(circleId, sessionUserId, 'member', token);
      creatorLinked = true;
    } catch (memberErr: unknown) {
      const message = getErrorMessage(memberErr);
      const isAlreadyMember = /already|exists|member/i.test(message);
      const creatorCanSeeCircle = isAlreadyMember || (!isSoft && await userTokenCanSeeCircle(domain, token, circleId));

      if (!creatorCanSeeCircle) {
        debugWarn('AppKit creator association failed.', { circleId, error: message });
        return NextResponse.json(
          { error: `Could not associate AppKit circle with user: ${message}` },
          { status: 502 }
        );
      }

      creatorLinked = true;
      debugWarn('AppKit creator association already satisfied or verified.', { circleId, error: message });
    }

    // 2. Provision local AppConfig for this circle/world
    const config = await prisma.appConfig.upsert({
      where: { id: circleId },
      create: {
        id: circleId,
        appName: worldName,
      },
      update: {
        appName: worldName,
      },
    });

    // 2b. Create Partner record for the creating user (so they can see their circles)
    // Use sessionUserId from auth (the actual logged-in user), not userId from request body
    if (sessionUserId) {
      try {
        // Fetch user info from AppKit to get name/avatar
        const userRes = await fetch(`${domain}/users/me`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        let userName = 'Partner';
        let userAvatar = '';
        if (userRes.ok) {
          const userData = await userRes.json() as { name?: string; given_name?: string; picture?: string; avatar?: string };
          userName = userData.name || userData.given_name || 'Partner';
          userAvatar = userData.picture || userData.avatar || '';
        }

        await prisma.partner.upsert({
          where: {
            configId_partnerId: {
              configId: circleId,
              partnerId: sessionUserId,
            },
          },
          create: {
            partnerId: sessionUserId,
            userId: sessionUserId,
            name: userName,
            avatar: userAvatar,
            configId: circleId,
          },
          update: { userId: sessionUserId },
        });
        debugLog('BFF /api/circles: Created partner record for circle creator.', { circleId, hasUserId: !!sessionUserId });
      } catch (partnerErr) {
        debugWarn('BFF /api/circles: Failed to create partner record.', partnerErr);
        // Don't fail the whole request if partner creation fails
      }
    }

    // 3. Ensure a default active Land exists inside this world.
    await ensureActiveLand(circleId);
    let land = await prisma.land.findFirst({
      where: { configId: circleId, isActive: true },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!land) {
      land = await prisma.land.create({
        data: {
          name: 'Main Land',
          isActive: true,
          configId: circleId,
        },
        include: { items: true },
      });
    }
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
      creatorLinked,
      role: 'member',
      config,
      defaultLand: land,
    });
  } catch (err: unknown) {
    console.error('POST /api/circles error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
