import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/s3';

// GET /api/upload/presign
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const expires = searchParams.get('expires');

    if (!key) {
      return NextResponse.json({ error: 'S3 key is required' }, { status: 400 });
    }

    const url = await getPresignedUrl(key, Number(expires) || 3600);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
