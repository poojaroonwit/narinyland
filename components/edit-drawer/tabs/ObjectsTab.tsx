// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import { Interaction } from '../../../types';
import { SHOP_ITEMS } from '../../Shop';
import { useEditDrawerContext } from '../context';

export const ObjectsTab: React.FC = () => {
  const {
    localConfig,
    partners,
    circles,
    activeCircleId,
    newWorldName,
    editingCircleId,
    editingCircleName,
    isCircleUpdating,
    newLandName,
    objectCategoryFilter,
    isUploading,
    igToken,
    isFetchingIG,
    igProfileResult,
    expandedCouponId,
    isDraggingOver,
    handleInputChange,
    handlePwaIconUpload,
    addPet,
    removePet,
    handlePetChange,
    addProposalQuestion,
    removeProposalQuestion,
    updateProposalQuestion,
    setProposalProgress,
    setIgToken,
    fetchInstagramProfile,
    fetchInstagramFeed,
    handleMultiFileUpload,
    handleGalleryUrlChange,
    toggleGalleryPrivacy,
    addGalleryImage,
    removeGalleryImage,
    handleFileUpload,
    setPreviewItem,
    getPreviewUrl,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isVideo,
    addAlbum,
    deleteAlbum,
    handleGalleryAlbumChange,
    handleTimelineFileUpload,
    handleTimelineChange,
    addTimelineEvent,
    updateLocal,
    setExpandedCouponId,
    handleCouponChange,
    addCoupon,
    setActiveCircle,
    setNewWorldName,
    handleCreateWorld,
    setEditingCircleId,
    setEditingCircleName,
    handleUpdateWorld,
    handleDeleteWorld,
    setNewLandName,
    addLand,
    deleteLand,
    toggleLandActive,
    setObjectCategoryFilter,
    uploadAPI,
  } = useEditDrawerContext();

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <i className="fas fa-cube text-pink-400"></i> Object Library
                </h3>
                <label className="cursor-pointer bg-pink-500 text-white hover:bg-pink-600 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all shadow-md">
                  <i className="fas fa-upload mr-2"></i> Upload Model
                  <input 
                    type="file" 
                    accept=".glb,.gltf" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        await uploadAPI.upload(file);
                        // Add to a "Custom Models" inventory or similar logic
                        alert(`Successfully uploaded ${file.name}! It is now available in your Custom models.`);
                      } catch {
                        alert('Upload failed. Please try again.');
                      }
                    }} 
                  />
                </label>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'all', label: 'All', icon: 'fa-border-all' },
                  { id: 'pet', label: 'Pets', icon: 'fa-paw' },
                  { id: 'deco', label: 'Decor', icon: 'fa-palette' },
                  { id: 'bldg', label: 'Buildings', icon: 'fa-home' },
                  { id: 'custom', label: 'Custom', icon: 'fa-box-open' },
                ] as const).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setObjectCategoryFilter(cat.id)}
                    className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                      objectCategoryFilter === cat.id
                        ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                        : 'bg-white text-gray-400 border-gray-100 hover:border-pink-200'
                    }`}
                  >
                    <i className={`fas ${cat.icon}`}></i>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Object Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {SHOP_ITEMS.filter(item => 
                  objectCategoryFilter === 'all' || 
                  item.type.startsWith(objectCategoryFilter) ||
                  (objectCategoryFilter === 'custom' && item.type === 'custom_3d')
                ).map((item) => (
                  <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-md p-4 flex flex-col items-center text-center gap-3 group hover:border-pink-200 transition-all">
                    <div className="text-3xl bg-white w-12 h-12 rounded-md flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800">{item.name}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{item.type}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-[10px]">
                      <i className="fas fa-coins text-[8px]"></i>
                      {item.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
};
