import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE album
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.album.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete album error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
