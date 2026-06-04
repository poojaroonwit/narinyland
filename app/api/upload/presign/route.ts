import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/storage';
import { isSafeStorageKey } from '@/lib/upload-validation';
import { requireAdminRequest } from '@/lib/security';

// GET /api/upload/presign
export async function GET(request: Request) {
  const adminRejection = requireAdminRequest(request);
  if (adminRejection) return adminRejection;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const expires = searchParams.get('expires');

    if (!isSafeStorageKey(key)) {
      return NextResponse.json({ error: 'Storage key is required' }, { status: 400 });
    }

    const expiresIn = Math.min(Math.max(Number(expires) || 3600, 60), 3600);
    const url = await getPresignedUrl(key, expiresIn);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
