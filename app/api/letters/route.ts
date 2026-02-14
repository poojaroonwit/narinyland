import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadLetterMedia } from '@/lib/s3';

// GET /api/letters
export async function GET() {
  try {
    const letters = await prisma.loveLetter.findMany({
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
      media: l.mediaType
        ? { type: l.mediaType, url: l.mediaUrl }
        : undefined,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching letters:', error);
    return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 });
  }
}

// POST /api/letters
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let fromId: string;
    let content: string;
    let unlockDate: string;
    let file: File | null = null;
    let mediaUrl: string | null = null;
    let mediaType: string = 'image';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      fromId = body.fromId;
      content = body.content;
      unlockDate = body.unlockDate;
      mediaUrl = body.mediaUrl || null;
      mediaType = body.mediaType || 'image';
    } else {
      const formData = await request.formData();
      fromId = formData.get('fromId') as string;
      content = formData.get('content') as string;
      unlockDate = formData.get('unlockDate') as string;
      file = formData.get('media') as File | null;
      mediaUrl = formData.get('mediaUrl') as string | null;
      mediaType = (formData.get('mediaType') as string) || 'image';
    }

    // Find the partner record
    const partner = await prisma.partner.findFirst({
      where: { partnerId: fromId, configId: 'default' },
    });

    if (!partner) {
      return NextResponse.json({ error: `Partner not found: ${fromId}` }, { status: 400 });
    }

    let mediaS3Key: string | null = null;

    if (file && file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadLetterMedia(
        buffer,
        file.name,
        file.type
      );
      mediaUrl = result.url;
      mediaS3Key = result.key;
      
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
    }

    const letter = await prisma.loveLetter.create({
      data: {
        content,
        fromId: partner.id,
        unlockDate: new Date(unlockDate || Date.now()),
        mediaType: mediaUrl ? mediaType : null,
        mediaUrl,
        mediaS3Key,
      },
      include: { from: true },
    });

    return NextResponse.json({
      id: letter.id,
      fromId: letter.from.partnerId,
      content: letter.content,
      timestamp: letter.createdAt.toISOString(),
      unlockDate: letter.unlockDate.toISOString(),
      isRead: letter.isRead,
      media: letter.mediaType
        ? { type: letter.mediaType, url: letter.mediaUrl }
        : undefined,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating letter:', error);
    return NextResponse.json({ error: 'Failed to create letter' }, { status: 500 });
  }
}
