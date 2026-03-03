import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getConfigId } from '@/lib/get-config-id';

// PUT /api/lands/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const configId = getConfigId(request);
  try {
    const body = await request.json();
    const { name, isActive } = body;
    const { id } = await params;

    // If making this active, deactivate others in this circle's config
    if (isActive) {
      await prisma.land.updateMany({
        where: { configId },
        data: { isActive: false }
      });
    }

    const land = await prisma.land.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { items: true }
    });

    // Invalidate cache
    await redis.del('app_config');

    return NextResponse.json(land);
  } catch (error) {
    console.error('Error updating land:', error);
    return NextResponse.json({ error: 'Failed to update land' }, { status: 500 });
  }
}

// DELETE /api/lands/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    await prisma.land.delete({
      where: { id },
    });

    // Invalidate cache
    await redis.del('app_config');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting land:', error);
    return NextResponse.json({ error: 'Failed to delete land' }, { status: 500 });
  }
}
