import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

function getMemoryCacheKey(configId: string, privacy: string | null): string {
  return `memories:${configId}:${privacy || 'all'}`;
}

async function invalidateMemoryCache(configId: string) {
  await Promise.all([
    redis.del(getMemoryCacheKey(configId, null)),
    redis.del(getMemoryCacheKey(configId, 'public')),
    redis.del(getMemoryCacheKey(configId, 'private')),
  ]);
}

// PUT /api/memories/reorder
export async function PUT(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const body = await request.json();
    const { orderedIds } = body; // Array of IDs in new order

    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'string')) {
        return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    const uniqueIds = new Set(orderedIds);
    if (uniqueIds.size !== orderedIds.length) {
      return NextResponse.json({ error: 'orderedIds must not contain duplicates' }, { status: 400 });
    }

    const ownedMemories = await prisma.memory.findMany({
      where: { id: { in: orderedIds }, configId },
      select: { id: true },
    });
    if (ownedMemories.length !== orderedIds.length) {
      return NextResponse.json({ error: 'One or more memories were not found' }, { status: 404 });
    }

    const updates = orderedIds.map((id: string, index: number) =>
      prisma.memory.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await prisma.$transaction(updates);
    await invalidateMemoryCache(configId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering memories:', error);
    return NextResponse.json({ error: 'Failed to reorder memories' }, { status: 500 });
  }
}
