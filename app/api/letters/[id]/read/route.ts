import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { id } = await props.params;
    const existingLetter = await prisma.loveLetter.findFirst({
      where: { id, from: { configId: access.configId } },
      select: { id: true, unlockDate: true },
    });
    if (!existingLetter) return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    if (existingLetter.unlockDate.getTime() > Date.now()) {
      return NextResponse.json({ error: 'Letter is still locked' }, { status: 409 });
    }

    const letter = await prisma.loveLetter.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true, isRead: letter.isRead });
  } catch (error) {
    console.error('Error marking letter as read:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to mark letter as read' }, { status: 500 });
  }
}
