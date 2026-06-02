import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

// PUT /api/purchased-items/[id]
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = await request.json();
    const { x, y, z, rotation } = body;
    const { id } = await context.params;
    const { configId } = access;

    const existingItem = await prisma.purchasedItem.findFirst({
      where: { id, land: { configId } },
      select: { id: true },
    });
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = await prisma.purchasedItem.update({
      where: { id },
      data: {
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(z !== undefined && { z }),
        ...(rotation !== undefined && { rotation }),
      }
    });

    // Invalidate cache
    await redis.del(`app_config:${configId}`);

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE /api/purchased-items/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { id } = await context.params;
    const { configId } = access;

    const existingItem = await prisma.purchasedItem.findFirst({
      where: { id, land: { configId } },
      select: { id: true },
    });
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.purchasedItem.delete({
      where: { id },
    });

    // Invalidate cache
    await redis.del(`app_config:${configId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
