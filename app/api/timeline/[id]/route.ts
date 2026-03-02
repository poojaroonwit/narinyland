import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadTimelineMedia, deleteFile } from '@/lib/s3';

// GET /api/timeline/[id]
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;

    const event = await prisma.timelineEvent.findUnique({
      where: { id: String(id) }
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
    const params = await props.params;
    const id = params.id;
    
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

    const updateData: any = {};
    if (text !== null && text !== '') updateData.text = text;
    if (type !== null && type !== '') updateData.type = type;
    if (location !== null && location !== '') updateData.location = location;
    if (latitude !== null && !isNaN(parseFloat(latitude))) updateData.latitude = parseFloat(latitude);
    if (longitude !== null && !isNaN(parseFloat(longitude))) updateData.longitude = parseFloat(longitude);
    if (timestampStr !== null && timestampStr !== '') updateData.timestamp = new Date(timestampStr);

    if (files && files.length > 0) {
      
      // Check total file size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const maxSize = 50 * 1024 * 1024; // 50MB
      
      if (totalSize > maxSize) {
        return NextResponse.json({ 
          error: 'Files too large', 
          details: `Total file size is ${(totalSize / 1024 / 1024).toFixed(2)}MB, but maximum allowed is 50MB.`,
          suggestion: 'Please compress your files or upload smaller images.'
        }, { status: 400 });
      }
      
      // Check individual file sizes
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { // 10MB per file
          return NextResponse.json({ 
            error: 'File too large', 
            details: `File ${file.name} is ${(file.size / 1024 / 1024).toFixed(2)}MB, but maximum allowed per file is 10MB.`,
            suggestion: 'Please compress this image or use a smaller file.'
          }, { status: 400 });
        }
      }
      
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];
      let mediaS3Keys: string[] = [];

      for (const file of files) {
        if (!(file instanceof File)) continue;
        
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = await uploadTimelineMedia(buffer, file.name, file.type);
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

    // Check if the timeline event exists first
    const existingEvent = await prisma.timelineEvent.findUnique({
      where: { id: String(id) }
    });
    
    if (!existingEvent) {
      
      // Create the timeline event if it doesn't exist
      const createData = {
        id: String(id),
        configId: 'default',
        ...updateData
      };
      
      // Ensure timestamp is provided
      if (!createData.timestamp) {
        createData.timestamp = new Date();
      }
      
      const event = await prisma.timelineEvent.create({
        data: createData
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
  } catch (error: any) {
    console.error('❌ Error updating timeline event:', error);
    console.error('❌ Full error details:', error.stack);
    return NextResponse.json({ error: 'Failed to update timeline event', details: error.message }, { status: 500 });
  }
}

// PUT /api/timeline/[id] - for JSON updates
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
    let latitude: number | null = null;
    let longitude: number | null = null;
    let timestampStr: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      text = body.text ?? null;
      type = body.type ?? null;
      location = body.location ?? null;
      latitude = body.latitude ?? null;
      longitude = body.longitude ?? null;
      timestampStr = body.timestamp ?? null;
    }

    const updateData: any = {};
    if (text !== null && text !== '') updateData.text = text;
    if (type !== null && type !== '') updateData.type = type;
    if (location !== null && location !== '') updateData.location = location;
    if (latitude !== null) updateData.latitude = latitude;
    if (longitude !== null) updateData.longitude = longitude;
    if (timestampStr !== null && timestampStr !== '') updateData.timestamp = new Date(timestampStr);

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
    } catch (error: any) {
      console.error('Error deleting interaction:', error);
      return NextResponse.json(
        { error: 'Failed to delete interaction', details: error.message }, { status: 500 });
  }
}
