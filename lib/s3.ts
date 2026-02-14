import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// ─── S3 Client Configuration (Supabase Storage S3 Compatible) ────────

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'ap-northeast-1',
  endpoint: process.env.S3_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Required for Supabase S3
});

const BUCKET = process.env.S3_BUCKET || 'narinyland';

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Generate a unique S3 key for uploaded files
 */
function generateS3Key(folder: string, originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const uniqueName = `${uuidv4()}${ext}`;
  return `${folder}/${uniqueName}`;
}

/**
 * Upload a file buffer to S3
 */
export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
  folder: string = 'uploads'
): Promise<{ key: string; url: string }> {
  const key = generateS3Key(folder, originalFilename);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Construct public URL (Supabase storage pattern)
  const endpoint = process.env.S3_ENDPOINT || '';
  const baseUrl = endpoint.replace('/s3', '');
  const url = `${baseUrl}/object/public/${BUCKET}/${key}`;

  return { key, url };
}

/**
 * Upload a memory image to S3
 */
export async function uploadMemoryImage(
  buffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  return uploadFile(buffer, originalFilename, contentType, 'memories');
}

/**
 * Upload a timeline media file to S3
 */
export async function uploadTimelineMedia(
  buffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  return uploadFile(buffer, originalFilename, contentType, 'timeline');
}

/**
 * Upload a love letter media file to S3
 */
export async function uploadLetterMedia(
  buffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  return uploadFile(buffer, originalFilename, contentType, 'letters');
}

/**
 * Generate a presigned URL for temporary access to a file
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * List files in a specific folder
 */
export async function listFiles(folder: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: folder,
  });

  const response = await s3Client.send(command);
  return response.Contents?.map((obj) => obj.Key || '') || [];
}

export { s3Client, BUCKET };
