import { NextResponse } from 'next/server';
import { uploadFile, deleteFile } from '@/lib/s3';

// POST /api/upload
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(
      buffer,
      file.name,
      file.type,
      folder
    );

    return NextResponse.json({
      key: result.key,
      url: result.url,
      originalName: file.name,
      size: file.size,
      contentType: file.type,
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// DELETE /api/upload
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { key } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'S3 key is required' }, { status: 400 });
    }

    await deleteFile(key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
