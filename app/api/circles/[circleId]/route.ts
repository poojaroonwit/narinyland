import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { updateCircleViaServer, deleteCircleViaServer } from '@/lib/appkit-server';
import { redis } from '@/lib/redis';

export async function PUT(
  req: NextRequest,
  { params }: { params: { circleId: string } }
) {
  try {
    const { circleId } = await params;
    const { name, description } = await req.json();

    let { token, error, status } = await getAuthSession(req);
    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    // 1. Update in AppKit
    await updateCircleViaServer(circleId, { name, description }, token);

    // 2. Update local AppConfig name if it exists
    const config = await prisma.appConfig.update({
      where: { id: circleId },
      data: { appName: name },
    }).catch(() => null);

    // 3. Invalidate cache
    const cacheKey = `app_config:${circleId}`;
    await redis.del(cacheKey).catch(() => {});

    return NextResponse.json({ success: true, circleId, name, config });
  } catch (err: any) {
    console.error(`PUT /api/circles/${params.circleId} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { circleId: string } }
) {
  try {
    const { circleId } = await params;

    let { token, error, status } = await getAuthSession(req);
    if (error || !token) {
      return NextResponse.json({ error: error || 'unauthorized' }, { status: status || 401 });
    }

    // 1. Delete in AppKit
    await deleteCircleViaServer(circleId, token);

    // 2. Cleanup local Narinyland data
    // Deleting AppConfig will cascade delete partners, lands, coupons, timeline, etc.
    await prisma.appConfig.delete({
      where: { id: circleId },
    }).catch((e) => {
      console.warn(`Local AppConfig cleanup skip: ${e.message}`);
    });

    // 3. Invalidate cache
    const cacheKey = `app_config:${circleId}`;
    await redis.del(cacheKey).catch(() => {});

    return NextResponse.json({ success: true, message: 'World deleted and data cleaned up' });
  } catch (err: any) {
    console.error(`DELETE /api/circles/${params.circleId} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
