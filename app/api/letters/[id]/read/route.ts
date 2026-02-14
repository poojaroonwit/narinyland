import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT /api/letters/[id]/read
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;

    const letter = await prisma.loveLetter.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, isRead: letter.isRead });
  } catch (error) {
    console.error('Error marking letter as read:', error);
    return NextResponse.json({ error: 'Failed to mark letter as read' }, { status: 500 });
  }
}
