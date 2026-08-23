import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadLetterMedia } from '@/lib/storage';
import { redis } from '@/lib/redis';
import { validateUploadFile } from '@/lib/upload-validation';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

const LETTER_REWARD_POINTS = 20;

function getLettersCacheKey(configId: string): string {
  return `love_letters:${configId}`;
}

// GET /api/letters
export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const cacheKey = getLettersCacheKey(configId);
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached));

    const letters = await prisma.loveLetter.findMany({
      where: { from: { configId } },
      include: { from: true },
      orderBy: { createdAt: 'desc' },
    });

    const response = letters.map((l) => ({
      id: l.id,
      fromId: l.from.partnerId,
      content: l.content,
      timestamp: l.createdAt.toISOString(),
      unlockDate: l.unlockDate.toISOString(),
      isRead: l.isRead,
      media: l.mediaType ? { type: l.mediaType, url: l.mediaUrl } : undefined,
    }));

    await redis.setex(cacheKey, 60, JSON.stringify(response));
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching letters:', error);
    return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 });
  }
}

// POST /api/letters
export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { configId } = access;
    const contentType = request.headers.get('content-type') || '';

    let fromId: string;
    let content: string;
    let unlockDate: string;
    let file: File | null = null;
    let mediaUrl: string | null = null;
    let mediaType = 'image';

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      fromId = typeof body?.fromId === 'string' ? body.fromId.trim() : '';
      content = typeof body?.content === 'string' ? body.content.trim() : '';
      unlockDate = typeof body?.unlockDate === 'string' ? body.unlockDate : '';
      mediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl : null;
      mediaType = typeof body?.mediaType === 'string' ? body.mediaType : 'image';
    } else {
      const formData = await request.formData();
      fromId = String(formData.get('fromId') || '').trim();
      content = String(formData.get('content') || '').trim();
      unlockDate = String(formData.get('unlockDate') || '');
      const media = formData.get('media');
      file = media instanceof File ? media : null;
      const mediaUrlValue = formData.get('mediaUrl');
      mediaUrl = typeof mediaUrlValue === 'string' && mediaUrlValue ? mediaUrlValue : null;
      const mediaTypeValue = formData.get('mediaType');
      mediaType = typeof mediaTypeValue === 'string' && mediaTypeValue ? mediaTypeValue : 'image';
    }

    if (!fromId || !content || content.length > 10_000) {
      return NextResponse.json({ error: 'A valid sender and letter content are required' }, { status: 400 });
    }

    const parsedUnlockDate = new Date(unlockDate || Date.now());
    if (Number.isNaN(parsedUnlockDate.getTime())) {
      return NextResponse.json({ error: 'Invalid unlock date' }, { status: 400 });
    }

    const partner = await prisma.partner.findFirst({
      where: { configId, OR: [{ partnerId: fromId }, { id: fromId }] },
      select: { id: true, partnerId: true },
    });

    if (!partner) {
      return NextResponse.json({ error: `Partner not found: ${fromId}` }, { status: 400 });
    }

    let mediaS3Key: string | null = null;
    if (file) {
      const validationError = validateUploadFile(file);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadLetterMedia(buffer, file.name, file.type, configId);
      mediaUrl = result.url;
      mediaS3Key = result.key;

      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
    }

    // The reward amount and recipient are resolved on the server and committed
    // atomically with the letter. The client can no longer choose either value.
    const letter = await prisma.$transaction(async (tx) => {
      const created = await tx.loveLetter.create({
        data: {
          content,
          fromId: partner.id,
          unlockDate: parsedUnlockDate,
          mediaType: mediaUrl ? mediaType : null,
          mediaUrl,
          mediaS3Key,
        },
        include: { from: true },
      });

      await tx.partner.update({
        where: { id: partner.id },
        data: {
          points: { increment: LETTER_REWARD_POINTS },
          lifetimePoints: { increment: LETTER_REWARD_POINTS },
        },
      });

      return created;
    });

    await Promise.all([
      redis.del(getLettersCacheKey(configId)),
      redis.del(`app_stats:${configId}`),
    ]);

    return NextResponse.json({
      id: letter.id,
      fromId: letter.from.partnerId,
      content: letter.content,
      timestamp: letter.createdAt.toISOString(),
      unlockDate: letter.unlockDate.toISOString(),
      isRead: letter.isRead,
      media: letter.mediaType ? { type: letter.mediaType, url: letter.mediaUrl } : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating letter:', error);
    return NextResponse.json({ error: 'Failed to create letter' }, { status: 500 });
  }
}
