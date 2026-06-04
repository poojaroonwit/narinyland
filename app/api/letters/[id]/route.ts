import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { deleteFile, uploadLetterMedia } from '@/lib/storage';
import { validateUploadFile } from '@/lib/upload-validation';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

type LetterPatchBody = {
  folder?: string;
  isRead?: boolean;
  readAt?: string | Date | null;
};

function getLettersCacheKey(configId: string): string {
  return `love_letters:${configId}`;
}

// POST /api/letters/[id] - for FormData uploads (media updates)
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

    const existingLetter = await prisma.loveLetter.findFirst({
      where: { id, from: { configId } },
    });
    if (!existingLetter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }
    
    const formData = await request.formData();
    const file = formData.get('media') as File | null;
    const fromId = formData.get('fromId') as string | null;
    const content = formData.get('content') as string | null;
    const unlockDate = formData.get('unlockDate') as string | null;

    const updateData: Prisma.LoveLetterUncheckedUpdateInput = {};
    if (fromId) {
      const partner = await prisma.partner.findFirst({
        where: { configId, OR: [{ id: fromId }, { partnerId: fromId }] },
        select: { id: true },
      });
      if (!partner) {
        return NextResponse.json({ error: `Partner not found: ${fromId}` }, { status: 400 });
      }
      updateData.fromId = partner.id;
    }
    if (content !== null) updateData.content = content;
    if (unlockDate !== undefined && unlockDate !== null) updateData.unlockDate = new Date(unlockDate);

    // Handle file upload
    if (file) {
      const validationError = validateUploadFile(file);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      console.log('📸 Uploading new media for letter update');
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadLetterMedia(
        buffer,
        file.name,
        file.type,
        configId
      );
      updateData.mediaUrl = result.url;
      updateData.mediaS3Key = result.key;
      if (file.type.startsWith('image/')) updateData.mediaType = 'image';
      else if (file.type.startsWith('video/')) updateData.mediaType = 'video';
      else if (file.type.startsWith('audio/')) updateData.mediaType = 'audio';
      
      if (existingLetter.mediaS3Key) {
        await deleteFile(existingLetter.mediaS3Key).catch(e => console.error('Failed to delete old storage file:', e));
      }
    }

    const letter = await prisma.loveLetter.update({
      where: { id },
      data: updateData,
    });

    await redis.del(getLettersCacheKey(configId));

    return NextResponse.json(letter);
  } catch (error) {
    console.error('Error updating letter with FormData:', error);
    return NextResponse.json({ error: 'Failed to update letter' }, { status: 500 });
  }
}

// DELETE /api/letters/[id]
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

    const letter = await prisma.loveLetter.findFirst({
      where: { id, from: { configId } },
    });
    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    if (letter.mediaS3Key) {
      await deleteFile(letter.mediaS3Key);
    }

    await prisma.loveLetter.delete({ where: { id } });

    await redis.del(getLettersCacheKey(configId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting letter:', error);
    return NextResponse.json({ error: 'Failed to delete letter' }, { status: 500 });
  }
}

// PUT /api/letters/[id]
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
    const body = (await request.json()) as LetterPatchBody;

    const existingLetter = await prisma.loveLetter.findFirst({
      where: { id, from: { configId } },
      select: { id: true },
    });
    if (!existingLetter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    const letter = await prisma.loveLetter.update({
      where: { id },
      data: {
        folder: body.folder,
        isRead: body.isRead,
        readAt: body.readAt ? new Date(body.readAt) : undefined,
      } satisfies Prisma.LoveLetterUpdateInput
    });

    await redis.del(getLettersCacheKey(configId));

    return NextResponse.json(letter);
  } catch (error) {
    console.error('Error updating letter:', error);
    return NextResponse.json({ error: 'Failed to update letter' }, { status: 500 });
  }
}
