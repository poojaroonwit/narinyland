import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

function getLettersCacheKey(configId: string): string {
  return `love_letters:${configId}`;
}

// PUT /api/letters/[id]/read
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const params = await props.params;
    const id = params.id;
    const { configId } = access;

    const existingLetter = await prisma.loveLetter.findFirst({
      where: { id, from: { configId } },
      select: { id: true },
    });
    if (!existingLetter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    const letter = await prisma.loveLetter.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    await redis.del(getLettersCacheKey(configId));

    return NextResponse.json({ success: true, isRead: letter.isRead });
  } catch (error) {
    console.error('Error marking letter as read:', error);
    return NextResponse.json({ error: 'Failed to mark letter as read' }, { status: 500 });
  }
}
