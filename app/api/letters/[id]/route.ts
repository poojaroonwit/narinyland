import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFile } from '@/lib/s3';

// DELETE /api/letters/[id]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;

    const letter = await prisma.loveLetter.findUnique({ where: { id } });
    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    if (letter.mediaS3Key) {
      await deleteFile(letter.mediaS3Key);
    }

    await prisma.loveLetter.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting letter:', error);
    return NextResponse.json({ error: 'Failed to delete letter' }, { status: 500 });
  }
}
