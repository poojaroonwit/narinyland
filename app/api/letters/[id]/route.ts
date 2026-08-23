import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { deleteFile, uploadLetterMedia } from '@/lib/storage';
import { validateUploadFile } from '@/lib/upload-validation';
import { isConfigAccessDenied, requireConfigAccess, type ConfigAccess } from '@/lib/config-access';

const ALLOWED_FOLDERS = new Set(['Inbox', 'Archive', 'Trash']);

type LetterPatchBody = {
  folder?: unknown;
  isRead?: unknown;
  readAt?: unknown;
};

async function currentPartner(access: Exclude<ConfigAccess, { response: NextResponse }>) {
  return prisma.partner.findFirst({
    where: {
      configId: access.configId,
      OR: access.authSource === 'name-login'
        ? [{ id: access.userId }, { userId: access.userId }]
        : [{ userId: access.userId }],
    },
    select: { id: true },
  });
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  let uploadedKey: string | null = null;
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { id } = await props.params;
    const sender = await currentPartner(access);
    if (!sender) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const existingLetter = await prisma.loveLetter.findFirst({
      where: { id, fromId: sender.id, from: { configId: access.configId } },
    });
    if (!existingLetter) return NextResponse.json({ error: 'Letter not found' }, { status: 404 });

    const formData = await request.formData();
    const media = formData.get('media');
    const file = media instanceof File ? media : null;
    const contentValue = formData.get('content');
    const unlockDateValue = formData.get('unlockDate');

    const updateData: Prisma.LoveLetterUncheckedUpdateInput = {};
    if (typeof contentValue === 'string') {
      const content = contentValue.trim();
      if (!content || content.length > 10_000) {
        return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
      }
      updateData.content = content;
    }
    if (typeof unlockDateValue === 'string' && unlockDateValue) {
      const unlockDate = new Date(unlockDateValue);
      if (Number.isNaN(unlockDate.getTime())) {
        return NextResponse.json({ error: 'Invalid unlock date' }, { status: 400 });
      }
      updateData.unlockDate = unlockDate;
    }

    if (file) {
      const validationError = validateUploadFile(file);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadLetterMedia(buffer, file.name, file.type, access.configId);
      uploadedKey = result.key;
      updateData.mediaUrl = result.url;
      updateData.mediaS3Key = result.key;
      updateData.mediaType = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'image';
    }

    const letter = await prisma.loveLetter.update({ where: { id }, data: updateData });
    if (uploadedKey && existingLetter.mediaS3Key) {
      await deleteFile(existingLetter.mediaS3Key).catch(() => {});
    }
    return NextResponse.json(letter);
  } catch (error) {
    if (uploadedKey) await deleteFile(uploadedKey).catch(() => {});
    console.error('Error updating letter with FormData:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to update letter' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { id } = await props.params;
    const sender = await currentPartner(access);
    if (!sender) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const letter = await prisma.loveLetter.findFirst({
      where: { id, fromId: sender.id, from: { configId: access.configId } },
    });
    if (!letter) return NextResponse.json({ error: 'Letter not found' }, { status: 404 });

    await prisma.loveLetter.delete({ where: { id } });
    if (letter.mediaS3Key) await deleteFile(letter.mediaS3Key).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting letter:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to delete letter' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const { id } = await props.params;
    const body = (await request.json().catch(() => ({}))) as LetterPatchBody;
    const existingLetter = await prisma.loveLetter.findFirst({
      where: { id, from: { configId: access.configId } },
      select: { id: true, unlockDate: true },
    });
    if (!existingLetter) return NextResponse.json({ error: 'Letter not found' }, { status: 404 });

    if (typeof body.folder === 'string' && !ALLOWED_FOLDERS.has(body.folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }
    if (body.isRead !== undefined && typeof body.isRead !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isRead value' }, { status: 400 });
    }
    if (body.isRead === true && existingLetter.unlockDate.getTime() > Date.now()) {
      return NextResponse.json({ error: 'Letter is still locked' }, { status: 409 });
    }

    const data: Prisma.LoveLetterUpdateInput = {};
    if (typeof body.folder === 'string') data.folder = body.folder;
    if (typeof body.isRead === 'boolean') {
      data.isRead = body.isRead;
      data.readAt = body.isRead ? new Date() : null;
    }

    const letter = await prisma.loveLetter.update({ where: { id }, data });
    return NextResponse.json(letter);
  } catch (error) {
    console.error('Error updating letter:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Failed to update letter' }, { status: 500 });
  }
}
