import { getFileResponse } from '@/lib/storage';
import { requireStorageKeyAccess } from '@/lib/media-access';
import { isSafeStorageKey } from '@/lib/upload-validation';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  
  if (!isSafeStorageKey(key)) {
    return new Response('Missing key parameter', { status: 400 });
  }

  const accessRejection = await requireStorageKeyAccess(request, key);
  if (accessRejection) return accessRejection;
  
  try {
    return await getFileResponse(key, request.headers);
  } catch (error) {
    console.error('Serve-image error:', error);
    return new Response('Media not found', { status: 404 });
  }
}
