import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';

// GET all albums
export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const albums = await prisma.album.findMany({
      where: { configId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(albums);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

// POST create album
export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const album = await prisma.album.create({
      data: {
        name,
        configId
      }
    });

    await redis.del(`app_config:${configId}`);
    
    return NextResponse.json(album);
  } catch (error: unknown) {
    console.error('Create album error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
