import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import { uploadTimelineMedia, deleteFile } from '../lib/s3.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB for multiple files

// ─── GET /api/timeline ───────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const events = await prisma.timelineEvent.findMany({
      orderBy: { timestamp: 'desc' },
    });

    const response = events.map((e) => {
      const mediaItems = (e as any).mediaUrls?.map((url: string, i: number) => ({
        type: (e as any).mediaTypes?.[i] || 'image',
        url: url
      })) || [];

      return {
        id: e.id,
        text: e.text,
        type: e.type,
        location: e.location,
        timestamp: e.timestamp.toISOString(),
        media: e.mediaUrl ? { type: e.mediaType, url: e.mediaUrl } : (mediaItems[0] || undefined),
        mediaItems: mediaItems.length > 0 ? mediaItems : (e.mediaUrl ? [{ type: e.mediaType, url: e.mediaUrl }] : [])
      };
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// ─── POST /api/timeline ──────────────────────────────────────────────
router.post('/', upload.array('media', 10), async (req, res) => {
  try {
    const { text, type, timestamp, location } = req.body as any;
    const files = req.files as Express.Multer.File[];
    
    let mediaUrls: string[] = [];
    let mediaTypes: string[] = [];
    let mediaS3Keys: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const result = await uploadTimelineMedia(file.buffer, file.originalname, file.mimetype);
        mediaUrls.push(result.url);
        mediaS3Keys.push(result.key);
        
        if (file.mimetype.startsWith('image/')) mediaTypes.push('image');
        else if (file.mimetype.startsWith('video/')) mediaTypes.push('video');
        else if (file.mimetype.startsWith('audio/')) mediaTypes.push('audio');
        else mediaTypes.push('image');
      }
    } else if (req.body.mediaUrls) {
      // Support for pre-uploaded or external URLs
      mediaUrls = Array.isArray(req.body.mediaUrls) ? req.body.mediaUrls : [req.body.mediaUrls];
      mediaTypes = Array.isArray(req.body.mediaTypes) ? req.body.mediaTypes : [req.body.mediaType || 'image'];
    }

    const event = await prisma.timelineEvent.create({
      data: {
        text,
        type: type || 'system',
        location,
        timestamp: new Date(timestamp || Date.now()),
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

    res.status(201).json({
      id: event.id,
      text: event.text,
      type: event.type,
      location: event.location,
      timestamp: event.timestamp.toISOString(),
      media: mappedMediaItems[0],
      mediaItems: mappedMediaItems
    });
  } catch (error) {
    console.error('Error creating timeline event:', error);
    res.status(500).json({ error: 'Failed to create timeline event' });
  }
});

// ─── PUT /api/timeline/:id ───────────────────────────────────────────
router.put('/:id', upload.array('media', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { text, type, timestamp, location } = req.body as any;
    const files = req.files as Express.Multer.File[];

    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (type !== undefined) updateData.type = type;
    if (location !== undefined) updateData.location = location as string;
    if (timestamp !== undefined) updateData.timestamp = new Date(timestamp);

    if (files && files.length > 0) {
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];
      let mediaS3Keys: string[] = [];

      for (const file of files) {
        const result = await uploadTimelineMedia(file.buffer, file.originalname, file.mimetype);
        mediaUrls.push(result.url);
        mediaS3Keys.push(result.key);
        
        if (file.mimetype.startsWith('image/')) mediaTypes.push('image');
        else if (file.mimetype.startsWith('video/')) mediaTypes.push('video');
        else if (file.mimetype.startsWith('audio/')) mediaTypes.push('audio');
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
      where: { id : id as string },
      data: updateData as any,
    });

    const mediaItems = (event as any).mediaUrls?.map((url: string, i: number) => ({
      type: (event as any).mediaTypes?.[i] || 'image',
      url
    })) || [];

    res.json({
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
    res.status(500).json({ error: 'Failed to update timeline event' });
  }
});

// ─── DELETE /api/timeline/:id ────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.timelineEvent.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Timeline event not found' });
    }

    // Delete all files from S3
    const keysToDelete = [...((event as any).mediaS3Keys || [])];
    if (event.mediaS3Key && !keysToDelete.includes(event.mediaS3Key)) {
      keysToDelete.push(event.mediaS3Key);
    }

    for (const key of keysToDelete) {
      await deleteFile(key).catch(e => console.error(`Failed to delete S3 key ${key}:`, e));
    }

    await prisma.timelineEvent.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting timeline event:', error);
    res.status(500).json({ error: 'Failed to delete timeline event' });
  }
});

export default router;
