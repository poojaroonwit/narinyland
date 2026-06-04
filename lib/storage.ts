import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createUniboxStorageKey, getUniboxAssetIdFromStorageKey } from '@/lib/media-key';
import { UniboxClient } from '@/lib/unibox-sdk';

type StorageUploadResult = {
  key: string;
  url: string;
};

const UNIBOX_BASE_URL = (process.env.UNIBOX_BASE_URL || 'https://unibox.up.railway.app').replace(/\/+$/, '');
const UNIBOX_APP_ID =
  process.env.UNIBOX_APP_ID ||
  process.env.UNIBOX_APPLICATION_ID ||
  process.env.APPKIT_CLIENT_ID ||
  process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID ||
  '';
const UNIBOX_SESSION_COOKIE =
  process.env.UNIBOX_SESSION_COOKIE ||
  process.env.UNIBOX_NEXT_AUTH_SESSION_TOKEN ||
  '';
const UNIBOX_SESSION_COOKIE_NAME = process.env.UNIBOX_SESSION_COOKIE_NAME || 'next-auth.session-token';
const UNIBOX_FOLDER_ID = process.env.UNIBOX_FOLDER_ID || '';
const UNIBOX_FOLDER_IDS = process.env.UNIBOX_FOLDER_IDS || '';

const LEGACY_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || 'narinyland';
const legacyS3Client = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-northeast-1',
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

function assertUniboxConfigured(): void {
  const missing = [];
  if (!UNIBOX_APP_ID) missing.push('UNIBOX_APP_ID');
  if (!UNIBOX_SESSION_COOKIE) missing.push('UNIBOX_SESSION_COOKIE');

  if (missing.length > 0) {
    throw new Error(
      `UniBox storage is not configured. Set ${missing.join(' and ')} to use https://unibox.up.railway.app.`
    );
  }
}

function getUniboxClient(): UniboxClient {
  assertUniboxConfigured();
  return new UniboxClient({
    baseUrl: UNIBOX_BASE_URL,
    sessionCookie: UNIBOX_SESSION_COOKIE,
    sessionCookieName: UNIBOX_SESSION_COOKIE_NAME,
  });
}

function proxiedStorageUrl(key: string): string {
  return `/api/serve-image?key=${encodeURIComponent(key)}`;
}

function getUniboxFolderId(folder: string): string | undefined {
  for (const entry of UNIBOX_FOLDER_IDS.split(/[,\n;]/)) {
    const [name, id] = entry.split('=').map((part) => part?.trim());
    if (name && id && name === folder) return id;
  }

  return UNIBOX_FOLDER_ID || undefined;
}

async function getUniboxAssetUrl(assetId: string): Promise<string> {
  const client = getUniboxClient();
  const asset = await client.findAsset(UNIBOX_APP_ID, assetId);

  if (!asset) {
    throw new Error(`UniBox asset not found: ${assetId}`);
  }

  return asset.url;
}

async function getLegacyS3Response(key: string): Promise<Response> {
  const response = await legacyS3Client.send(
    new GetObjectCommand({
      Bucket: LEGACY_BUCKET,
      Key: key,
    })
  );

  const headers = new Headers();
  headers.set('Content-Type', response.ContentType || 'application/octet-stream');
  headers.set('Content-Length', response.ContentLength?.toString() || '0');
  headers.set('Cache-Control', 'private, max-age=31536000, immutable');

  return new Response(response.Body as ReadableStream, { headers });
}

