import { NextResponse } from 'next/server';
import { listFiles } from '@/lib/s3';

// GET /api/upload/list
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    
    const files = await listFiles(folder || 'uploads');
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
