import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * PUT /api/lands/:id
 * Update a land (name, isActive).
 * When setting isActive = true, deactivate all other lands in the same circle.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const circleId = req.headers.get('x-circle-id') || 'default';

    // If activating this land, deactivate all others in the same circle first
    if (data.isActive === true) {
      await prisma.land.updateMany({
        where: { configId: circleId, id: { not: id } },
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

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('PUT /api/lands/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/lands/:id
 * Delete a land and all its purchased items (cascaded by Prisma).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.land.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/lands/:id error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
