import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT /api/memories/reorder
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { orderedIds } = body; // Array of IDs in new order

    if (!Array.isArray(orderedIds)) {
        return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    const updates = orderedIds.map((id: string, index: number) =>
      prisma.memory.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering memories:', error);
    return NextResponse.json({ error: 'Failed to reorder memories' }, { status: 500 });
  }
}
