// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import { Interaction } from '../../../types';
import { SHOP_ITEMS } from '../../Shop';
import { useEditDrawerContext } from '../context';

export const ProposalTab: React.FC = () => {
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
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   <i className="fas fa-heart text-red-400"></i> Proposal Flow
                 </h3>
                 <button 
                   onClick={addProposalQuestion}
                   className="bg-red-50 text-red-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                 >
                   + Add Step
                 </button>
               </div>
               
               <div className="space-y-4">
                 {localConfig.proposal.questions.map((q, idx) => (
                   <div key={idx} className="relative group">
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">
                       Step {idx + 1}
                     </label>
                     <div className="flex gap-2">
                       <input 
                         type="text"
                         value={q}
                         onChange={(e) => updateProposalQuestion(idx, e.target.value)}
                         className={`flex-1 bg-gray-50 border-2 rounded-md p-3 text-xs font-bold outline-none transition-all ${localConfig.proposal.progress === idx ? 'border-red-200 bg-red-50/30' : 'border-gray-100 focus:border-red-100'}`}
                         placeholder="Question text..."
                       />
                       <button 
                         onClick={() => setProposalProgress(idx)}
                         className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${localConfig.proposal.progress === idx ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-red-400 hover:bg-red-50'}`}
                         title="Set as current active step"
                       >
                         <i className="fas fa-flag-checkered text-xs"></i>
                       </button>
                       <button 
                         onClick={() => removeProposalQuestion(idx)}
                         className="w-10 h-10 bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                       >
                          <i className="fas fa-trash-alt text-xs"></i>
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
 
               <div className="mt-6 p-4 bg-red-50 rounded-md border border-red-100">
                 <h4 className="text-[10px] font-black text-red-500 uppercase flex items-center gap-2 mb-2">
                   <i className="fas fa-info-circle"></i> Final Confirmation
                 </h4>
                 <div className="space-y-3">
                   <div>
                     <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 ml-1">Wording (e.g. Will you marry me?)</label>
                     <input 
                       type="text"
                       value={localConfig.proposal.finalWording}
                       onChange={(e) => handleInputChange('proposal', { ...localConfig.proposal, finalWording: e.target.value })}
                       className="w-full bg-white border border-red-100 rounded-md p-2 text-xs font-bold outline-none"
                     />
                   </div>
                   <div className="flex items-center gap-3 pt-1">
                     <label className="text-[8px] font-black text-gray-400 uppercase">Is Accepted?</label>
                     <button 
                       onClick={() => handleInputChange('proposal', { ...localConfig.proposal, isAccepted: !localConfig.proposal.isAccepted })}
                       className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${localConfig.proposal.isAccepted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                     >
                       {localConfig.proposal.isAccepted ? 'Yes! 🎉' : 'No'}
                     </button>
                   </div>
                 </div>
               </div>
               <p className="text-[9px] text-gray-400 mt-4 leading-relaxed italic">
                 The user can only accept your proposal. Each &quot;Yes&quot; leads to the next question until the final acceptance!
               </p>
             </div>
           </motion.div>
         );
};