async function getUniboxResponse(assetId: string, requestHeaders?: Headers): Promise<Response> {
  const client = getUniboxClient();
  const asset = await client.findAsset(UNIBOX_APP_ID, assetId);

  if (!asset) {
    throw new Error(`UniBox asset not found: ${assetId}`);
  }

  const headers = new Headers();
  const cookieHeader = client.getCookieHeader();
  if (cookieHeader) headers.set('Cookie', cookieHeader);

  const range = requestHeaders?.get('range');
  if (range) headers.set('Range', range);

  const upstream = await fetch(asset.url, {
    headers,
    cache: 'no-store',
  });

  if (!upstream.ok && upstream.status !== 206) {
    throw new Error(`UniBox asset fetch failed with status ${upstream.status}`);
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', upstream.headers.get('content-type') || asset.mimeType || 'application/octet-stream');
  const contentLength = upstream.headers.get('content-length') || (asset.fileSize ? String(asset.fileSize) : null);
  if (contentLength) responseHeaders.set('Content-Length', contentLength);
  const contentRange = upstream.headers.get('content-range');
  if (contentRange) responseHeaders.set('Content-Range', contentRange);
  const acceptRanges = upstream.headers.get('accept-ranges');
  if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);
  responseHeaders.set('Cache-Control', 'private, max-age=31536000, immutable');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
  folder: string = 'uploads',
  configId?: string
): Promise<StorageUploadResult> {
  const client = getUniboxClient();
  const file = new Blob([buffer as unknown as BlobPart], {
    type: contentType || 'application/octet-stream',
  });

  const result = await client.uploadAsset(UNIBOX_APP_ID, {
    file,
    filename: originalFilename,
    folderId: getUniboxFolderId(folder),
  });

  const key = createUniboxStorageKey(result.file.id, configId);
  return {
    key,
    url: proxiedStorageUrl(key),
  };
}

export async function uploadMemoryImage(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
  configId?: string
): Promise<StorageUploadResult> {
  return uploadFile(buffer, originalFilename, contentType, 'memories', configId);
}

export async function uploadTimelineMedia(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
  configId?: string
): Promise<StorageUploadResult> {
  return uploadFile(buffer, originalFilename, contentType, 'timeline', configId);
}

export async function uploadLetterMedia(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
  configId?: string
): Promise<StorageUploadResult> {
  return uploadFile(buffer, originalFilename, contentType, 'letters', configId);
}

export async function getFileResponse(key: string, requestHeaders?: Headers): Promise<Response> {
  const uniboxAssetId = getUniboxAssetIdFromStorageKey(key);
  if (uniboxAssetId) {
    return getUniboxResponse(uniboxAssetId, requestHeaders);
  }

  return getLegacyS3Response(key);
}

export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const uniboxAssetId = getUniboxAssetIdFromStorageKey(key);
  if (uniboxAssetId) {
    const assetUrl = await getUniboxAssetUrl(uniboxAssetId);
    return assetUrl || proxiedStorageUrl(key);
  }

  return getSignedUrl(
    legacyS3Client,
    new GetObjectCommand({
      Bucket: LEGACY_BUCKET,
      Key: key,
    }),
    { expiresIn }
  );
}

export async function deleteFile(key: string): Promise<void> {
  const uniboxAssetId = getUniboxAssetIdFromStorageKey(key);
  if (uniboxAssetId) {
    const client = getUniboxClient();
    await client.deleteAsset(UNIBOX_APP_ID, uniboxAssetId);
    return;
  }

  await legacyS3Client.send(
    new DeleteObjectCommand({
      Bucket: LEGACY_BUCKET,
      Key: key,
    })
  );
}

export async function listFiles(folder: string): Promise<string[]> {
  if (UNIBOX_APP_ID && UNIBOX_SESSION_COOKIE) {
    const client = getUniboxClient();
    const { files } = await client.listAssets(UNIBOX_APP_ID);
    return files
      .filter((file) => !folder || file.storagePath?.includes(folder) || file.filename?.includes(folder))
      .map((file) => createUniboxStorageKey(file.id));
  }

  const response = await legacyS3Client.send(
    new ListObjectsV2Command({
      Bucket: LEGACY_BUCKET,
      Prefix: folder,
    })
  );

  return response.Contents?.map((obj) => obj.Key || '').filter(Boolean) || [];
}

export const BUCKET = LEGACY_BUCKET;
export const s3Client = legacyS3Client;
