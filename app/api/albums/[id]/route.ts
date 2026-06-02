import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

// DELETE album
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { id } = await params;
    const { configId } = access;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const album = await prisma.album.findFirst({
      where: { id, configId },
      select: { id: true },
    });
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    await prisma.album.delete({
      where: { id }
    });

    await redis.del(`app_config:${configId}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete album error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
