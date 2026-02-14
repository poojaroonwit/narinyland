import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadTimelineMedia, deleteFile } from '@/lib/s3';

// PUT /api/timeline/[id]
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    const contentType = request.headers.get('content-type') || '';
    
    let text: string | null = null;
    let type: string | null = null;
    let location: string | null = null;
    let timestampStr: string | null = null;
    let files: File[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      text = body.text ?? null;
      type = body.type ?? null;
      location = body.location ?? null;
      timestampStr = body.timestamp ?? null;
    } else {
      const formData = await request.formData();
      text = formData.get('text') as string | null;
      type = formData.get('type') as string | null;
      location = formData.get('location') as string | null;
      timestampStr = formData.get('timestamp') as string | null;
      files = formData.getAll('media') as File[];
    }

    const updateData: any = {};
    if (text !== null) updateData.text = text;
    if (type !== null) updateData.type = type;
    if (location !== null) updateData.location = location;
    if (timestampStr !== null) updateData.timestamp = new Date(timestampStr);

    if (files && files.length > 0) {
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];
      let mediaS3Keys: string[] = [];

      for (const file of files) {
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
      
      updateData.mediaUrls = mediaUrls;
      updateData.mediaTypes = mediaTypes;
      updateData.mediaS3Keys = mediaS3Keys;
      
      // Legacy fields
      updateData.mediaUrl = mediaUrls[0];
      updateData.mediaType = mediaTypes[0];
      updateData.mediaS3Key = mediaS3Keys[0];
    }

    const event = await prisma.timelineEvent.update({
      where: { id: String(id) },
      data: updateData,
    });

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
    const params = await props.params;
    const id = params.id;

    const event = await prisma.timelineEvent.findUnique({ where: { id } });
    if (!event) {
        return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
    }

    // Delete all files from S3
    const keysToDelete = [...(event.mediaS3Keys || [])];
    if (event.mediaS3Key && !keysToDelete.includes(event.mediaS3Key)) {
      keysToDelete.push(event.mediaS3Key);
    }

    for (const key of keysToDelete) {
      await deleteFile(key).catch(e => console.error(`Failed to delete S3 key ${key}:`, e));
    }

    await prisma.timelineEvent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting timeline event:', error);
    return NextResponse.json({ error: 'Failed to delete timeline event' }, { status: 500 });
  }
}
