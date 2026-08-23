const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_FOLDERS = new Set([
  'gallery',
  'letters',
  'memories',
  'models',
  'pwa-icon',
  'timeline',
  'uploads',
]);

const RASTER_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);
const AUDIO_MIMES = new Set(['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/webm']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.webm']);
const ACTIVE_CONTENT_MIMES = new Set([
  'image/svg+xml',
  'application/xml',
  'text/xml',
  'text/html',
  'application/xhtml+xml',
]);

function extensionOf(filename: string): string {
  const normalized = filename.trim().toLowerCase();
  const dot = normalized.lastIndexOf('.');
  return dot >= 0 ? normalized.slice(dot) : '';
}

export function getMaxUploadBytes(): number {
  const configured = Number(process.env.MAX_UPLOAD_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES;
}

export function normalizeUploadFolder(folder?: string | null): string {
  const normalized = folder?.trim() || 'uploads';
  return ALLOWED_FOLDERS.has(normalized) ? normalized : 'uploads';
}

export function validateUploadFile(file: File): string | null {
  if (file.size <= 0) return 'File is empty';
  if (file.size > getMaxUploadBytes()) return 'File is too large';

  const mime = (file.type || '').trim().toLowerCase();
  const extension = extensionOf(file.name);

  if (ACTIVE_CONTENT_MIMES.has(mime) || extension === '.svg' || extension === '.xml' || extension === '.html' || extension === '.htm') {
    return 'Active SVG/XML/HTML content is not supported';
  }

  if (extension === '.glb') {
    return mime === '' || mime === 'model/gltf-binary' || mime === 'application/octet-stream'
      ? null
      : 'Model MIME type does not match .glb';
  }
  if (extension === '.gltf') {
    return mime === '' || mime === 'model/gltf+json' || mime === 'application/json'
      ? null
      : 'Model MIME type does not match .gltf';
  }

  if (RASTER_IMAGE_MIMES.has(mime) && IMAGE_EXTENSIONS.has(extension)) return null;
  if (VIDEO_MIMES.has(mime) && VIDEO_EXTENSIONS.has(extension)) return null;
  if (AUDIO_MIMES.has(mime) && AUDIO_EXTENSIONS.has(extension)) return null;

  return 'Unsupported or mismatched file type';
}

export function isSafeStorageKey(key: string | null | undefined): key is string {
  if (!key) return false;
  if (key.length > 512) return false;
  if (key.startsWith('/') || key.includes('\\') || key.includes('..')) return false;
  return /^[A-Za-z0-9!_.*'()/ -]+$/.test(key);
}
