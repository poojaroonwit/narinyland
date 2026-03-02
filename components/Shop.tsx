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

const SHOP_ITEMS: ShopItem[] = [
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
}

const Shop: React.FC<ShopProps> = ({ points, activeLandId, onPurchase }) => {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Minimal validation
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      alert("Please upload a .glb or .gltf file.");
      return;
    }

    const customItem = SHOP_ITEMS.find(i => i.id === 'custom-3d');
    if (!customItem) return;

    if (points < customItem.price) {
      alert("Not enough points!");
      return;
    }
    
    if (!activeLandId) {
       alert("You need an active World to place this item! Create one in Settings.");
       return;
    }

    setPurchasingId('custom-3d');
    try {
      // 1. Upload file to S3
      const uploadResult = await uploadAPI.upload(file, 'models');
      const modelUrl = uploadResult.url;

      // 2. Trigger purchase with new modelUrl
      await onPurchase({ ...customItem, modelUrl });
      
    } catch (err) {
      console.error("Failed to upload model or purchase:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setPurchasingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBuy = async (item: ShopItem) => {
    if (item.id === 'custom-3d') {
      triggerUpload();
      return; // Handled by handleCustomUpload via file input change
    }

    if (points < item.price) {
      alert("Not enough points!");
      return;
    }
    if (!activeLandId) {
      alert("You need an active World to place this item! Create one in Settings.");
      return;
    }

    setPurchasingId(item.id);
    try {
      await onPurchase(item);
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl w-full p-6 md:p-8 flex flex-col">
        <div className="flex justify-between items-center border-b border-amber-100 pb-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-amber-700 flex items-center gap-2">
              <i className="fas fa-store"></i> The World Shop
            </h2>
            <p className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mt-1">
              Buy items for your active world
            </p>
          </div>
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm border border-amber-200">
            <i className="fas fa-coins text-amber-500"></i>
            <span className="font-black">{points}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">PTS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHOP_ITEMS.map(item => (
            <motion.div 
              key={item.id}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-white to-amber-50 rounded-2xl p-5 border inline-block border-amber-100 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="text-4xl text-center mb-4">{item.icon}</div>
                <h3 className="font-black text-gray-800 text-lg">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-1 h-8">{item.description}</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-600 font-black">
                  <i className="fas fa-coins text-sm"></i>
                  <span>{item.price}</span>
                </div>
                
                <button
                  onClick={() => handleBuy(item)}
                  disabled={points < item.price || purchasingId === item.id}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                    purchasingId === item.id
                      ? 'bg-gray-300 text-white cursor-wait'
                      : points >= item.price
                        ? 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {purchasingId === item.id ? 'Buying...' : item.id === 'custom-3d' ? (points >= item.price ? 'Upload' : 'Not Enough') : points >= item.price ? 'Buy Item' : 'Not Enough'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Hidden file input for custom 3D model uploads */}
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
