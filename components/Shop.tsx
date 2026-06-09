import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { uploadAPI } from '../services/api';

export interface ShopItem {
  id: string;
  name: string;
  type: string;
  price: number;
  icon: string;
  description: string;
  modelUrl?: string | null;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'custom-3d', name: 'Custom 3D Model', type: 'custom_3d', price: 2000, icon: '📦', description: 'Upload a .glb or .gltf file to place in your world.' },
  { id: 'pet-dog', name: 'Golden Retriever', type: 'dog', price: 500, icon: '🐕', description: 'A loyal companion for your world.' },
  { id: 'pet-cat', name: 'Orange Tabby', type: 'cat', price: 500, icon: '🐈', description: 'A cute and independent feline friend.' },
  { id: 'deco-flower1', name: 'Magic Sunflower', type: 'flower1', price: 150, icon: '🌻', description: 'A large, glowing sunflower.' },
  { id: 'deco-rock1', name: 'Crystal Rock', type: 'rock1', price: 200, icon: '💎', description: 'A shiny crystal rock.' },
  { id: 'bldg-house1', name: 'Cozy Cottage', type: 'house1', price: 1000, icon: '🏡', description: 'A safe and cozy place to rest.' },
  { id: 'deco-tree1', name: 'Cherry Blossom', type: 'tree1', price: 300, icon: '🌸', description: 'A beautiful blossoming tree.' },
];

const getShopIconClass = (type: string) => {
  switch (type) {
    case 'custom_3d':
      return 'fa-cube';
    case 'dog':
      return 'fa-dog';
    case 'cat':
      return 'fa-cat';
    case 'flower1':
      return 'fa-seedling';
    case 'rock1':
      return 'fa-gem';
    case 'house1':
      return 'fa-house-chimney';
    case 'tree1':
      return 'fa-tree';
    default:
      return 'fa-shapes';
  }
};

interface ShopProps {
  points: number;
  activeLandId?: string;
  onPurchase: (item: ShopItem) => Promise<void>;
  compact?: boolean;
}

const Shop: React.FC<ShopProps> = ({ points, activeLandId, onPurchase, compact = false }) => {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCustomUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      alert('Please upload a .glb or .gltf file.');
      return;
    }

    const customItem = SHOP_ITEMS.find(item => item.id === 'custom-3d');
    if (!customItem) return;

    if (points < customItem.price) {
      alert('Not enough points!');
      return;
    }

    if (!activeLandId) {
      alert('You need an active World to place this item! Create one in Settings.');
      return;
    }

    setPurchasingId('custom-3d');
    try {
      const uploadResult = await uploadAPI.upload(file, 'models');
      await onPurchase({ ...customItem, modelUrl: uploadResult.url });
    } catch (error) {
      console.error('Failed to upload model or purchase:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setPurchasingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBuy = async (item: ShopItem) => {
    if (item.id === 'custom-3d') {
      triggerUpload();
      return;
    }

    if (points < item.price) {
      alert('Not enough points!');
      return;
    }

    if (!activeLandId) {
      alert('You need an active World to place this item! Create one in Settings.');
      return;
    }

    setPurchasingId(item.id);
    try {
      await onPurchase(item);
    } finally {
      setPurchasingId(null);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {SHOP_ITEMS.map(item => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.01 }}
            className="flex items-center gap-3 rounded-[1.15rem] border border-amber-100/80 bg-white/82 p-3 shadow-sm"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
              <i className={`fas ${getShopIconClass(item.type)} text-base`} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-black text-stone-800">{item.name}</h4>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                <i className="fas fa-coins text-[10px]" />
                <span>{item.price}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleBuy(item)}
              disabled={points < item.price || purchasingId === item.id}
              className={`h-10 shrink-0 rounded-full px-4 text-[10px] font-black uppercase tracking-wider transition active:scale-95 ${
                purchasingId === item.id
                  ? 'bg-stone-300 text-white'
                  : points >= item.price
                    ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600'
                    : 'bg-stone-100 text-stone-400'
              }`}
            >
              {purchasingId === item.id ? '...' : item.id === 'custom-3d' ? 'Upload' : 'Buy'}
            </button>
          </motion.div>
        ))}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleCustomUpload}
          accept=".glb,.gltf"
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
      <div className="flex w-full flex-col rounded-md bg-white/90 p-6 shadow-xl backdrop-blur-md md:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-amber-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-amber-700">
              <i className="fas fa-store" /> The World Shop
            </h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-amber-500/80">
              Buy items for your active world
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-100 px-4 py-2 text-amber-700 shadow-sm">
            <i className="fas fa-coins text-amber-500" />
            <span className="font-black">{points}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">PTS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SHOP_ITEMS.map(item => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              className="flex flex-col justify-between rounded-md border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm"
            >
              <div>
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-700 shadow-inner">
                  <i className={`fas ${getShopIconClass(item.type)} text-2xl`} />
                </div>
                <h3 className="text-lg font-black text-gray-800">{item.name}</h3>
                <p className="mt-1 h-8 text-xs text-gray-500">{item.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-amber-100 pt-4">
                <div className="flex items-center gap-1.5 font-black text-amber-600">
                  <i className="fas fa-coins text-sm" />
                  <span>{item.price}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleBuy(item)}
                  disabled={points < item.price || purchasingId === item.id}
                  className={`rounded-md px-4 py-2 text-xs font-black uppercase tracking-wider shadow-sm transition-all ${
                    purchasingId === item.id
                      ? 'cursor-wait bg-gray-300 text-white'
                      : points >= item.price
                        ? 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md'
                        : 'cursor-not-allowed bg-gray-200 text-gray-400'
                  }`}
                >
                  {purchasingId === item.id
                    ? 'Buying...'
                    : item.id === 'custom-3d'
                      ? points >= item.price ? 'Upload' : 'Not Enough'
                      : points >= item.price ? 'Buy Item' : 'Not Enough'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleCustomUpload}
          accept=".glb,.gltf"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default Shop;
