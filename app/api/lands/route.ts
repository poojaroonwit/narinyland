import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getConfigId } from '@/lib/get-config-id';

// GET /api/lands
export async function GET(request: Request) {
  const configId = getConfigId(request);
  try {
    const lands = await prisma.land.findMany({
      where: { configId },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    return NextResponse.json(lands);
  } catch (error) {
    console.error('Error fetching lands:', error);
    return NextResponse.json({ error: 'Failed to fetch lands' }, { status: 500 });
  }
}

// POST /api/lands
export async function POST(request: Request) {
  const configId = getConfigId(request);
  try {
    const body = await request.json();
    const { name, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // If making this active, deactivate others
    if (isActive) {
      await prisma.land.updateMany({
        where: { configId },
        data: { isActive: false }
      });
    }

    const land = await prisma.land.create({
      data: {
        name,
        isActive: isActive || false,
        configId
      },
      include: { items: true }
    });

    // Invalidate cache
    await redis.del('app_config');

    return NextResponse.json(land, { status: 201 });
  } catch (error) {
    console.error('Error creating land:', error);
    return NextResponse.json({ error: 'Failed to create land' }, { status: 500 });
  }
}
