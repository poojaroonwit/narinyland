import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { deleteFile, uploadTimelineMedia } from '@/lib/storage';
import { getMaxUploadBytes, validateUploadFile } from '@/lib/upload-validation';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

type TimelinePatchBody = {
  text?: string | null;
  type?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timestamp?: string | null;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// GET /api/timeline/[id]
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const params = await props.params;
    const id = params.id;
    const { configId } = access;

    const event = await prisma.timelineEvent.findFirst({
      where: { id: String(id), configId }
    });

    if (!event) {
      return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
    }

    const mediaItems = event.mediaUrls?.map((url: string, i: number) => ({
      type: event.mediaTypes?.[i] || 'image',
      url
    })) || [];

    return NextResponse.json({
      id: event.id,
      text: event.text,
      type: event.type,
      location: event.location,
      timestamp: event.timestamp.toISOString(),
      media: mediaItems[0],
      mediaItems: mediaItems
    });
  } catch (error) {
    console.error('Error fetching timeline event:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline event' }, { status: 500 });
  }
}

// POST /api/timeline/[id] - for FormData uploads
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const params = await props.params;
    const id = params.id;
    const { configId } = access;

    // Check ownership before parsing/uploading files.
    const existingEvent = await prisma.timelineEvent.findFirst({
      where: { id: String(id), configId }
    });

    if (!existingEvent) {
      const idInUse = await prisma.timelineEvent.findUnique({
        where: { id: String(id) },
        select: { id: true },
      });
      if (idInUse) {
        return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
      }
    }
    
    let formData: FormData;
    let text: string | null;
    let type: string | null;
    let location: string | null;
    let latitude: string | null;
    let longitude: string | null;
    let timestampStr: string | null;
    let files: File[];
    
    try {
      formData = await request.formData();
      text = formData.get('text') as string | null;
      type = formData.get('type') as string | null;
      location = formData.get('location') as string | null;
      latitude = formData.get('latitude') as string | null;
      longitude = formData.get('longitude') as string | null;
      timestampStr = formData.get('timestamp') as string | null;
      files = formData.getAll('media') as File[];
    } catch (formDataError) {
      console.error('❌ FormData parsing error:', formDataError);
      return NextResponse.json({ 
        error: 'Failed to parse form data', 
        details: 'Request body is too large or malformed. Please try with smaller files or check your upload.',
        suggestion: 'Maximum file size is 50MB. Try compressing large images before uploading.'
      }, { status: 400 });
    }

    const updateData: Prisma.TimelineEventUncheckedUpdateInput = {};
    if (text !== null && text !== '') updateData.text = text;
    if (type !== null && type !== '') updateData.type = type;
    if (location !== null && location !== '') updateData.location = location;
    if (latitude !== null && !isNaN(parseFloat(latitude))) updateData.latitude = parseFloat(latitude);
    if (longitude !== null && !isNaN(parseFloat(longitude))) updateData.longitude = parseFloat(longitude);
    if (timestampStr !== null && timestampStr !== '') updateData.timestamp = new Date(timestampStr);

    if (files && files.length > 0) {
      
      // Check total file size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const maxSize = getMaxUploadBytes();
      
      if (totalSize > maxSize) {
        return NextResponse.json({ 
          error: 'Files too large', 
          details: `Total file size is ${(totalSize / 1024 / 1024).toFixed(2)}MB, but maximum allowed is 50MB.`,
          suggestion: 'Please compress your files or upload smaller images.'
        }, { status: 400 });
      }
      
      // Check individual file sizes
      for (const file of files) {
        const validationError = validateUploadFile(file);
        if (validationError) {
          return NextResponse.json({ 
            error: validationError,
            file: file.name,
            suggestion: 'Please compress this file or upload a supported media type.'
          }, { status: 400 });
        }
      }
      
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      const mediaS3Keys: string[] = [];

      for (const file of files) {
        if (!(file instanceof File)) continue;
        
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = await uploadTimelineMedia(buffer, file.name, file.type, configId);
          mediaUrls.push(result.url);
          mediaS3Keys.push(result.key);
          
          if (file.type.startsWith('image/')) mediaTypes.push('image');
          else if (file.type.startsWith('video/')) mediaTypes.push('video');
          else if (file.type.startsWith('audio/')) mediaTypes.push('audio');
          else mediaTypes.push('image');
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }
      
      updateData.mediaUrls = mediaUrls;
      updateData.mediaTypes = mediaTypes;
      updateData.mediaS3Keys = mediaS3Keys;
      
      // Legacy fields
      updateData.mediaUrl = mediaUrls[0];
      updateData.mediaType = mediaTypes[0];
      updateData.mediaS3Key = mediaS3Keys[0];
    }

    if (!existingEvent) {
      
      // Create the timeline event if it doesn't exist
      const createData: Prisma.TimelineEventUncheckedCreateInput = {
        id: String(id),
        configId,
        text: text || '',
        type: type || 'system',
        location: location || undefined,
        latitude: latitude !== null && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : undefined,
        longitude: longitude !== null && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : undefined,
        timestamp: timestampStr ? new Date(timestampStr) : new Date(),
        mediaUrls: Array.isArray(updateData.mediaUrls) ? updateData.mediaUrls : [],
        mediaTypes: Array.isArray(updateData.mediaTypes) ? updateData.mediaTypes : [],
        mediaS3Keys: Array.isArray(updateData.mediaS3Keys) ? updateData.mediaS3Keys : [],
        mediaUrl: typeof updateData.mediaUrl === 'string' ? updateData.mediaUrl : undefined,
        mediaType: typeof updateData.mediaType === 'string' ? updateData.mediaType : undefined,
        mediaS3Key: typeof updateData.mediaS3Key === 'string' ? updateData.mediaS3Key : undefined,
      };
      
      const event = await prisma.timelineEvent.create({
        data: createData
      });
      
      const mediaItems = event.mediaUrls?.map((url: string, i: number) => ({
        type: event.mediaTypes?.[i] || 'image',
        url
      })) || [];

      await redis.del(`timeline_events:${configId}`);

      return NextResponse.json({
        id: event.id,
        text: event.text,
        type: event.type,
        location: event.location,
        timestamp: event.timestamp.toISOString(),
        media: mediaItems[0],
        mediaItems: mediaItems
      });
    }
    
    const event = await prisma.timelineEvent.update({
      where: { id: String(id) },
      data: updateData,
    });

    const nextMediaS3Keys = Array.isArray(updateData.mediaS3Keys) ? updateData.mediaS3Keys : [];
    if (nextMediaS3Keys.length > 0 && existingEvent) {
      const oldKeys = [...(existingEvent.mediaS3Keys || [])];
      if (existingEvent.mediaS3Key && !oldKeys.includes(existingEvent.mediaS3Key)) {
        oldKeys.push(existingEvent.mediaS3Key);
      }
      await Promise.all(
        oldKeys
          .filter((key) => !nextMediaS3Keys.includes(key))
          .map((key) => deleteFile(key).catch((e) => console.error(`Failed to delete old storage key ${key}:`, e)))
      );
    }

    const mediaItems = event.mediaUrls?.map((url: string, i: number) => ({
      type: event.mediaTypes?.[i] || 'image',
      url
    })) || [];

    await redis.del(`timeline_events:${configId}`);

    return NextResponse.json({
      id: event.id,
      text: event.text,
      type: event.type,
      location: event.location,
      timestamp: event.timestamp.toISOString(),
      media: mediaItems[0],
      mediaItems: mediaItems
    });
  } catch (error: unknown) {
    console.error('Error updating timeline event:', error);
    console.error('Full error details:', error instanceof Error ? error.stack : undefined);
    return NextResponse.json({ error: 'Failed to update timeline event', details: getErrorMessage(error) }, { status: 500 });
  }
}

