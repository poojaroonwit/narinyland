import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';

/**
 * PUT /api/lands/:id
 * Update a land (name, isActive).
 * When setting isActive = true, deactivate all other lands in the same circle.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(req);
    if (isConfigAccessDenied(access)) return access.response;

    const { id } = await context.params;
    const data = await req.json();
    const { configId } = access;

    const existingLand = await prisma.land.findFirst({
      where: { id, configId },
      select: { id: true },
    });
    if (!existingLand) {
      return NextResponse.json({ error: 'Land not found' }, { status: 404 });
    }

    // If activating this land, deactivate all others in the same circle first
    if (data.isActive === true) {
      await prisma.land.updateMany({
        where: { configId, id: { not: id } },
        data: { isActive: false },
      });
    }

    const updated = await prisma.land.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { items: true },
    });

    await redis.del(`app_config:${configId}`);

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('PUT /api/lands/:id error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/lands/:id
 * Delete a land and all its purchased items (cascaded by Prisma).
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(req);
    if (isConfigAccessDenied(access)) return access.response;

    const { id } = await context.params;
    const { configId } = access;

    const existingLand = await prisma.land.findFirst({
      where: { id, configId },
      select: { id: true },
    });
    if (!existingLand) {
      return NextResponse.json({ error: 'Land not found' }, { status: 404 });
    }

    await prisma.land.delete({ where: { id } });
    await redis.del(`app_config:${configId}`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('DELETE /api/lands/:id error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
