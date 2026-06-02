import { NextResponse } from 'next/server';
import { listFiles } from '@/lib/s3';
import { normalizeUploadFolder } from '@/lib/upload-validation';
import { requireAdminRequest } from '@/lib/security';

// GET /api/upload/list
export async function GET(request: Request) {
  const adminRejection = requireAdminRequest(request);
  if (adminRejection) return adminRejection;

  try {
    const { searchParams } = new URL(request.url);
    const folder = normalizeUploadFolder(searchParams.get('folder'));
    
    const files = await listFiles(folder);
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
