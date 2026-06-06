// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import { Interaction } from '../../../types';
import { SHOP_ITEMS } from '../../Shop';
import { useEditDrawerContext } from '../context';

export const GeneralTab: React.FC = () => {
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
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-info-circle text-pink-400"></i> Core Setup
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">World Name</label>
                    <p className="text-[8px] text-gray-400 ml-1">The title of your magical space</p>
                  </div>
                  <input 
                    type="text" 
                    value={localConfig.appName} 
                    onChange={(e) => handleInputChange('appName', e.target.value)}
                    className="w-1/2 bg-gray-50 border-2 border-gray-100 rounded-md p-3 text-xs font-bold outline-none focus:border-pink-200 transition-all text-right"
                  />
                </div>

                <div className="flex justify-between items-center gap-4 pt-2">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Proposal Feature</label>
                    <p className="text-[8px] text-gray-400 ml-1">Show or hide the proposal screen</p>
                  </div>
                  <button
                    onClick={() => handleInputChange('showProposal', !localConfig.showProposal)}
                    className={`w-12 h-6 rounded-full transition-all relative ${localConfig.showProposal ? 'bg-pink-500' : 'bg-gray-200'}`}
                  >
                    <motion.div 
                      animate={{ x: localConfig.showProposal ? 24 : 4 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
                <div className="flex justify-between items-center gap-4 pt-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Anniversary</label>
                  <div className="w-1/2 text-right">
                    <DatePicker
                      selected={new Date(localConfig.anniversaryDate || Date.now())}
                      onChange={(date: Date | null) => date && handleInputChange('anniversaryDate', date.toISOString())}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-md p-3 text-xs font-bold outline-none focus:border-pink-200 transition-all text-right"
                    />
                  </div>
                </div>
                
                {/* PWA / App Identity */}
                <div className="bg-pink-50/30 p-4 rounded-md border border-pink-100 space-y-4">
                  <h4 className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-mobile-alt"></i> App Identity & PWA
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">App Name (Long)</label>
                       <input 
                         type="text" 
                         value={localConfig.pwaName || localConfig.appName || ''} 
                         onChange={(e) => handleInputChange('pwaName', e.target.value)}
                         className="w-full border border-gray-200 rounded-md p-2 text-xs font-bold outline-none focus:border-pink-300"
                         placeholder="Narinyland"
                       />
                     </div>
                     <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Short Name</label>
                       <input 
                         type="text" 
                         value={localConfig.pwaShortName || ''} 
                         onChange={(e) => handleInputChange('pwaShortName', e.target.value)}
                         className="w-full border border-gray-200 rounded-md p-2 text-xs font-bold outline-none focus:border-pink-300"
                         placeholder="Nariny"
                       />
                     </div>
                  </div>
                  <div>
                     <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Description</label>
                     <input 
                       type="text" 
                       value={localConfig.pwaDescription || ''} 
                       onChange={(e) => handleInputChange('pwaDescription', e.target.value)}
                       className="w-full border border-gray-200 rounded-md p-2 text-xs font-bold outline-none focus:border-pink-300"
                       placeholder="Our magical world..."
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Theme Color</label>
                       <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md p-1.5 pl-3">
                          <input 
                            type="color" 
                            value={localConfig.pwaThemeColor || '#ec4899'} 
                            onChange={(e) => handleInputChange('pwaThemeColor', e.target.value)}
                            className="w-6 h-6 rounded-full border-none cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-gray-500">{localConfig.pwaThemeColor || '#ec4899'}</span>
                       </div>
                     </div>
                     <div>
                       <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Background Color</label>
                       <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md p-1.5 pl-3">
                          <input 
                            type="color" 
                            value={localConfig.pwaBackgroundColor || '#ffffff'} 
                            onChange={(e) => handleInputChange('pwaBackgroundColor', e.target.value)}
                            className="w-6 h-6 rounded-full border-none cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-gray-500">{localConfig.pwaBackgroundColor || '#ffffff'}</span>
                       </div>
                     </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">App Icon (512x512)</label>
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                          {localConfig.pwaIconUrl ? (
                            <Image src={localConfig.pwaIconUrl} alt="App Icon" width={64} height={64} unoptimized className="w-full h-full object-cover" />
                          ) : (
                            <i className="fas fa-mobile text-2xl text-gray-300"></i>
                          )}
                       </div>
                       <label className="cursor-pointer bg-white border border-pink-200 text-pink-500 hover:bg-pink-50 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all shadow-sm">
                          {isUploading === 999 ? 'Uploading...' : 'Upload Icon'}
                          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handlePwaIconUpload(e.target.files[0])} />
                       </label>
                       {localConfig.pwaIconUrl && (
                          <button onClick={() => handleInputChange('pwaIconUrl', null)} className="text-red-400 hover:text-red-500 text-xs px-2">
                             <i className="fas fa-trash"></i>
                          </button>
                       )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Music Playlist (One URL per line) 🎵</label>
                    <textarea 
                      value={(localConfig.musicPlaylist || []).join('\n')} 
                      onChange={(e) => handleInputChange('musicPlaylist', e.target.value.split('\n'))}
                      className="w-full border-2 border-gray-50 rounded-md p-4 text-xs font-bold text-gray-600 focus:border-pink-200 outline-none transition-colors h-24 resize-none"
                      placeholder="https://youtube.com/watch?v=...&#10;https://youtube.com/watch?v=..." 
                    />
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Anniversary</label>
                    <DatePicker
                      selected={localConfig.anniversaryDate ? new Date(localConfig.anniversaryDate) : null}
                      onChange={(date: Date | null) => handleInputChange('anniversaryDate', date ? date.toISOString() : '')}
                      dateFormat="MMMM d, yyyy"
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Forest Style</label>
                    <select 
                      value={localConfig.treeStyle} 
                      onChange={(e) => handleInputChange('treeStyle', e.target.value)}
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white"
                    >
                      <option value="oak">Classic Oak 🌳</option>
                      <option value="sakura">Sakura 🌸</option>
                      <option value="neon">Neon 🔮</option>
                      <option value="midnight">Midnight Magic ✨</option>
                      <option value="frozen">Frozen ❄️</option>
                      <option value="golden">Golden ☀️</option>
                    </select>
                  </div>
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-pink-500 uppercase tracking-widest ml-1">Dynamic Pets Management</label>
                      <button 
                        onClick={addPet}
                        className="bg-pink-100 text-pink-600 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-pink-200 transition-all"
                      >
                        + Add Pet
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Show old single pet if pets array is empty */}
                      {(!localConfig.pets || localConfig.pets.length === 0) && (
                        <div className="p-4 bg-gray-50 rounded-md border border-gray-100 flex items-center gap-4">
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Primary Pet Type</label>
                              <select 
                                value={localConfig.petType || 'cat'} 
                                onChange={(e) => handleInputChange('petType', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-md p-2 text-xs font-bold outline-none"
                              >
                                <option value="cat">Fluffy Cat 🐱</option>
                                <option value="dog">Loyal Dog 🐶</option>
                                <option value="rabbit">Soft Rabbit 🐰</option>
                                <option value="panda">Chubby Panda 🐼</option>
                                <option value="fox">Red Fox 🦊</option>
                              </select>
                           </div>
                           <p className="text-[9px] text-gray-400 italic max-w-[120px]">This is your legacy pet. Add more to go dynamic! ✨</p>
                        </div>
                      )}

                      {/* Render Multiple Pets */}
                      {(localConfig.pets || []).map((pet) => (
                        <motion.div 
                          key={pet.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 bg-pink-50/30 rounded-md border border-pink-100 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center text-xl shadow-sm border border-pink-50">
                            {pet.type === 'cat' && '🐱'}
                            {pet.type === 'dog' && '🐶'}
                            {pet.type === 'rabbit' && '🐰'}
                            {pet.type === 'panda' && '🐼'}
                            {pet.type === 'fox' && '🦊'}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-[7px] font-black text-pink-400 uppercase mb-0.5">Pet Name</label>
                                <input 
                                  type="text"
                                  value={pet.name || ''}
                                  onChange={(e) => handlePetChange(pet.id, 'name', e.target.value)}
                                  className="w-full bg-white border border-pink-50 rounded-md p-1.5 text-[10px] font-bold outline-none"
                                  placeholder="Name..."
                                />
                             </div>
                             <div>
                                <label className="block text-[7px] font-black text-pink-400 uppercase mb-0.5">Animal Type</label>
                                <select 
                                  value={pet.type} 
                                  onChange={(e) => handlePetChange(pet.id, 'type', e.target.value)}
                                  className="w-full bg-white border border-pink-50 rounded-md p-1.5 text-[10px] font-bold outline-none"
                                >
                                  <option value="cat">Cat 🐱</option>
                                  <option value="dog">Dog 🐶</option>
                                  <option value="rabbit">Rabbit 🐰</option>
                                  <option value="panda">Panda 🐼</option>
                                  <option value="fox">Fox 🦊</option>
                                </select>
                             </div>
                          </div>
                          <button 
                            onClick={() => removePet(pet.id)}
                            className="w-8 h-8 flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Sky Time</label>
                    <select 
                      value={localConfig.skyMode || 'follow_timezone'} 
                      onChange={(e) => handleInputChange('skyMode', e.target.value)}
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white"
                    >
                      <option value="follow_timezone">Device Timezone 🕒</option>
                      <option value="noon">Always Noon ☀️</option>
                      <option value="night">Always Night 🌙</option>
                    </select>
                  </div>
                  <div className="col-span-2 bg-pink-50/30 p-4 rounded-md flex items-center justify-between border border-pink-50">
                     <div>
                        <p className="text-xs font-bold text-gray-800 flex items-center gap-2 italic">
                           <i className="fas fa-qrcode text-pink-500"></i> Show Mobile Upload QR
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 ml-6">Floating QR code at bottom-left</p>
                     </div>
                     <button 
                       onClick={() => handleInputChange('showQRCode', !localConfig.showQRCode)}
                       className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${localConfig.showQRCode ? 'bg-pink-500 justify-end' : 'bg-gray-200 justify-start'}`}
                     >
                        <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                     </button>
                  </div>

                  <div className="col-span-2 mt-2">
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest ml-1">Graphics Quality</label>
                     <select 
                       value={localConfig.graphicsQuality || 'medium'} 
                       onChange={(e) => handleInputChange('graphicsQuality', e.target.value)}
                       className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white font-bold text-sm"
                     >
                       <option value="low">Low (Fastest) ⚡</option>
                       <option value="medium">Medium (Balanced) ⚖️</option>
                       <option value="high">High (Best Visuals) ✨</option>
                     </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-seedling text-green-400"></i> Garden & Quality
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Graphics Quality</label>
                      <select 
                         value={localConfig.graphicsQuality || 'medium'} 
                         onChange={(e) => handleInputChange('graphicsQuality', e.target.value)}
                         className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none bg-white font-bold text-xs"
                      >
                         <option value="low">Low (Faster)</option>
                         <option value="medium">Medium</option>
                         <option value="high">High (Prettier)</option>
                      </select>
                   </div>
                   <div className="flex flex-col justify-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Show QR Code</p>
                      <button 
                         onClick={() => handleInputChange('showQRCode', !localConfig.showQRCode)}
                         className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${localConfig.showQRCode ? 'bg-green-500 justify-end' : 'bg-gray-200 justify-start'}`}
                      >
                         <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </button>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Days per Tree</label>
                    <input 
                      type="number" 
                      value={localConfig.daysPerTree} 
                      onChange={(e) => handleInputChange('daysPerTree', parseInt(e.target.value))}
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Days per Flower</label>
                    <input 
                      type="number" 
                      value={localConfig.daysPerFlower || 7} 
                      onChange={(e) => handleInputChange('daysPerFlower', parseInt(e.target.value))}
                      className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-md shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <i className="fas fa-user-friends text-blue-400"></i> The Couple
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                 <i className="fas fa-sync-alt animate-spin-slow text-green-500"></i> Synchronized with World Members
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 opacity-80">
                   <h4 className="text-[10px] font-black text-pink-500 uppercase border-b pb-1">Profile 1</h4>
                   <div className="w-full border rounded-md p-3 text-sm bg-gray-50 flex items-center gap-2">
                      <span className="text-lg">{partners?.partner1.avatar}</span>
                      <span className="font-bold text-gray-700">{partners?.partner1.name}</span>
                   </div>
                </div>
                <div className="space-y-3 opacity-80">
                   <h4 className="text-[10px] font-black text-blue-500 uppercase border-b pb-1">Profile 2</h4>
                   <div className="w-full border rounded-md p-3 text-sm bg-gray-50 flex items-center gap-2">
                      <span className="text-lg">{partners?.partner2.avatar}</span>
                      <span className="font-bold text-gray-700">{partners?.partner2.name}</span>
                   </div>
                </div>
               </div>
               <p className="text-[9px] text-gray-400 mt-4 leading-relaxed italic">
                 * Names and avatars are pulled directly from the Circle members. If you are alone, a placeholder is shown.
               </p>
             </div>
           </motion.div>
         );
};
