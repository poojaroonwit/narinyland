import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadMemoryImage } from '@/lib/s3';

// GET /api/memories
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const privacy = searchParams.get('privacy');

    const where: any = {};
    if (privacy && privacy !== 'all') {
      where.privacy = privacy;
    }

    const memories = await prisma.memory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/memories
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let file: File | null = null;
    let url: string | null = null;
    let privacy: string = 'public';
    let caption: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      url = body.url || null;
      privacy = body.privacy || 'public';
      caption = body.caption || null;
    } else {
      const formData = await request.formData();
      file = formData.get('image') as File | null;
      url = formData.get('url') as string | null;
      privacy = (formData.get('privacy') as string) || 'public';
      caption = (formData.get('caption') as string) || null;
    }

    let s3Key: string | null = null;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadMemoryImage(
        buffer,
        file.name,
        file.type
      );
      url = result.url;
      s3Key = result.key;
    }

    if (!url) {
      return NextResponse.json({ error: 'Either a file or URL is required' }, { status: 400 });
    }

    const maxOrder = await prisma.memory.aggregate({ _max: { sortOrder: true } });
    const newOrder = (maxOrder._max.sortOrder || 0) + 1;

    const memory = await prisma.memory.create({
      data: {
        url,
        s3Key,
        privacy,
        caption,
        sortOrder: newOrder,
      },
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error('Error creating memory:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}
