import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET } from '@/lib/s3';
import { isSafeS3Key } from '@/lib/upload-validation';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  
  if (!isSafeS3Key(key)) {
    return new Response('Missing key parameter', { status: 400 });
  }
  
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    });
    
    const response = await s3Client.send(command);
    
    const headers = new Headers();
    headers.set('Content-Type', response.ContentType || 'application/octet-stream');
    headers.set('Content-Length', response.ContentLength?.toString() || '0');
    headers.set('Cache-Control', 'private, max-age=31536000, immutable');
    
    return new Response(response.Body as ReadableStream, { headers });
  } catch (error) {
    console.error('Serve-image error:', error);
    return new Response('Image not found', { status: 404 });
  }
}