// PUT /api/timeline/[id] - for JSON updates
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
    const contentType = request.headers.get('content-type') || '';
    
    let text: string | null = null;
    let type: string | null = null;
    let location: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let timestampStr: string | null = null;

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as TimelinePatchBody;
      text = body.text ?? null;
      type = body.type ?? null;
      location = body.location ?? null;
      latitude = body.latitude ?? null;
      longitude = body.longitude ?? null;
      timestampStr = body.timestamp ?? null;
    }

    const updateData: Prisma.TimelineEventUncheckedUpdateInput = {};
    if (text !== null && text !== '') updateData.text = text;
    if (type !== null && type !== '') updateData.type = type;
    if (location !== null && location !== '') updateData.location = location;
    if (latitude !== null) updateData.latitude = latitude;
    if (longitude !== null) updateData.longitude = longitude;
    if (timestampStr !== null && timestampStr !== '') updateData.timestamp = new Date(timestampStr);

    const existingEvent = await prisma.timelineEvent.findFirst({
      where: { id: String(id), configId },
      select: { id: true },
    });
    if (!existingEvent) {
      return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
    }

    const event = await prisma.timelineEvent.update({
      where: { id: String(id) },
      data: updateData,
    });

    const mediaItems = event.mediaUrls?.map((url: string, i: number) => ({
      type: event.mediaTypes?.[i] || 'image',
      url
    })) || [];

    await redis.del(`timeline_events:${configId}`);

    return NextResponse.json({
      id: event.id,
      text: event.text,
      type: event.type,
      location: event.location,
      timestamp: event.timestamp.toISOString(),
      media: mediaItems[0],
      mediaItems: mediaItems
    });
  } catch (error) {
    console.error('Error updating timeline event:', error);
    return NextResponse.json({ error: 'Failed to update timeline event' }, { status: 500 });
  }
}

// DELETE /api/timeline/[id]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const params = await props.params;
    const id = params.id;
    const { configId } = access;

    const event = await prisma.timelineEvent.findFirst({ where: { id, configId } });
    if (!event) {
        return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
    }

    // Delete all uploaded files from managed storage.
    const keysToDelete = [...(event.mediaS3Keys || [])];
    if (event.mediaS3Key && !keysToDelete.includes(event.mediaS3Key)) {
      keysToDelete.push(event.mediaS3Key);
    }

    for (const key of keysToDelete) {
      await deleteFile(key).catch(e => console.error(`Failed to delete storage key ${key}:`, e));
    }

    await prisma.timelineEvent.delete({ where: { id } });
    await redis.del(`timeline_events:${configId}`);

    return NextResponse.json({ success: true });
    } catch (error: unknown) {
      console.error('Error deleting interaction:', error);
      return NextResponse.json(
        { error: 'Failed to delete interaction', details: getErrorMessage(error) }, { status: 500 });
  }
}
