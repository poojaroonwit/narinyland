import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getConfigId } from '@/lib/get-config-id';

// GET all albums
export async function GET(request: Request) {
  const configId = getConfigId(request);
  try {
    const albums = await prisma.album.findMany({
      where: { configId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(albums);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create album
export async function POST(request: Request) {
  const configId = getConfigId(request);
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const album = await prisma.album.create({
      data: {
        name,
        configId
      }
    });
    
    return NextResponse.json(album);
  } catch (error: any) {
    console.error('Create album error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
