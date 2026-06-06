// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import { Interaction } from '../../../types';
import { SHOP_ITEMS } from '../../Shop';
import { useEditDrawerContext } from '../context';

export const WorldTab: React.FC = () => {
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
             
             {/* Create New World Section */}
             <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-5 rounded-md shadow-lg text-white">
                <h3 className="font-black uppercase text-[11px] tracking-widest mb-3 flex items-center gap-2">
                  <i className="fas fa-plus-circle"></i> Create New World
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                    placeholder="Enter world name..."
                    className="flex-1 bg-white/20 border border-white/30 rounded-md p-3 text-xs font-bold placeholder:text-white/60 outline-none focus:bg-white/30 transition-all"
                  />
                  <button 
                    onClick={handleCreateWorld}
                    disabled={isCircleUpdating || !newWorldName.trim()}
                    className="bg-white text-pink-600 px-4 py-2 rounded-md font-black text-[10px] uppercase shadow-md hover:bg-pink-50 transition-all disabled:opacity-50"
                  >
                    {isCircleUpdating ? '...' : 'Create'}
                  </button>
                </div>
                <p className="text-[9px] mt-3 text-white/80 italic">A world is a shared space for you and your partner. Each world has its own timeline, memories, and settings.</p>
             </div>

             {/* Circles List */}
             <div className="space-y-4">
               <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">
                   <i className="fas fa-globe-asia text-emerald-500 mr-2"></i> My Worlds (Circles)
                 </h3>
                 <div className="bg-emerald-50 text-emerald-500 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">{circles.length} Active</div>
               </div>

               <div className="flex flex-col gap-3">
                 {circles.filter(c => c.id && c.id !== 'undefined').map(circle => (
                    <div
                      key={circle.id}
                      className={`bg-white rounded-md shadow-sm border transition-all duration-300 ${circle.id === activeCircleId ? 'border-pink-300 ring-4 ring-pink-50' : 'border-gray-100 hover:shadow-md'}`}
                    >
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {editingCircleId === circle.id ? (
                            <div className="flex gap-2 mb-1">
                              <input 
                                type="text"
                                value={editingCircleName}
                                onChange={(e) => setEditingCircleName(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-1.5 text-xs font-bold outline-none focus:border-pink-300"
                                autoFocus
                              />
                              <button 
                                onClick={() => handleUpdateWorld(circle.id)}
                                disabled={isCircleUpdating}
                                className="px-3 py-1 bg-pink-500 text-white rounded-md text-[10px] font-black uppercase"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingCircleId(null)}
                                className="px-3 py-1 bg-gray-100 text-gray-500 rounded-md text-[10px] font-black uppercase"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h4 className="font-black text-gray-800 text-sm truncate flex items-center gap-2">
                              {circle.name}
                              {circle.id === activeCircleId && <span className="bg-pink-100 text-pink-500 text-[8px] px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                            </h4>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{circle.id}</code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(circle.id);
                                alert('World Code copied to clipboard!');
                              }}
                              className="text-gray-300 hover:text-pink-500 transition-colors"
                              title="Copy World Code"
                            >
                              <i className="fas fa-copy text-[10px]"></i>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                           {circle.id !== activeCircleId && (
                             <button 
                               onClick={() => setActiveCircle(circle.id)}
                               className="px-4 py-2 bg-pink-50 text-pink-600 hover:bg-pink-500 hover:text-white rounded-md text-[10px] font-black uppercase tracking-widest transition-all"
                             >
                               Switch
                             </button>
                           )}
                           
                           <div className="flex items-center border-l border-gray-100 pl-2">
                              <button 
                                 onClick={() => {
                                   setEditingCircleId(circle.id);
                                   setEditingCircleName(circle.name);
                                 }}
                                 className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                 title="Rename World"
                              >
                                 <i className="fas fa-edit text-xs"></i>
                              </button>
                              <button 
                                 onClick={() => handleDeleteWorld(circle.id, circle.name)}
                                 className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                 title="Delete World"
                              >
                                 <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                 ))}

                 {circles.length === 0 && (
                   <div className="text-center py-10 bg-gray-50 rounded-md border-2 border-dashed border-gray-200">
                     <i className="fas fa-globe text-4xl text-gray-200 mb-3"></i>
                     <p className="text-sm font-bold text-gray-400">No worlds found. Create your first one above!</p>
                   </div>
                 )}
               </div>
             </div>
             
             <div className="bg-emerald-50/50 p-4 rounded-md border border-emerald-100 flex items-start gap-3">
               <i className="fas fa-info-circle text-emerald-500 mt-0.5"></i>
               <p className="text-[10px] text-emerald-700 leading-relaxed">
                 Invite your partner by sharing the <strong>World Code</strong>. When they enter the code in the &quot;Join World&quot; section, both of you will share all the magic across Narinyland.
               </p>
             </div>

          </motion.div>
        );
};
