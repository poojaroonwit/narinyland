import type { CharacterEquipment, WorldInventoryCatalogItem, WorldInventoryRarity, WorldInventorySlot } from '@/types';

export type WorldInventoryCatalogSource = Omit<WorldInventoryCatalogItem, 'isOwned' | 'isEquipped'> & {
  metadata?: Record<string, unknown>;
};

export const DEFAULT_WORLD_EQUIPMENT: Required<CharacterEquipment> = {
  head: 'flower_crown',
  back: 'ribbon_wings',
  hand: 'bouquet',
};

export const STARTER_WORLD_INVENTORY_ITEMS: WorldInventoryCatalogSource[] = [
  {
    slot: 'head',
    itemKey: 'flower_crown',
    name: 'Flower Crown',
    rarity: 'keepsake',
    icon: 'fa-seedling',
    price: 0,
    description: 'A soft crown for garden walks.',
    source: 'starter',
    metadata: { source: 'starter' },
  },
  {
    slot: 'head',
    itemKey: 'straw_hat',
    name: 'Straw Hat',
    rarity: 'common',
    icon: 'fa-hat-cowboy',
    price: 0,
    description: 'Sunshade for long afternoons outside.',
    source: 'starter',
    metadata: { source: 'starter' },
  },
  {
    slot: 'head',
    itemKey: 'cat_ears',
    name: 'Cat Ears',
    rarity: 'rare',
    icon: 'fa-cat',
    price: 0,
    description: 'A playful little headpiece.',
    source: 'starter',
    metadata: { source: 'starter' },
  },
  {
    slot: 'back',
    itemKey: 'ribbon_wings',
    name: 'Ribbon Wings',
    rarity: 'keepsake',
    icon: 'fa-ribbon',
    price: 0,
    description: 'Light ribbons that flutter behind you.',
    source: 'starter',
    metadata: { source: 'starter' },
  },
  {
    slot: 'back',
    itemKey: 'cape',
    name: 'Garden Cape',
    rarity: 'common',
    icon: 'fa-shield-heart',
    price: 0,
    description: 'A simple cape for guild errands.',
    source: 'starter',
    metadata: { source: 'starter' },
  },
  {
    slot: 'hand',
    itemKey: 'bouquet',
    name: 'Bouquet',
    rarity: 'keepsake',
    icon: 'fa-spa',
    price: 0,
    description: 'Fresh flowers carried through the world.',
    source: 'starter',
    metadata: { source: 'starter' },
  },
  {
    slot: 'hand',
    itemKey: 'lantern',
    name: 'Lantern',
    rarity: 'rare',
    icon: 'fa-lightbulb',
    price: 0,
    description: 'Warm light for evening paths.',
    source: 'starter',
    metadata: { source: 'starter' },
  },
  {
    slot: 'hand',
    itemKey: 'book',
    name: 'Memory Book',
    rarity: 'common',
    icon: 'fa-book',
    price: 0,
    description: 'A carried album for shared moments.',
    source: 'starter',
    metadata: { source: 'starter' },
  },
];

export const MARKET_WORLD_INVENTORY_ITEMS: WorldInventoryCatalogSource[] = [
  {
    slot: 'head',
    itemKey: 'rose_halo',
    name: 'Rose Halo',
    rarity: 'keepsake',
    icon: 'fa-heart',
    price: 120,
    description: 'A quiet rose ring for anniversary evenings.',
    source: 'market',
    metadata: { source: 'market', district: 'Market' },
  },
  {
    slot: 'head',
    itemKey: 'moon_pin',
    name: 'Moon Pin',
    rarity: 'rare',
    icon: 'fa-moon',
    price: 80,
    description: 'A small silver pin that catches night light.',
    source: 'market',
    metadata: { source: 'market', district: 'Market' },
  },
  {
    slot: 'back',
    itemKey: 'picnic_satchel',
    name: 'Picnic Satchel',
    rarity: 'common',
    icon: 'fa-basket-shopping',
    price: 60,
    description: 'Packed for market runs and garden dates.',
    source: 'market',
    metadata: { source: 'market', district: 'Market' },
  },
  {
    slot: 'back',
    itemKey: 'star_shawl',
    name: 'Star Shawl',
    rarity: 'rare',
    icon: 'fa-cloud-moon',
    price: 100,
    description: 'A soft wrap with tiny stitched stars.',
    source: 'market',
    metadata: { source: 'market', district: 'Market' },
  },
  {
    slot: 'hand',
    itemKey: 'tea_cup',
    name: 'Tea Cup',
    rarity: 'common',
    icon: 'fa-mug-saucer',
    price: 50,
    description: 'A warm cup for slow chats by the path.',
    source: 'market',
    metadata: { source: 'market', district: 'Market' },
  },
  {
    slot: 'hand',
    itemKey: 'map_scroll',
    name: 'Map Scroll',
    rarity: 'rare',
    icon: 'fa-scroll',
    price: 90,
    description: 'A hand map for finding social corners.',
    source: 'market',
    metadata: { source: 'market', district: 'Market' },
  },
];

export const WORLD_EQUIPMENT_ITEMS: WorldInventoryCatalogSource[] = [
  ...STARTER_WORLD_INVENTORY_ITEMS,
  ...MARKET_WORLD_INVENTORY_ITEMS,
];

const WORLD_EQUIPMENT_BY_KEY = new Map(WORLD_EQUIPMENT_ITEMS.map(item => [item.itemKey, item]));

export function getWorldEquipmentItem(itemKey: string) {
  return WORLD_EQUIPMENT_BY_KEY.get(itemKey);
}

export function isWorldEquipmentKeyForSlot(slot: WorldInventorySlot, itemKey: string) {
  if (itemKey === 'none') return true;
  return WORLD_EQUIPMENT_BY_KEY.get(itemKey)?.slot === slot;
}

export function normalizeWorldEquipment(value: unknown): CharacterEquipment {
  const input = value && typeof value === 'object' ? value as CharacterEquipment : {};
  const pick = (slot: WorldInventorySlot, fallback: string) => {
    const itemKey = input[slot];
    return typeof itemKey === 'string' && isWorldEquipmentKeyForSlot(slot, itemKey) ? itemKey : fallback;
  };

  return {
    head: pick('head', DEFAULT_WORLD_EQUIPMENT.head),
    back: pick('back', DEFAULT_WORLD_EQUIPMENT.back),
    hand: pick('hand', DEFAULT_WORLD_EQUIPMENT.hand),
  };
}

export function cleanWorldInventoryRarity(value: string): WorldInventoryRarity {
  return ['common', 'rare', 'keepsake'].includes(value) ? value as WorldInventoryRarity : 'common';
}
