import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

/**
 * GET /api/lands
 * List all lands for the active circle (read from X-Circle-Id header).
 */
export async function GET(req: NextRequest) {
  try {
    const access = await requireConfigAccess(req);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;

    const lands = await prisma.land.findMany({
      where: { configId },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(lands);
  } catch (err: any) {
    console.error('GET /api/lands error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/lands
 * Create a new land under the active circle.
 */
export async function POST(req: NextRequest) {
  try {
    const access = await requireConfigAccess(req);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Ensure the AppConfig exists
    await prisma.appConfig.upsert({
      where: { id: configId },
      create: { id: configId },
      update: {},
    });

    const land = await prisma.land.create({
      data: {
        name: name.trim(),
        isActive: false,
        configId,
      },
    });

    await redis.del(`app_config:${configId}`);

    return NextResponse.json(land);
  } catch (err: any) {
    console.error('POST /api/lands error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
