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

const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_MODEL_EXTENSIONS = ['.glb', '.gltf'];

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

  const filename = file.name.toLowerCase();
  const hasAllowedMime = ALLOWED_MIME_PREFIXES.some(prefix => file.type.startsWith(prefix));
  const hasAllowedModelExtension = ALLOWED_MODEL_EXTENSIONS.some(ext => filename.endsWith(ext));

  if (!hasAllowedMime && !hasAllowedModelExtension) {
    return 'Unsupported file type';
  }

  return null;
}

export function isSafeS3Key(key: string | null | undefined): key is string {
  if (!key) return false;
  if (key.length > 512) return false;
  if (key.startsWith('/') || key.includes('\\') || key.includes('..')) return false;
  return /^[A-Za-z0-9!_.*'()/ -]+$/.test(key);
}
