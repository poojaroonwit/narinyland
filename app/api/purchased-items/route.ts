import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

// GET /api/purchased-items
export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const { searchParams } = new URL(request.url);
    const landId = searchParams.get('landId');
    
    if (!landId) {
      return NextResponse.json({ error: 'landId is required' }, { status: 400 });
    }

    const land = await prisma.land.findFirst({
      where: { id: landId, configId },
      select: { id: true },
    });
    if (!land) {
      return NextResponse.json({ error: 'Land not found' }, { status: 404 });
    }

    const items = await prisma.purchasedItem.findMany({
      where: { landId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

// POST /api/purchased-items
export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const body = await request.json();
    const { type, landId, x, y, z, rotation, modelUrl } = body;
    
    if (!type || !landId) {
      return NextResponse.json({ error: 'Type and landId are required' }, { status: 400 });
    }

    const land = await prisma.land.findFirst({
      where: { id: landId, configId },
      select: { id: true },
    });
    if (!land) {
      return NextResponse.json({ error: 'Land not found' }, { status: 404 });
    }

    const item = await prisma.purchasedItem.create({
      data: {
        type,
        landId,
        x: x || 0,
        y: y || 0,
        z: z || 0,
        rotation: rotation || 0,
        modelUrl: modelUrl || null
      }
    });

    // Invalidate cache
    await redis.del(`app_config:${configId}`);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
