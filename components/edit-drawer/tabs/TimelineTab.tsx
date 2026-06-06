// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import { Interaction } from '../../../types';
import { SHOP_ITEMS } from '../../Shop';
import { useEditDrawerContext } from '../context';

export const TimelineTab: React.FC = () => {
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">Our Story</h3>
                 <button onClick={addTimelineEvent} className="bg-pink-500 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-md">+ New Event</button>
              </div>

               {/* View Settings (Moved from Timeline Toolbar) */}
               <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-eye text-blue-400"></i> View Settings
                  </h3>
                  
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Layout Mode</label>
                  <div className="flex bg-gray-100 p-1 rounded-md mb-4">
                        {([
                           { id: 'wave', label: 'Wave', icon: 'fa-water' },
                           { id: 'vertical', label: 'Vertical', icon: 'fa-arrows-alt-v' }
                        ] as const).map((mode) => (
                           <button
                              key={mode.id}
                              onClick={() => handleInputChange('timelineLayoutMode', mode.id)}
                              className={`flex-1 py-3 px-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                    (localConfig.timelineLayoutMode || 'wave') === mode.id 
                                    ? 'bg-white text-pink-500 shadow-md' 
                                    : 'text-gray-400 hover:text-gray-600'
                              }`}
                           >
                              <i className={`fas ${mode.icon}`}></i> {mode.label}
                           </button>
                        ))}
                  </div>

                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Zoom Level</label>
                  <input 
                        type="range"
                        min="0"
                        max="7"
                        step="1"
                        value={localConfig.timelineZoomLevel || 0}
                        onChange={(e) => handleInputChange('timelineZoomLevel', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-md appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                        <span>Close</span>
                        <span>Far</span>
                  </div>
               </div>

              {/* Timeline Display Settings */}
              <div className="bg-gray-50/50 p-4 rounded-md border border-gray-100 space-y-4">
                 <div className="space-y-2">
                     <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Card Sizing (Desktop)</p>
                        <span className="text-pink-500 font-bold text-[10px]">
                           {Math.round((localConfig.timelineCardScale || 1.0) * 100)}%
                        </span>
                     </div>
                     <input 
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={localConfig.timelineCardScale || 1.0}
                        onChange={(e) => handleInputChange('timelineCardScale', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-md appearance-none cursor-pointer accent-pink-500"
                     />
                 </div>

                 <div className="space-y-2 border-t border-gray-200 pt-3">
                     <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thumbnail Size (Square)</p>
                        <span className="text-pink-500 font-bold text-[10px]">
                           {localConfig.timelineThumbnailHeight || 150}px
                        </span>
                     </div>
                     <input 
                        type="range"
                        min="50"
                        max="400"
                        step="10"
                        value={localConfig.timelineThumbnailHeight || 150}
                        onChange={(e) => handleInputChange('timelineThumbnailHeight', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-md appearance-none cursor-pointer accent-pink-500"
                     />
                 </div>
              </div>
              <div className="space-y-2">
                 {localConfig.timeline.map((item, idx) => (
                    <motion.div 
                       key={item.id} 
                       initial={{ opacity: 0, x: -10 }} 
                       animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                       className="bg-white p-2 rounded-md shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all group"
                    >
                       <div className="w-10 h-10 shrink-0 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center border border-gray-200 relative">
                           {item.media?.type === 'image' && <Image src={item.media.url} alt={item.text || 'Timeline media'} width={40} height={40} unoptimized className="w-full h-full object-cover" />}
                           {item.media?.type === 'video' && <i className="fas fa-video text-blue-400"></i>}
                           {item.media?.type === 'audio' && <i className="fas fa-microphone text-orange-400"></i>}
                           {!item.media && <i className="fas fa-sticky-note text-gray-300"></i>}
                           
                           <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-10">
                              <i className="fas fa-camera text-white text-[10px]"></i>
                              <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*,video/*"
                                 onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleTimelineFileUpload(item.id, file);
                                 }}
                              />
                           </label>
                       </div>

                       <div className="flex-1 min-w-0 grid grid-cols-1 gap-1">
                          <div className="flex gap-2">
                             <DatePicker
                                selected={item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)}
                                onChange={(date: Date | null) => date && handleTimelineChange(item.id, 'timestamp', date)}
                                showTimeSelect
                                dateFormat="MM/dd/yy"
                                className="w-20 text-[10px] font-bold text-gray-500 bg-transparent outline-none p-0 cursor-pointer hover:text-pink-500"
                             />
                             <input 
                               type="text"
                               value={item.text}
                               onChange={(e) => handleTimelineChange(item.id, 'text', e.target.value)}
                               className="flex-1 text-xs font-bold text-gray-800 bg-transparent outline-none truncate focus:text-pink-600 focus:bg-pink-50/50 rounded-md px-1"
                             />
                          </div>
                       </div>

                       <button 
                          onClick={() => {
                             if(confirm('Delete event?')) updateLocal(prev => ({ 
                                ...prev, 
                                timeline: prev.timeline.filter(t => t.id !== item.id) 
                             }));
                          }}
                          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0"
                       >
                          <i className="fas fa-trash-alt text-xs"></i>
                       </button>
                    </motion.div>
                 ))}
              </div>



           </motion.div>
        );
};
