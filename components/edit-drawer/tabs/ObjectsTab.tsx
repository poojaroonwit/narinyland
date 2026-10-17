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
    onOpenShop,
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
                <button type="button" onClick={onOpenShop} disabled={!onOpenShop} className="min-h-[44px] rounded-xl bg-pink-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-pink-600 disabled:opacity-50">
                  <i className="fas fa-store mr-2" aria-hidden="true" />Upload in World Shop
                </button>        </label>
              </div>

              <p className="text-xs text-stone-500">Custom models are added to your world after purchasing and uploading them in the World Shop. Uploading here alone does not create an inventory item.</p>
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <h4 className="font-semibold">Purchased custom models</h4>
                {(localConfig.lands ?? []).flatMap((land: any) =>
                  (land.items ?? []).filter((item: any) => item.type === 'custom_3d').map((item: any) => ({ ...item, landName: land.name }))
                ).length ? (
                  <ul className="mt-2 space-y-2">
                    {(localConfig.lands ?? []).flatMap((land: any) =>
                      (land.items ?? []).filter((item: any) => item.type === 'custom_3d').map((item: any) => ({ ...item, landName: land.name }))
                    ).map((item: any) => <li key={item.id} className="rounded-lg bg-white px-3 py-2 text-xs">📦 Model in {item.landName} — ready in that Land</li>)}
                  </ul>
                ) : <p className="mt-1 text-xs">No purchased custom models yet.</p>}
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
