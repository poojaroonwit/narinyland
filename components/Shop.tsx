import React, { useState, useRef } from 'react';
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

interface ShopProps {
  points: number;
  activeLandId?: string;
  onPurchase: (item: ShopItem) => Promise<void>;
  compact?: boolean;
}

const Shop: React.FC<ShopProps> = ({ points, activeLandId, onPurchase, compact = false }) => {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => fileInputRef.current?.click();

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      alert("PROMPT: SYSTEM REQUIRES .GLB OR .GLTF");
      return;
    }
    const customItem = SHOP_ITEMS.find(i => i.id === 'custom-3d');
    if (!customItem) return;
    if (points < customItem.price) {
      alert("INSUFFICIENT CREDITS");
      return;
    }
    if (!activeLandId) {
       alert("WORLD CONTEXT REQUIRED");
       return;
    }

    setPurchasingId('custom-3d');
    try {
      const uploadResult = await uploadAPI.upload(file, 'models');
      await onPurchase({ ...customItem, modelUrl: uploadResult.url });
    } catch (err) {
      alert("UPLOAD FAILURE");
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
      alert("INSUFFICIENT CREDITS");
      return;
    }
    if (!activeLandId) {
      alert("WORLD CONTEXT REQUIRED");
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
      <div className="space-y-3 font-geist">
        {SHOP_ITEMS.map(item => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.02 }}
            className="bg-white/60 backdrop-blur-md rounded-clay p-4 border border-white/20 flex items-center gap-4 group transition-all duration-500"
          >
            <div className="text-xl w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center shrink-0 grayscale group-hover:grayscale-0 transition-all">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-black text-[11px] truncate uppercase tracking-tight">{item.name}</h4>
              <div className="text-black/30 text-[9px] font-black uppercase tracking-widest mt-1">
                {item.price} CREDITS
              </div>
            </div>
            <button
              onClick={() => handleBuy(item)}
              disabled={points < item.price || purchasingId === item.id}
              className={`px-4 py-2 rounded-pill text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
                purchasingId === item.id
                  ? 'bg-black/10 text-black/20'
                  : points >= item.price
                    ? 'bg-black text-white hover:shadow-xl'
                    : 'bg-black/5 text-black/10'
              }`}
            >
              {purchasingId === item.id ? '...' : 'GET'}
            </button>
          </motion.div>
        ))}
        <input type="file" ref={fileInputRef} onChange={handleCustomUpload} accept=".glb,.gltf" className="hidden" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center font-geist">
      <div className="w-full p-8 flex flex-col">
        <div className="flex justify-between items-end mb-16">
          <div>
            <p className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em] mb-4">EXCHANGE</p>
            <h2 className="text-4xl font-black text-black uppercase tracking-tight">MARKETPLACE</h2>
          </div>
          <div className="bg-black text-white px-8 py-4 rounded-pill flex items-center gap-4 shadow-2xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">AVAILABLE CREDITS</span>
            <span className="font-black text-lg">{points}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {SHOP_ITEMS.map(item => (
            <motion.div 
              key={item.id}
              whileHover={{ scale: 1.02, y: -4 }}
              className="bg-white/60 backdrop-blur-md rounded-clay p-8 border border-white/20 shadow-sm flex flex-col justify-between hover:shadow-2xl transition-all duration-700 group"
            >
              <div>
                <div className="text-5xl text-center mb-8 grayscale group-hover:grayscale-0 transition-all duration-700">{item.icon}</div>
                <h3 className="font-black text-black text-xs uppercase tracking-widest mb-4">{item.name}</h3>
                <p className="text-[10px] text-black/40 font-bold leading-relaxed uppercase tracking-[0.05em] h-12 overflow-hidden">{item.description}</p>
              </div>
              
              <div className="mt-8 pt-8 border-t border-black/5 flex items-center justify-between">
                <div className="text-black/60 font-black text-xs">
                  {item.price} <span className="text-[8px] opacity-30">PTS</span>
                </div>
                
                <button
                  onClick={() => handleBuy(item)}
                  disabled={points < item.price || purchasingId === item.id}
                  className={`px-6 py-2.5 rounded-pill text-[9px] font-black uppercase tracking-widest transition-all ${
                    purchasingId === item.id
                      ? 'bg-black/10 text-black/20'
                      : points >= item.price
                        ? 'bg-black text-white hover:shadow-2xl'
                        : 'bg-black/5 text-black/10'
                  }`}
                >
                  {purchasingId === item.id ? 'PROCESSING' : 'ACQUIRE'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleCustomUpload} accept=".glb,.gltf" className="hidden" />
      </div>
    </div>
  );
};

export default Shop;
