// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import { Interaction } from '../../../types';
import { SHOP_ITEMS } from '../../Shop';
import { useEditDrawerContext } from '../context';

export const LandTab: React.FC = () => {
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
            {/* Create New Land Section */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-md shadow-lg text-white">
              <h3 className="font-black uppercase text-[11px] tracking-widest mb-3 flex items-center gap-2">
                <i className="fas fa-plus-circle"></i> Create New Land
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLandName}
                  onChange={(e) => setNewLandName(e.target.value)}
                  placeholder="Enter land name..."
                  className="flex-1 bg-white/20 border border-white/30 rounded-md p-3 text-xs font-bold placeholder:text-white/60 outline-none focus:bg-white/30 transition-all"
                />
                <button
                  onClick={() => { addLand(newLandName); setNewLandName(''); }}
                  disabled={!newLandName.trim()}
                  className="bg-white text-amber-600 px-4 py-2 rounded-md font-black text-[10px] uppercase shadow-md hover:bg-amber-50 transition-all disabled:opacity-50"
                >
                  Create
                </button>
              </div>
              <p className="text-[9px] mt-3 text-white/80 italic">A land is a 3D space within your world where you can place objects and decorate.</p>
            </div>

            {/* Lands List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">
                  <i className="fas fa-map-marked-alt text-amber-500 mr-2"></i> My Lands
                </h3>
                <div className="bg-amber-50 text-amber-600 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">{(localConfig.lands || []).length} Total</div>
              </div>

              <div className="flex flex-col gap-3">
                {(localConfig.lands || []).map(land => (
                  <div
                    key={land.id}
                    className={`bg-white rounded-md shadow-sm border transition-all duration-300 ${land.isActive ? 'border-amber-300 ring-4 ring-amber-50' : 'border-gray-100 hover:shadow-md'}`}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-gray-800 text-sm truncate flex items-center gap-2">
                          {land.name}
                          {land.isActive && <span className="bg-amber-100 text-amber-600 text-[8px] px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                        </h4>
                        <p className="text-[9px] text-gray-400 mt-1">{land.items?.length || 0} objects placed</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!land.isActive && (
                          <button
                            onClick={() => toggleLandActive(land.id)}
                            className="px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-md text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Activate
                          </button>
                        )}

                        <div className="flex items-center border-l border-gray-100 pl-2">
                          <button
                            onClick={() => deleteLand(land.id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            title="Delete Land"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {(localConfig.lands || []).length === 0 && (
                  <div className="text-center py-10 bg-gray-50 rounded-md border-2 border-dashed border-gray-200">
                    <i className="fas fa-map text-4xl text-gray-200 mb-3"></i>
                    <p className="text-sm font-bold text-gray-400">No lands found. Create your first one above!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50/50 p-4 rounded-md border border-amber-100 flex items-start gap-3">
              <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Only one land can be active at a time. The active land is where your 3D objects will appear. Switch lands to see different scenes.
              </p>
            </div>
          </motion.div>
        );
};
