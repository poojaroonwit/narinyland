import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { deleteFile, uploadMemoryImage } from '@/lib/storage';
import { validateUploadFile } from '@/lib/upload-validation';
import { redis } from '@/lib/redis';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';

type MemoryUpdateBody = {
  privacy?: string;
  caption?: string | null;
  sortOrder?: number;
  url?: string;
  albumId?: string | null;
};

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

// POST /api/memories/[id] - for FormData uploads (image updates)
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

    const existingMemory = await prisma.memory.findFirst({
      where: { id, configId },
    });
    if (!existingMemory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const url = formData.get('url') as string | null;
    const privacy = (formData.get('privacy') as string) || 'public';
    const caption = formData.get('caption') as string | null;

    if (!['public', 'private'].includes(privacy)) {
      return NextResponse.json({ error: 'Invalid privacy value' }, { status: 400 });
    }

    const updateData: Prisma.MemoryUpdateInput = {};
    if (privacy !== undefined) updateData.privacy = privacy;
    if (caption !== undefined) updateData.caption = caption;
    if (url) updateData.url = url;
    const albumId = formData.get('albumId');
    if (typeof albumId === 'string') {
      if (albumId && !(await prisma.album.findFirst({ where: { id: albumId, configId }, select: { id: true } }))) {
        return NextResponse.json({ error: 'Album not found in this world' }, { status: 400 });
      }
      updateData.album = albumId ? { connect: { id: albumId } } : { disconnect: true };
    }

    // Handle file upload
    if (file) {
      const validationError = validateUploadFile(file);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      console.log('📸 Uploading new image for memory update');
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadMemoryImage(
        buffer,
        file.name,
        file.type,
        configId
      );
      updateData.url = result.url;
      updateData.s3Key = result.key;
      
      if (existingMemory.s3Key) {
        await deleteFile(existingMemory.s3Key).catch(e => console.error('Failed to delete old storage file:', e));
      }
    }

    const memory = await prisma.memory.update({
      where: { id },
      data: updateData,
    });

    await invalidateMemoryCache(configId).catch((error) => console.error('Memory updated; cache invalidation pending:', error));

    return NextResponse.json(memory);
  } catch (error) {
    console.error('Error updating memory with FormData:', error);
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}

// PUT /api/memories/[id] - for JSON updates
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
    const body = (await request.json()) as MemoryUpdateBody;
    const { privacy, caption, sortOrder, url, albumId } = body;

    const existingMemory = await prisma.memory.findFirst({
      where: { id, configId },
      select: { id: true },
    });
    if (!existingMemory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    if (privacy !== undefined && !['public', 'private'].includes(privacy)) {
      return NextResponse.json({ error: 'Invalid privacy value' }, { status: 400 });
    }

    const updateData: Prisma.MemoryUpdateInput = {};
    if (privacy !== undefined) updateData.privacy = privacy;
    if (caption !== undefined) updateData.caption = caption;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (url !== undefined) updateData.url = url;
    if (albumId !== undefined) {
      if (albumId && !(await prisma.album.findFirst({ where: { id: albumId, configId }, select: { id: true } }))) {
        return NextResponse.json({ error: 'Album not found in this world' }, { status: 400 });
      }
      updateData.album = albumId ? { connect: { id: albumId } } : { disconnect: true };
    }

    const memory = await prisma.memory.update({
      where: { id },
      data: updateData,
    });

    await invalidateMemoryCache(configId).catch((error) => console.error('Memory updated; cache invalidation pending:', error));

    return NextResponse.json(memory);
  } catch (error) {
    console.error('Error updating memory:', error);
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}

// DELETE /api/memories/[id]
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
    
    const memory = await prisma.memory.findFirst({ where: { id, configId } });
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Delete uploaded media if it exists in managed storage.
    if (memory.s3Key) {
      await deleteFile(memory.s3Key);
    }

    await prisma.memory.delete({ where: { id } });

    await invalidateMemoryCache(configId).catch((error) => console.error('Memory updated; cache invalidation pending:', error));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
