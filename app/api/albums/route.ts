import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all albums
export async function GET(request: Request) {
  try {
    const albums = await prisma.album.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(albums);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create album
export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const album = await prisma.album.create({
      data: {
        name,
        configId: 'default' // Using the default app config for this project
      }
    });
    
    return NextResponse.json(album);
  } catch (error: any) {
    console.error('Create album error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
