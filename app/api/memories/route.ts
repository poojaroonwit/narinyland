import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { uploadMemoryImage } from '@/lib/storage';
import { redis } from '@/lib/redis';
import { validateUploadFile } from '@/lib/upload-validation';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { createHash } from 'crypto';

// Generate ETag for cache validation
type MemoryCreateBody = {
  url?: string | null;
  privacy?: string;
  caption?: string | null;
};

function generateETag(data: unknown): string {
  const dataString = JSON.stringify(data);
  const hash = createHash('md5').update(dataString).digest('hex');
  return `"${hash}"`;
}

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

// GET /api/memories
export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { searchParams } = new URL(request.url);
    const privacy = searchParams.get('privacy');
    const { configId } = access;

    if (privacy && !['all', 'public', 'private'].includes(privacy)) {
      return NextResponse.json({ error: 'Invalid privacy filter' }, { status: 400 });
    }

    // Create cache key based on privacy filter
    const cacheKey = getMemoryCacheKey(configId, privacy);
    
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsedData = JSON.parse(cached);
      return NextResponse.json(parsedData, {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
          'ETag': generateETag(parsedData),
        }
      });
    }

    const where: Prisma.MemoryWhereInput = { configId };
    if (privacy && privacy !== 'all') {
      where.privacy = privacy;
    }

    const memories = await prisma.memory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    // Cache for 5 minutes (300 seconds)
    await redis.setex(cacheKey, 300, JSON.stringify(memories));

    return NextResponse.json(memories, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        'ETag': generateETag(memories),
      }
    });
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
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const contentType = request.headers.get('content-type') || '';
    
    let file: File | null = null;
    let url: string | null = null;
    let privacy: string = 'public';
    let caption: string | null = null;

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as MemoryCreateBody;
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

    if (!['public', 'private'].includes(privacy)) {
      return NextResponse.json({ error: 'Invalid privacy value' }, { status: 400 });
    }

    let s3Key: string | null = null;

    if (file) {
      const validationError = validateUploadFile(file);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadMemoryImage(
        buffer,
        file.name,
        file.type,
        configId
      );
      url = result.url;
      s3Key = result.key;
    }

    if (!url) {
      return NextResponse.json({ error: 'Either a file or URL is required' }, { status: 400 });
    }

    const maxOrder = await prisma.memory.aggregate({
      where: { configId },
      _max: { sortOrder: true },
    });
    const newOrder = (maxOrder._max.sortOrder || 0) + 1;

    const memory = await prisma.memory.create({
      data: {
        url,
        s3Key,
        privacy,
        caption,
        sortOrder: newOrder,
        configId,
      },
    });

    await invalidateMemoryCache(configId);

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error('Error creating memory:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}
