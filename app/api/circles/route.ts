import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { createCircleViaServer } from '@/lib/appkit-server';

export async function GET(req: NextRequest) {
  try {
    let { token, error, status } = await getAuthSession(req);
    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    const circleId = req.headers.get('x-circle-id');
    const domain = (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'https://appkits.up.railway.app').trim();

    // Helper to check if token is valid (this GET route primarily uses Prisma, 
    // but we can use the token to verify the user exists if needed, 
    // or just let Prisma handle the data since the session is valid).
    // Actually, for consistency, let's just use the token we have.

    // If a specific circle is requested, return its config
    if (circleId) {
      const config = await prisma.appConfig.findUnique({
        where: { id: circleId },
        include: { lands: { orderBy: { createdAt: 'asc' } } },
      });
      return NextResponse.json(config || null);
    }

    // Otherwise return all configs (for listing purposes)
    const configs = await prisma.appConfig.findMany({
      include: { lands: { orderBy: { createdAt: 'asc' } } },
    });
    return NextResponse.json(configs);
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
    let { token, error, status } = await getAuthSession(req);

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

      circleId = circle.id || circle._id;
    } catch (appkitErr: any) {
      console.warn('AppKit circle creation failed, generating local ID:', appkitErr.message);
      circleId = `world_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
