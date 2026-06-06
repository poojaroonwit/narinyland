"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interaction } from '../../types';
import LocationPicker from '../LocationPicker';
import OptimizedImage from '../OptimizedImage';

type TimelineEditorModalProps = {
  activeItem: Interaction | null;
  isNew: boolean;
  isFutureDate: boolean;
  windowWidth: number;
  setActiveItem: React.Dispatch<React.SetStateAction<Interaction | null>>;
  onDeleteInteraction?: (id: string) => void;
  onSave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: (index?: number) => void;
  onImageClick: (imageUrl: string) => void;
};

export const TimelineEditorModal: React.FC<TimelineEditorModalProps> = ({
  activeItem,
  isNew,
  isFutureDate,
  windowWidth,
  setActiveItem,
  onDeleteInteraction,
  onSave,
  onFileChange,
  onRemoveMedia,
  onImageClick,
}) => {
  return (
          <AnimatePresence>
            {activeItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 z-[100] flex ${windowWidth < 768 ? 'items-end' : 'items-center justify-center'} p-0 md:p-4 bg-black/40 backdrop-blur-md`}
                onClick={() => setActiveItem(null)}
              >
                <motion.div
                  initial={windowWidth < 768 ? { y: "100%" } : { scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={windowWidth < 768 ? { y: "100%" } : { scale: 0.9, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className={`bg-white w-full ${windowWidth < 768 ? 'rounded-t-md h-[85vh]' : 'max-w-md rounded-md max-h-[90vh]'} shadow-2xl overflow-hidden flex flex-col`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`p-6 text-white flex justify-between items-center shrink-0 transition-colors ${
                    isFutureDate ? 'bg-purple-500' : 'bg-pink-500'
                  } ${windowWidth < 768 ? 'rounded-t-md' : ''}`}>
                    <h3 className="font-pacifico text-2xl">
                      {isNew 
                        ? (isFutureDate ? 'New Plan' : 'New Memory') 
                        : (isFutureDate ? 'Edit Plan' : 'Edit Memory')
                      }
                    </h3>
                    <button onClick={() => setActiveItem(null)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20">
                      <i className="fas fa-times text-xl"></i>
                    </button>
                  </div>
    
                  <div className="p-8 space-y-6 overflow-y-auto">
                     <div className="bg-gray-50/50 rounded-md p-6 border-2 border-gray-100 flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-md flex items-center justify-center text-2xl shadow-sm ${isFutureDate ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
                           <i className="fas fa-calendar-alt"></i>
                        </div>
                        <div className="flex-1">
                           <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest pl-1">
                             {isFutureDate ? 'Event Schedule' : 'Milestone Date & Time'}
                           </label>
                           <div className="flex items-center gap-2">
                             <input
                               type="datetime-local"
                               value={activeItem.timestamp ? new Date(activeItem.timestamp.getTime() - (activeItem.timestamp.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                               onChange={(e) => {
                                  const d = new Date(e.target.value);
                                  if (!isNaN(d.getTime())) setActiveItem({ ...activeItem!, timestamp: d });
                               }}
                               className="bg-transparent border-none font-bold text-gray-700 outline-none p-0 cursor-pointer text-base md:text-lg focus:ring-0 flex-1 w-full"
                             />
                              <button 
                                onClick={() => setActiveItem({ ...activeItem!, timestamp: new Date() })}
                               className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition-all ${isFutureDate ? 'text-purple-500 border-purple-200 hover:bg-purple-50' : 'text-pink-500 border-pink-200 hover:bg-pink-50'}`}
                              >
                               Now
                              </button>
                           </div>
                           <p className="text-[10px] text-gray-400 font-bold mt-1 pl-1">Choose the exact moment of this memory </p>
                        </div>
                     </div>
    
                    <div>
                      <LocationPicker 
                        location={activeItem.location || ""}
                        latitude={activeItem.latitude}
                        longitude={activeItem.longitude}
                        onChange={(location, latitude, longitude) => setActiveItem({ ...activeItem!, location, latitude, longitude })}
                        isFutureDate={!!isFutureDate}
                      />
                    </div>
    
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                         {isFutureDate ? 'Inspiration Attachment' : 'Memory Attachment'}
                       </label>
                       
    
                       {/* Media List + Add Button */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide py-2">
                            {activeItem.mediaItems?.map((m, idx) => (
                               <div key={idx} className="relative group shrink-0">
                                  <div 
                                    data-image-container
                                    className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden border-2 border-gray-50 shadow-sm relative cursor-pointer hover:border-pink-300 transition-colors"
                                    onClick={() => m.type === 'image' && onImageClick(m.url)}
                                  >
                                     {m.type === 'image' && <OptimizedImage src={m.url} className="w-full h-full object-cover" alt="Timeline media" />}
                                     {m.type === 'video' && <div className="w-full h-full flex flex-col items-center justify-center text-xs gap-1 text-gray-500"><i className="fas fa-video text-lg"></i> Video</div>}
                                     {m.type === 'audio' && <div className="w-full h-full flex flex-col items-center justify-center text-xs gap-1 text-gray-500"><i className="fas fa-microphone text-lg"></i> Audio</div>}
                                  </div>
                                  <button 
                                    onClick={() => onRemoveMedia(idx)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-md hover:scale-110 transition-transform z-10"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                               </div>
                            ))}
                            
                            {/* Add Button */}
                            <label
                               className={`w-20 h-20 shrink-0 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                                  isFutureDate 
                                     ? 'border-purple-200 bg-purple-50 text-purple-400 hover:bg-purple-100' 
                                     : 'border-pink-200 bg-pink-50 text-pink-400 hover:bg-pink-100'
                               }`}
                            >
                               <i className="fas fa-plus text-xl"></i>
                               <span className="text-[9px] font-black uppercase">Add</span>
                               <input
                                  type="file"
                                  multiple
                                  accept="image/*,video/*,audio/*"
                                  className="hidden"
                                  onChange={onFileChange}
                               />
                            </label>
                        </div>
                    </div>
    
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                          {isFutureDate ? 'The Plan' : 'The Story'}
                       </label>
                          <textarea 
                            value={activeItem.text || ""} 
                            onChange={(e) => setActiveItem({ ...activeItem!, text: e.target.value })}
                         className={`w-full h-32 border-2 rounded-md p-4 text-sm font-bold text-gray-700 outline-none resize-none transition-all bg-gray-50/50 ${
                            isFutureDate ? 'border-purple-50 focus:ring-purple-300' : 'border-pink-50 focus:ring-pink-300'
                         }`}
                         placeholder={isFutureDate ? "What are we planning to do?" : "What happened on this magical day?"}
                         autoFocus
                       />
                    </div>
    
                    <div className="flex gap-4 pt-4">
                       {!isNew && (
                         <button 
                           onClick={() => {
                              onDeleteInteraction?.(activeItem.id);
                              setActiveItem(null);
                           }}
                           className="flex-1 py-4 bg-red-50 text-red-500 font-black rounded-md text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors"
                         >
                           Delete
                         </button>
                       )}
                       <button 
                         onClick={onSave}
                         disabled={!activeItem.text.trim()}
                         className={`flex-[2] py-4 text-white font-black rounded-md text-[10px] uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 disabled:grayscale ${
                            isFutureDate ? 'bg-purple-500 shadow-purple-200 hover:bg-purple-600' : 'bg-pink-500 shadow-pink-200 hover:bg-pink-600'
                         }`}
                       >
                         {isNew 
                            ? (isFutureDate ? 'Add Plan' : 'Create Milestone') 
                            : (isFutureDate ? 'Update Plan' : 'Update Memory')
                         }
                       </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
  );
};
