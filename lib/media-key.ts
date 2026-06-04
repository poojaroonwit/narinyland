const SCOPED_KEY_PREFIX = 'configs/';
const UNIBOX_KEY_SEGMENT = 'unibox';

function isSafeKeyPart(value: string | undefined): value is string {
  return Boolean(value && value.length <= 128 && !value.includes('..') && /^[A-Za-z0-9_.-]+$/.test(value));
}

export function getConfigIdFromStorageKey(key: string): string | null {
  if (!key.startsWith(SCOPED_KEY_PREFIX)) return null;

  const [, configId] = key.split('/');
  if (!isSafeKeyPart(configId)) return null;

  return configId;
}

export function isScopedStorageKey(key: string): boolean {
  return Boolean(getConfigIdFromStorageKey(key));
}

export function createUniboxStorageKey(assetId: string, configId?: string): string {
  if (!isSafeKeyPart(assetId)) {
    throw new Error('Invalid UniBox asset id');
  }

  if (configId) {
    if (!isSafeKeyPart(configId)) {
      throw new Error('Invalid config id for storage key');
    }
    return `${SCOPED_KEY_PREFIX}${configId}/${UNIBOX_KEY_SEGMENT}/${assetId}`;
  }

  return `${UNIBOX_KEY_SEGMENT}/${assetId}`;
}

export function getUniboxAssetIdFromStorageKey(key: string): string | null {
  const parts = key.split('/');

  if (parts[0] === UNIBOX_KEY_SEGMENT && isSafeKeyPart(parts[1]) && parts.length === 2) {
    return parts[1];
  }

  if (
    parts[0] === 'configs' &&
    isSafeKeyPart(parts[1]) &&
    parts[2] === UNIBOX_KEY_SEGMENT &&
    isSafeKeyPart(parts[3]) &&
    parts.length === 4
  ) {
    return parts[3];
  }

  return null;
}

export function isUniboxStorageKey(key: string): boolean {
  return Boolean(getUniboxAssetIdFromStorageKey(key));
}

export function scopeLegacyUniboxStorageKey(key: string, configId: string): string | null {
  if (isScopedStorageKey(key)) return key;

  const assetId = getUniboxAssetIdFromStorageKey(key);
  if (!assetId) return null;

  return createUniboxStorageKey(assetId, configId);
}
