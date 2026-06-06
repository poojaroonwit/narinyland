// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import { Interaction } from '../../../types';
import { SHOP_ITEMS } from '../../Shop';
import { useEditDrawerContext } from '../context';

export const CouponsTab: React.FC = () => {
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
              <div className="bg-pink-50/30 p-4 rounded-md flex items-center justify-between border border-pink-50 mb-4">
                 <div>
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-2 italic">
                       <i className="fas fa-history text-pink-500"></i> Show Redeemed on Timeline
                    </p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 ml-6">Display used coupons in your story</p>
                 </div>
                 <button 
                   onClick={() => handleInputChange('showCouponsOnTimeline', !localConfig.showCouponsOnTimeline)}
                   className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${localConfig.showCouponsOnTimeline ? 'bg-pink-500 justify-end' : 'bg-gray-200 justify-start'}`}
                 >
                    <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                 </button>
              </div>

              <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">Gifts & Vouchers</h3>
                 <button onClick={addCoupon} className="bg-purple-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-md">+ Add Coupon</button>
              </div>
              {localConfig.coupons.map(coupon => {
                 const isExpanded = expandedCouponId === coupon.id;
                 return (
                  <div 
                     key={coupon.id} 
                     className={`bg-white rounded-md shadow-sm border border-gray-100 transition-all duration-300 ${isExpanded ? 'p-4 ring-2 ring-pink-100' : 'p-3 hover:shadow-md cursor-pointer'}`}
                     onClick={() => !isExpanded && setExpandedCouponId(coupon.id)}
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-50 rounded-md flex items-center justify-center text-2xl shadow-inner">
                           {coupon.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-black text-gray-800 truncate">{coupon.title}</h4>
                           <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                              <span className="bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded text-[10px] uppercase">{coupon.points || 0} PTS</span>
                              <span>•</span>
                              <span>{coupon.for === 'partner1' ? localConfig.partners.partner1.name : localConfig.partners.partner2.name}</span>
                              {coupon.isRedeemed && <span className="text-red-400">• Redeemed</span>}
                           </div>
                        </div>
                        <button 
                           onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCouponId(isExpanded ? null : coupon.id);
                           }}
                           className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-pink-500 transition-colors"
                        >
                           <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                        </button>
                     </div>

                     <AnimatePresence>
                        {isExpanded && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                           >
                              <div className="pt-4 mt-2 border-t border-gray-50 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                                 <div className="flex gap-3">
                                    <div className="flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Emoji</label>
                                       <input 
                                          type="text" 
                                          value={coupon.emoji} 
                                          onChange={(e) => handleCouponChange(coupon.id, 'emoji', e.target.value)}
                                          className="w-16 text-center border rounded-md p-2 text-2xl"
                                       />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Title</label>
                                       <input 
                                          type="text" 
                                          value={coupon.title} 
                                          onChange={(e) => handleCouponChange(coupon.id, 'title', e.target.value)}
                                          className="w-full border-2 border-gray-100 rounded-md p-3 font-black text-sm focus:border-purple-200 outline-none transition-all"
                                       />
                                    </div>
                                 </div>
                                 
                                 <div className="flex flex-col gap-1">
                                    <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Description</label>
                                    <input 
                                       type="text" 
                                       value={coupon.desc} 
                                       onChange={(e) => handleCouponChange(coupon.id, 'desc', e.target.value)}
                                       className="w-full border-2 border-gray-100 rounded-md p-3 text-xs font-bold focus:border-purple-200 outline-none transition-all"
                                       placeholder="Coupon description..."
                                    />
                                 </div>

                                 <div className="flex gap-3">
                                    <div className="flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">Points</label>
                                       <input
                                          type="number"
                                          min="0"
                                          step="100"
                                          value={coupon.points || 0}
                                          onChange={(e) => handleCouponChange(coupon.id, 'points', parseInt(e.target.value))}
                                          className="w-24 border-2 border-gray-100 rounded-md p-3 text-xs font-bold focus:border-purple-200 outline-none transition-all"
                                       />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1">
                                       <label className="text-[9px] uppercase font-black text-gray-400 tracking-widest pl-1">For Who?</label>
                                       <select 
                                          value={coupon.for} 
                                          onChange={(e) => handleCouponChange(coupon.id, 'for', e.target.value)}
                                          className="w-full text-xs font-black border rounded-md p-3 bg-gray-50 uppercase"
                                       >
                                          <option value="partner1">{localConfig.partners.partner1.name}</option>
                                          <option value="partner2">{localConfig.partners.partner2.name}</option>
                                       </select>
                                    </div>
                                 </div>

                                 <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none group/toggle">
                                       <div 
                                          onClick={() => handleCouponChange(coupon.id, 'isRedeemed', !coupon.isRedeemed)}
                                          className={`w-8 h-4 rounded-full transition-all relative ${coupon.isRedeemed ? 'bg-red-500' : 'bg-gray-200'}`}
                                       >
                                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${coupon.isRedeemed ? 'left-4.5' : 'left-0.5'}`} />
                                       </div>
                                       <span className={`text-[9px] font-black uppercase tracking-widest ${coupon.isRedeemed ? 'text-red-500' : 'text-gray-400'}`}>
                                          {coupon.isRedeemed ? 'Redeemed' : 'Unused'}
                                       </span>
                                    </label>

                                    <button 
                                       onClick={() => {
                                          if (window.confirm("Delete this coupon?")) {
                                             updateLocal(prev => ({ ...prev, coupons: prev.coupons.filter(c => c.id !== coupon.id) }));
                                          }
                                       }}
                                       className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-500 hover:text-white transition-all"
                                    >
                                       Delete Coupon
                                    </button>
                                 </div>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
               );
            })}
         </motion.div>
        );
};
