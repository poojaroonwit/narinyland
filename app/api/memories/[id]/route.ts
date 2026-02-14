import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFile } from '@/lib/s3';

// PUT /api/memories/[id]
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    const body = await request.json();
    const { privacy, caption, sortOrder, url } = body;

    const updateData: any = {};
    if (privacy !== undefined) updateData.privacy = privacy;
    if (caption !== undefined) updateData.caption = caption;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (url !== undefined) updateData.url = url;

    const memory = await prisma.memory.update({
      where: { id },
      data: updateData,
    });

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
    const params = await props.params;
    const id = params.id;
    
    const memory = await prisma.memory.findUnique({ where: { id } });
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Delete from S3 if it was uploaded
    if (memory.s3Key) {
      await deleteFile(memory.s3Key);
    }

    await prisma.memory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
