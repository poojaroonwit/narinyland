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
      alert("SIGNAL_ERROR: ARCHIVE_REQUIRES_.GLB_OR_.GLTF");
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
      alert("SIGNAL_ERROR: TRANSFER_FAILURE");
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
      <div className="space-y-4 font-geist">
        {SHOP_ITEMS.map(item => (
          <motion.div
            key={item.id}
            whileHover={{ x: 4 }}
            className="bg-black/[0.02] border border-black/5 p-5 flex items-center gap-6 group transition-all duration-500"
          >
            <div className="text-2xl w-14 h-14 bg-white border border-black/5 flex items-center justify-center shrink-0 grayscale group-hover:grayscale-0 transition-all">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-black text-[11px] truncate uppercase tracking-widest leading-none">{item.name}</h4>
              <div className="text-black/20 text-[8px] font-black uppercase tracking-[0.3em] mt-2">
                COST_UNIT::{item.price}
              </div>
            </div>
            <button
              onClick={() => handleBuy(item)}
              disabled={points < item.price || purchasingId === item.id}
              className={`px-6 py-3 text-[9px] font-black uppercase tracking-[0.4em] transition-all shrink-0 ${
                purchasingId === item.id
                  ? 'bg-black/5 text-black/10'
                  : points >= item.price
                    ? 'bg-black text-white hover:bg-neutral-800'
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
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center font-geist">
      <div className="w-full p-10 flex flex-col">
        <div className="flex justify-between items-end mb-24">
          <div className="space-y-4">
             <div className="flex items-center gap-4">
               <span className="w-8 h-[1px] bg-black opacity-20"></span>
               <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.6em]">EXCHANGE_PROTOCOL</p>
             </div>
             <h2 className="text-6xl font-black text-black uppercase tracking-extratight leading-none">MARKETPLACE</h2>
          </div>
          <div className="bg-black text-white px-10 py-6 flex flex-col items-end gap-2 shadow-2xl border border-white/10 rounded-none">
            <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">CREDIT_BALANCE</span>
            <span className="font-black text-2xl tracking-tighter leading-none">{points}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {SHOP_ITEMS.map(item => (
            <motion.div 
              key={item.id}
              whileHover={{ y: -8 }}
              className="bg-white border border-black/5 p-12 shadow-[0_40px_80px_rgba(0,0,0,0.05)] flex flex-col justify-between hover:border-black hover:shadow-2xl transition-all duration-700 group rounded-none"
            >
              <div>
                <div className="text-6xl text-center mb-12 grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110">{item.icon}</div>
                <div className="space-y-4">
                   <h3 className="font-black text-black text-sm uppercase tracking-[0.2em]">{item.name}</h3>
                   <div className="w-6 h-[1px] bg-black opacity-10"></div>
                   <p className="text-[11px] text-black/40 font-black leading-relaxed uppercase tracking-[0.1em] h-14 overflow-hidden">{item.description}</p>
                </div>
              </div>
              
              <div className="mt-12 pt-10 border-t border-black/5 flex items-center justify-between">
                <div className="text-black/10 font-black text-sm tracking-tighter">
                  <span className="text-black">{item.price}</span>_UNIT
                </div>
                
                <button
                  onClick={() => handleBuy(item)}
                  disabled={points < item.price || purchasingId === item.id}
                  className={`px-10 py-4 text-[10px] font-black uppercase tracking-[0.4em] transition-all ${
                    purchasingId === item.id
                      ? 'bg-black/[0.02] text-black/10'
                      : points >= item.price
                        ? 'bg-black text-white hover:bg-neutral-800'
                        : 'bg-black/[0.02] text-black/10'
                  }`}
                >
                  {purchasingId === item.id ? 'PROTOCOL_BUSY' : 'ACQUIRE_ASSET'}
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
