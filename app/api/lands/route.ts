import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/lands
 * List all lands for the active circle (read from X-Circle-Id header).
 */
export async function GET(req: NextRequest) {
  try {
    const circleId = req.headers.get('x-circle-id') || 'default';

    const lands = await prisma.land.findMany({
      where: { configId: circleId },
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
    const circleId = req.headers.get('x-circle-id') || 'default';
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Ensure the AppConfig exists
    await prisma.appConfig.upsert({
      where: { id: circleId },
      create: { id: circleId },
      update: {},
    });

    const land = await prisma.land.create({
      data: {
        name: name.trim(),
        isActive: false,
        configId: circleId,
      },
    });

    return NextResponse.json(land);
  } catch (err: any) {
    console.error('POST /api/lands error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
