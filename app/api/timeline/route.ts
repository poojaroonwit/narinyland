import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadTimelineMedia } from '@/lib/s3';

import { redis } from '@/lib/redis';
import { getConfigId } from '@/lib/get-config-id';

// Generate ETag for cache validation
function generateETag(data: any): string {
  const dataString = JSON.stringify(data);
  const hash = require('crypto').createHash('md5').update(dataString).digest('hex');
  return `"${hash}"`;
}

// GET /api/timeline
export async function GET(request: Request) {
  const configId = getConfigId(request);
  const cacheKey = `timeline_events:${configId}`;
  try {
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsedData = JSON.parse(cached);
      return NextResponse.json(parsedData, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'ETag': generateETag(parsedData),
        }
      });
    }

    const events = await prisma.timelineEvent.findMany({
      where: { configId },
      orderBy: { timestamp: 'desc' },
    });

    const response = events.map((e) => {
      const mediaItems = e.mediaUrls?.map((url: string, i: number) => ({
        type: e.mediaTypes?.[i] || 'image',
        url: url
      })) || [];

      return {
        id: e.id,
        text: e.text,
        type: e.type,
        location: e.location,
        latitude: e.latitude,
        longitude: e.longitude,
        timestamp: e.timestamp.toISOString(),
        media: e.mediaUrl ? { type: e.mediaType, url: e.mediaUrl } : (mediaItems[0] || undefined),
        mediaItems: mediaItems.length > 0 ? mediaItems : (e.mediaUrl ? [{ type: e.mediaType, url: e.mediaUrl }] : [])
      };
    });

    // Cache for 5 minutes (300 seconds)
    await redis.setex(cacheKey, 300, JSON.stringify(response));

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'ETag': generateETag(response),
      }
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}

// POST /api/timeline
export async function POST(request: Request) {
  const configId = getConfigId(request);
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let text: string;
    let type: string = 'system';
    let location: string | undefined;
    let timestampStr: string;
    let files: File[] = [];
    let externalUrls: string[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      text = body.text;
      type = body.type || 'system';
      location = body.location;
      timestampStr = body.timestamp;
      // Handle array of media URLs if sent in JSON
      if (Array.isArray(body.mediaUrls)) {
          externalUrls = body.mediaUrls;
      } else if (body.mediaUrl) {
          externalUrls = [body.mediaUrl];
      }
    } else {
      const formData = await request.formData();
      text = formData.get('text') as string;
      type = (formData.get('type') as string) || 'system';
      location = (formData.get('location') as string) || undefined;
      timestampStr = formData.get('timestamp') as string;
      files = formData.getAll('media') as File[];
      
      const formUrls = formData.getAll('mediaUrls');
      if (formUrls.length > 0) {
        externalUrls = formUrls as string[];
      }
    }
    
    let mediaUrls: string[] = [];
    let mediaTypes: string[] = [];
    let mediaS3Keys: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        // Skip if not a File object
        if (!(file instanceof File)) continue;

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadTimelineMedia(buffer, file.name, file.type);
        mediaUrls.push(result.url);
        mediaS3Keys.push(result.key);
        
        if (file.type.startsWith('image/')) mediaTypes.push('image');
        else if (file.type.startsWith('video/')) mediaTypes.push('video');
        else if (file.type.startsWith('audio/')) mediaTypes.push('audio');
        else mediaTypes.push('image');
      }
    } else {
        // Handle external URLs if provided (complicated with FormData, usually separate fields)
        // If the client sends mediaUrls as separate fields, we can handle it.
        // But matching existing logic:
        if (externalUrls.length > 0) {
            mediaUrls = externalUrls as string[];
             // Basic type assumption if not provided
            mediaTypes = mediaUrls.map(() => 'image'); 
         }
    }

    const event = await prisma.timelineEvent.create({
      data: {
        text,
        type,
        location,
        configId,
        timestamp: new Date(timestampStr || Date.now()),
        // Fallback for singular fields (legacy support)
        mediaType: mediaTypes[0] || null,
        mediaUrl: mediaUrls[0] || null,
        mediaS3Key: mediaS3Keys[0] || null,
        // Multiple media fields
        mediaUrls,
        mediaTypes,
        mediaS3Keys,
      },
    });

    const mappedMediaItems = mediaUrls.map((url, i) => ({
      type: mediaTypes[i],
      url
    }));

    // Invalidate cache
    await redis.del(`timeline_events:${configId}`);

    return NextResponse.json({
      id: event.id,
      text: event.text,
      type: event.type,
      location: event.location,
      latitude: event.latitude,
      longitude: event.longitude,
      timestamp: event.timestamp.toISOString(),
      media: mappedMediaItems[0],
      mediaItems: mappedMediaItems
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating timeline event:', error);
    return NextResponse.json({ error: 'Failed to create timeline event' }, { status: 500 });
  }
}
