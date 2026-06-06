// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import { Interaction } from '../../../types';
import { SHOP_ITEMS } from '../../Shop';
import { useEditDrawerContext } from '../context';

export const GalleryTab: React.FC = () => {
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
             <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Gallery Interaction</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-pink-50/50 p-4 rounded-md border border-pink-100 flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-gray-700 uppercase">3D Physics Flow</p>
                        <p className="text-[8px] text-gray-400">Apply floating effect</p>
                     </div>
                     <button 
                        onClick={() => handleInputChange('galleryPhysicsEnabled', !localConfig.galleryPhysicsEnabled)}
                        className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${localConfig.galleryPhysicsEnabled ? 'bg-pink-500 justify-end' : 'bg-gray-200 justify-start'}`}
                     >
                        <motion.div layout className="w-3 h-3 bg-white rounded-full shadow-sm" />
                     </button>
                  </div>
                  <div className="bg-amber-50/50 p-4 rounded-md border border-amber-100 flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black text-gray-700 uppercase">Auto-Slide Time</p>
                        <p className="text-[8px] text-gray-400">Interval in seconds</p>
                     </div>
                     <input 
                        type="number" 
                        min="2" 
                        max="30"
                        value={localConfig.galleryInterval || 5} 
                        onChange={(e) => handleInputChange('galleryInterval', parseInt(e.target.value))}
                        className="w-12 bg-white border border-amber-200 rounded-md p-1.5 text-xs font-bold outline-none text-center"
                     />
                  </div>
                </div>
             </div>

             <div className="space-y-4">
               {/* Albums Management */}
               <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <i className="fas fa-folder-open text-amber-400"></i> Photo Albums
                    </h3>
                    <button 
                      onClick={() => {
                        const name = prompt("Enter album name:");
                        if (name) addAlbum(name);
                      }}
                      className="bg-amber-50 text-amber-600 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-amber-100 hover:bg-amber-100"
                    >
                      + Create Album
                    </button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {localConfig.albums?.map(album => (
                      <div key={album.id} className="bg-amber-50/30 px-3 py-2 rounded-md border border-amber-100 flex items-center gap-3">
                         <span className="text-xs font-bold text-gray-700">{album.name}</span>
                         <span className="text-[8px] bg-amber-100 text-amber-600 px-1 rounded-full font-black">
                           {localConfig.gallery.filter(item => item.albumId === album.id).length}
                         </span>
                         <button onClick={() => deleteAlbum(album.id)} className="text-red-300 hover:text-red-500 transition-colors">
                           <i className="fas fa-times text-[10px]"></i>
                         </button>
                      </div>
                    ))}
                    {(localConfig.albums?.length || 0) === 0 && <p className="text-[10px] text-gray-400 italic">No albums created yet</p>}
                 </div>
               </div>

               {/* Instagram Import */}
               <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-md shadow-lg text-white space-y-4">
                 <div className="flex items-center gap-3">
                    <i className="fab fa-instagram text-3xl"></i>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider">Instagram Import</h4>
                      <p className="text-[9px] text-white/70 uppercase font-bold tracking-widest">Connect your digital life</p>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                       <label className="text-[9px] font-black text-white/60 uppercase tracking-widest ml-1">Method A: Public Profile (No Login)</label>
                       <div className="flex gap-2">
                         <div className="flex-1 bg-white/20 rounded-md flex items-center px-3 gap-2 border border-white/30 focus-within:bg-white/30 transition-all">
                           <span className="text-white/40 text-sm">@</span>
                           <input 
                             type="text" 
                             value={localConfig.instagramUsername || ''} 
                             onChange={(e) => handleInputChange('instagramUsername', e.target.value)}
                             className="flex-1 bg-transparent py-3 text-xs font-bold placeholder:text-white/40 outline-none"
                             placeholder="username"
                           />
                         </div>
                         <button 
                           onClick={fetchInstagramProfile}
                           disabled={isFetchingIG || !localConfig.instagramUsername}
                           className="bg-white text-purple-600 px-4 rounded-md font-black text-[10px] uppercase shadow-md disabled:opacity-50 hover:bg-purple-50 transition-all"
                         >
                           {isFetchingIG ? '...' : 'Fetch'}
                         </button>
                       </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
                       <label className="text-[9px] font-black text-white/60 uppercase tracking-widest ml-1">Method B: Access Token (Bulk)</label>
                       <div className="flex gap-2">
                         <input 
                           type="password" 
                           value={igToken} 
                           onChange={(e) => setIgToken(e.target.value)}
                           className="flex-1 bg-white/20 border border-white/30 rounded-md p-3 text-xs font-bold placeholder:text-white/40 outline-none focus:bg-white/30"
                           placeholder="IG Access Token..."
                         />
                         <button 
                           onClick={fetchInstagramFeed}
                           disabled={isFetchingIG || !igToken}
                           className="bg-white text-pink-600 px-4 rounded-md font-black text-[10px] uppercase shadow-md disabled:opacity-50 hover:bg-pink-50 transition-all"
                         >
                           Import
                         </button>
                       </div>
                    </div>
                    {igProfileResult && <p className={`text-[10px] font-bold p-2 rounded-md ${igProfileResult.startsWith('❌') ? 'bg-red-500/20' : 'bg-green-500/20'}`}>{igProfileResult}</p>}
                 </div>
               </div>

               <div className="flex justify-between items-center px-1">
                 <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-widest">Memory Grid</h3>
                 <div className="flex gap-2">
                   <button onClick={addGalleryImage} className="bg-pink-500 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-md">+ Add Image</button>
                   <label className="cursor-pointer bg-white text-pink-500 border border-pink-200 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm hover:bg-pink-50 transition-all">
                      Upload Files
                      <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && handleMultiFileUpload(e.target.files)} />
                   </label>
                 </div>
               </div>

               {/* Bulk Drop Zone */}
               <div 
                 onDragOver={handleDragOver}
                 onDragLeave={handleDragLeave}
                 onDrop={handleDrop}
                 className={`w-full py-10 rounded-md border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${isDraggingOver ? 'bg-pink-50 border-pink-400 text-pink-500' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
               >
                  <i className={`fas fa-cloud-upload-alt text-4xl ${isDraggingOver ? 'animate-bounce' : 'opacity-20'}`}></i>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">Drop many photos to upload in bulk</p>
                  <p className="text-[9px] opacity-60">or click the button above</p>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                 {localConfig.gallery.map((item, idx) => (
                   <motion.div 
                     layout
                     key={idx} 
                     initial={{ opacity: 0, scale: 0.9 }} 
                     animate={{ opacity: 1, scale: 1 }}
                     className="bg-white p-3 rounded-md shadow-sm border border-gray-100 space-y-3 relative group"
                   >
                     <div className="w-full aspect-square bg-gray-50 rounded-md overflow-hidden relative border border-gray-100">
                        {isVideo(item.url) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50/30">
                             <i className="fas fa-video text-2xl text-blue-300"></i>
                             <p className="text-[8px] font-black text-blue-400 uppercase mt-1">Video File</p>
                          </div>
                        ) : (
                          <Image 
                            src={getPreviewUrl(item.url)} 
                            alt={`Gallery ${idx}`} 
                            width={320}
                            height={320}
                            unoptimized
                            className="w-full h-full object-cover transition-transform group-hover:scale-110 cursor-zoom-in" 
                            onClick={() => setPreviewItem({ url: getPreviewUrl(item.url), type: 'image' })}
                          />
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button 
                             onClick={() => toggleGalleryPrivacy(idx)}
                             title={item.privacy === 'public' ? 'Public' : 'Private'}
                             className={`w-6 h-6 rounded-md backdrop-blur-md flex items-center justify-center text-[10px] transition-all ${item.privacy === 'public' ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}
                          >
                             <i className={`fas ${item.privacy === 'public' ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                          </button>
                        </div>

                        {/* Hover Tools Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform flex justify-between gap-1 items-center">
                           <label className="cursor-pointer bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-md transition-all flex-1 text-center">
                              <i className="fas fa-camera text-[10px]"></i>
                              <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(idx, e.target.files[0])} />
                           </label>
                           <button onClick={() => removeGalleryImage(idx)} className="bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-md transition-all flex-1">
                              <i className="fas fa-trash text-[10px]"></i>
                           </button>
                        </div>

                        {isUploading === idx && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                             <i className="fas fa-circle-notch animate-spin text-pink-500"></i>
                          </div>
                        )}
                     </div>
                     <div className="space-y-2">
                        <input 
                           type="text" 
                           value={item.url} 
                           onChange={(e) => handleGalleryUrlChange(idx, e.target.value)}
                           className="w-full bg-gray-50 border border-gray-100 rounded-md p-2 text-[8px] font-mono text-gray-500 outline-none focus:border-pink-200"
                           placeholder="Direct image/video URL..."
                        />
                        <div>
                           <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 ml-0.5">Assign to Album</label>
                           <select
                             value={item.albumId || ''}
                             onChange={(e) => handleGalleryAlbumChange(idx, e.target.value || null)}
                             className="w-full bg-white border border-gray-200 rounded-md p-1.5 text-[9px] font-bold outline-none"
                           >
                             <option value="">No Album</option>
                             {localConfig.albums?.map(album => (
                               <option key={album.id} value={album.id}>{album.name}</option>
                             ))}
                           </select>
                        </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
             </div>
          </motion.div>
        );
};
