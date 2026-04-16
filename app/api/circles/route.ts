import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { createCircleViaServer } from '@/lib/appkit-server';

export async function GET(req: NextRequest) {
  try {
    let { token, userId, error, status, isSoft } = await getAuthSession(req);
    console.log('BFF /api/circles: Session resolved:', { hasToken: !!token, userId, isSoft, error });

    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    const circleId = req.headers.get('x-circle-id');
    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();

    // Helper to check if token is valid (this GET route primarily uses Prisma, 
    // but we can use the token to verify the user exists if needed, 
    // 1. AppKit Fetch (Skip for soft sessions)
    if (!isSoft) {
      const fetchCircles = (t: string) => fetch(`${domain}/api/v1/circles`, {
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      let res = await fetchCircles(token);

      // --- 401 RETRY LOGIC ---
      if (res.status === 401) {
        console.log('BFF /api/circles: 401 from AppKit, attempting refresh...');
        const { refreshSession } = await import('@/lib/auth-server');
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();

        const refreshed = await refreshSession();
        if (refreshed) {
          const newToken = cookieStore.get('appkit_access_token')?.value;
          if (newToken) {
            token = newToken;
            res = await fetchCircles(token);
          }
        } else {
          // Refresh failed - no refresh token available. Clear auth cookies
          // to force frontend re-authentication and prevent infinite loops.
          console.warn('BFF /api/circles: Token refresh failed (no refresh token). Clearing auth state.');
          cookieStore.delete('appkit_access_token');
          cookieStore.delete('narinyland_is_auth');
          return NextResponse.json(
            { error: 'session_expired', error_description: 'Session expired. Please sign in again.' },
            { status: 401 }
          );
        }
      }

      if (res.ok) {
        const data = await res.json();
        const circles = Array.isArray(data) ? data : (data.circles || data.data || []);

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

          // Ensure Partner record exists linking user to this config
          const existingPartner = await prisma.partner.findUnique({
            where: { configId_partnerId: { configId: id, partnerId: userId } },
          });
          if (!existingPartner) {
            await prisma.partner.create({
              data: {
                partnerId: userId,
                name: circle.name || 'Partner',
                avatar: '',
                configId: id,
              },
            }).catch(() => {}); // Ignore conflicts
            console.log('BFF /api/circles: Auto-created Partner for existing circle:', id, 'user:', userId);
          }
        }

        const localConfigs = await prisma.appConfig.findMany({
          select: { id: true, appName: true },
        });
        const localConfigMap = new Map(localConfigs.map((c) => [c.id, c]));

        const mergedCircles = circles.map((circle: any) => {
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

      const appkitError = await res.json().catch(() => ({}));
      console.warn('GET /api/circles AppKit fallback to local configs:', { status: res.status, appkitError });
    }

    // 2. Local Fallback (Prisma)
    // IMPORTANT: Filter by userId (partnerId) to avoid leaking other users' data!
    let configs: any[] = [];
    if (userId) {
      console.log('BFF /api/circles: Querying Prisma for userId:', userId);
      configs = await prisma.appConfig.findMany({
        where: {
          partners: { some: { partnerId: userId } }
        },
        include: { lands: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      });
      console.log('BFF /api/circles: Prisma returned configs:', configs.length, configs.map(c => ({ id: c.id, name: c.appName })));

      // MIGRATION: If user has no partners but circles exist, auto-create partner for first circle
      // This handles legacy circles created before Partner records were added
      if (configs.length === 0) {
        const orphanedConfig = await prisma.appConfig.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        if (orphanedConfig) {
          console.log('BFF /api/circles: No partners found but orphaned config exists:', orphanedConfig.id, '- creating Partner record');
          try {
            await prisma.partner.create({
              data: {
                partnerId: userId,
                name: 'Partner',
                avatar: '',
                configId: orphanedConfig.id,
              },
            });
            configs = [orphanedConfig];
          } catch (err) {
            console.warn('BFF /api/circles: Failed to create Partner for orphaned config:', err);
          }
        }
      }
    } else {
      console.warn('BFF /api/circles: No userId available for local fallback');
    }

    return NextResponse.json(
      configs.map((config) => ({
        id: config.id,
        name: config.appName,
        description: config.appName,
        role: 'member',
        memberCount: undefined,
        createdAt: config.createdAt,
      }))
    );
  } catch (err: any) {
    console.error('GET /api/circles error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/circles
 * Creates a new world (circle) in AppKit, then provisions a local
 * AppConfig row + a default Land so data can be stored immediately.
 */
export async function POST(req: NextRequest) {
  try {
    const { name, description, userId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // 1. Create circle in AppKit
    let circleId: string;
    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();
    let { token, userId: sessionUserId, error, status, isSoft } = await getAuthSession(req);

    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    try {
      let circle = await createCircleViaServer(name, description, token);
      
      // Proactive retry on 401 for creation too
      if (!circle.id && !circle._id) {
         console.log('BFF Circles: Creation might have failed due to token issues. Attempting refresh...');
         const { refreshSession } = await import('@/lib/auth-server');
         if (await refreshSession()) {
           const { cookies } = await import('next/headers');
           token = (await cookies()).get('appkit_access_token')?.value || '';
           if (token) {
              circle = await createCircleViaServer(name, description, token);
           }
         }
      }

      // Handle different possible response structures (root, .data, or .circle)
      const data = circle.data || circle.circle || circle;
      circleId = data.id || data._id;
    } catch (appkitErr: any) {
      console.warn('AppKit circle creation failed, generating local ID:', appkitErr.message);
      circleId = `world_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    // Final safety guard: If AppKit reported SUCCESS but didn't return an ID, 
    // we must still ensure circleId is defined before Prisma upsert.
    if (!circleId) {
       console.warn('AppKit response missing ID, using fallback');
       circleId = `world_${Date.now()}`;
    }

    // 2. Provision local AppConfig for this circle/world
    const config = await prisma.appConfig.upsert({
      where: { id: circleId },
      create: {
        id: circleId,
        appName: name,
      },
      update: {},
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
          const userData = await userRes.json();
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
            name: userName,
            avatar: userAvatar,
            configId: circleId,
          },
          update: {},
        });
        console.log('BFF /api/circles: Created Partner record for user:', sessionUserId, 'in config:', circleId);
      } catch (partnerErr) {
        console.warn('BFF /api/circles: Failed to create Partner record:', partnerErr);
        // Don't fail the whole request if partner creation fails
      }
    }

    // 3. Create a default Land inside this world
    const land = await prisma.land.create({
      data: {
        name: 'Main Land',
        isActive: true,
        configId: circleId,
      },
    });

    return NextResponse.json({
      id: circleId,
      name,
      description: description || name,
      config,
      defaultLand: land,
    });
  } catch (err: any) {
    console.error('POST /api/circles error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
