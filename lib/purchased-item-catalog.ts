import { getConfigIdFromStorageKey } from '@/lib/media-key';

export type PurchasedItemDefinition = {
  type: string;
  price: number;
  allowsCustomModel?: boolean;
};

const PURCHASED_ITEM_CATALOG: Record<string, PurchasedItemDefinition> = {
  custom_3d: { type: 'custom_3d', price: 2000, allowsCustomModel: true },
  dog: { type: 'dog', price: 500 },
  cat: { type: 'cat', price: 500 },
  flower1: { type: 'flower1', price: 150 },
  rock1: { type: 'rock1', price: 200 },
  house1: { type: 'house1', price: 1000 },
  tree1: { type: 'tree1', price: 300 },
};

export function getPurchasedItemDefinition(type: unknown): PurchasedItemDefinition | null {
  if (typeof type !== 'string') return null;
  return PURCHASED_ITEM_CATALOG[type] || null;
}

export function normalizePurchasedItemModelUrl(
  definition: PurchasedItemDefinition,
  modelUrl: unknown,
  configId: string
): string | null {
  if (!definition.allowsCustomModel) return null;
  if (typeof modelUrl !== 'string' || !modelUrl.startsWith('/api/serve-image?')) return null;

  try {
    const parsed = new URL(modelUrl, 'https://narinyland.invalid');
    if (parsed.pathname !== '/api/serve-image') return null;
    const key = parsed.searchParams.get('key');
    if (!key || getConfigIdFromStorageKey(key) !== configId) return null;
    return `/api/serve-image?key=${encodeURIComponent(key)}`;
  } catch {
    return null;
  }
}

export const purchasedItemCatalog = Object.freeze(PURCHASED_ITEM_CATALOG);
