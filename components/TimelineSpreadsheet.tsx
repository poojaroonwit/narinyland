"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interaction, MediaContent } from '../types';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface TimelineSpreadsheetProps {
  isOpen: boolean;
  onClose: () => void;
  interactions: Interaction[];
  onSave: (updated: Interaction[]) => void;
  onDelete: (id: string) => void;
}

const MobileCard = ({ item, onUpdate, onFileChange, onRemove, onViewImage }: { 
  item: Interaction, 
  onUpdate: (id: string, field: keyof Interaction, value: any) => void,
  onFileChange: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void,
  onRemove: (id: string) => void,
  onViewImage: (url: string) => void
}) => (
  <div className="bg-white p-5 rounded-md shadow-sm border border-pink-100 flex flex-col gap-4 relative">
    <button 
      onClick={() => onRemove(item.id)}
      aria-label="Delete memory"
      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full"
    >
      <i className="fas fa-trash-alt text-xs"></i>
    </button>

    <div className="flex items-center gap-2">
       <div className="bg-pink-50 text-pink-500 w-10 h-10 rounded-full flex items-center justify-center font-black text-xl">
         {item.type === 'quest' ? '🛡️' : item.type === 'letter' ? '💌' : item.type === 'pet' ? '🐾' : '✨'}
       </div>
       <div className="flex-1">
          <DatePicker
            selected={item.timestamp}
            onChange={(date: Date | null) => date && onUpdate(item.id, 'timestamp', date)}
            showTimeSelect
            dateFormat="Pp"
            className="w-full bg-transparent border-none font-bold text-sm text-gray-800 outline-none p-0"
          />
          <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{item.type}</div>
       </div>
    </div>

    <textarea 
      value={item.text}
      onChange={(e) => onUpdate(item.id, 'text', e.target.value)}
      className="w-full bg-gray-50 border-none font-medium text-sm text-gray-700 resize-none py-3 px-4 rounded-md focus:bg-white focus:ring-2 ring-pink-100 min-h-[80px]"
      placeholder="Write your memory..."
    />

    <div className="flex items-center gap-2">
        <div className="flex-1 bg-blue-50/50 rounded-md px-3 py-2 flex items-center gap-2">
            <i className="fas fa-map-marker-alt text-blue-300 text-xs"></i>
            <input 
              type="text" 
              value={item.location || ''}
              onChange={(e) => onUpdate(item.id, 'location', e.target.value)}
              placeholder="Add location"
              className="w-full bg-transparent border-none text-xs font-bold text-blue-500 outline-none placeholder-blue-300"
            />
        </div>
    </div>

    {/* Media Scroll */}
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <label className="w-16 h-16 rounded-md border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 shrink-0" aria-label="Add memory images">
           <i className="fas fa-camera text-gray-300"></i>
           <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onFileChange(item.id, e)} />
        </label>
        {(item.mediaItems || (item.media ? [item.media] : [])).map((m, idx) => (
          <div key={idx} className="w-16 h-16 rounded-md overflow-hidden relative shrink-0 group cursor-pointer" onClick={() => onViewImage(m.url)}>
             <img src={m.url} alt={`Memory media ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
             <button 
                aria-label={`Remove memory media ${idx + 1}`}
                onClick={() => {
                   const next = (item.mediaItems || []).filter((_, i) => i !== idx);
                   onUpdate(item.id, 'mediaItems', next);
                }}
                className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px]"
             >
                <i className="fas fa-times"></i>
             </button>
          </div>
        ))}
    </div>
  </div>
);

const TimelineSpreadsheet: React.FC<TimelineSpreadsheetProps> = ({
  isOpen,
  onClose,
  interactions,
  onSave,
  onDelete
}) => {
  const [localItems, setLocalItems] = useState<Interaction[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // Sync local items when opened
  React.useEffect(() => {
    if (isOpen) {
      setLocalItems([...interactions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    }
  }, [isOpen, interactions]);

  const handleUpdate = (id: string, field: keyof Interaction, value: any) => {
    setLocalItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newMedia: MediaContent[] = Array.from(files).map(file => ({
        type: 'image',
        url: URL.createObjectURL(file)
      }));
      
      setLocalItems(prev => prev.map(item => {
        if (item.id === id) {
          const currentMedia = item.mediaItems || (item.media ? [item.media] : []);
          return { ...item, mediaItems: [...currentMedia, ...newMedia] };
        }
        return item;
      }));
    }
  };

  const handleApply = async () => {
    setIsSaving(true);
    await onSave(localItems);
    setIsSaving(false);
    onClose();
  };

  const handleAddRow = () => {
    const newItem: Interaction = {
      id: `temp-${Date.now()}`,
      text: '',
      timestamp: new Date(),
      type: 'system',
      location: ''
    };
    setLocalItems([newItem, ...localItems]);
  };

  const handleRemoveRow = (id: string) => {
    setLocalItems(prev => prev.filter(item => item.id !== id));
    if (!id.startsWith('temp-')) {
      onDelete(id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="spreadsheet-modal"
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[99999] bg-white flex flex-col pt-16 shadow-2xl"
        >
          {/* Header */}
          <div className="h-20 border-b flex items-center justify-between px-10 shrink-0 bg-white z-20">
            <div className="flex items-center gap-6">
              <button 
                onClick={onClose} 
                aria-label="Close spreadsheet"
                className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors text-gray-500"
              >
                 <i className="fas fa-arrow-left text-lg"></i>
              </button>
              <div>
                <h2 className="font-pacifico text-3xl text-pink-500">Milestone Spreadsheet</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                    {localItems.length} Milestones Recorded
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <button 
                 onClick={handleAddRow}
                 className="bg-white text-pink-500 px-8 py-3 rounded-md font-black uppercase text-[11px] tracking-widest hover:bg-pink-50 transition-all border-2 border-pink-100 shadow-sm"
               >
                 <i className="fas fa-plus mr-2"></i> Add Memory
               </button>
               <button 
                 onClick={handleApply}
                 disabled={isSaving}
                 className={`bg-gradient-to-r from-pink-500 to-rose-500 text-white px-10 py-3 rounded-md font-black uppercase text-[11px] tracking-widest shadow-xl shadow-pink-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
               >
                 {isSaving ? <><i className="fas fa-spinner animate-spin"></i> Saving...</> : 'Save Changes'}
               </button>
            </div>
          </div>
  
          {/* Spreadsheet Grid */}
          <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50/30">
             <div className="max-w-7xl mx-auto">
               
               {/* Mobile List View */}
               <div className="md:hidden space-y-4 pb-20">
                  {localItems.map((item) => (
                     <MobileCard 
                        key={item.id} 
                        item={item} 
                        onUpdate={handleUpdate}
                        onFileChange={handleFileChange}
                        onRemove={handleRemoveRow}
                        onViewImage={setViewingImage}
                     />
                  ))}
                  <button 
                     onClick={handleAddRow}
                     className="w-full py-4 rounded-md border-2 border-dashed border-pink-200 text-pink-400 font-black uppercase tracking-widest hover:bg-pink-50 transition-colors"
                  >
                     + Add New Memory
                  </button>
               </div>

               {/* Desktop Table View */}
               <div className="hidden md:block">
               <table className="w-full bg-white rounded-[3rem] overflow-hidden shadow-xl border-separate border-spacing-0 border border-gray-100">
                  <thead className="sticky top-0 bg-white z-30">
                    <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-6 border-b border-gray-50 pl-10">Date & Time</th>
                      <th className="p-6 border-b border-gray-50">Type</th>
                      <th className="p-6 border-b border-gray-50">Story Content</th>
                      <th className="p-6 border-b border-gray-50">Discovery Location</th>
                      <th className="p-6 border-b border-gray-50">Attached Media</th>
                      <th className="p-6 border-b border-gray-50 text-center pr-10">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {localItems.map((item) => (
                      <tr key={item.id} className="hover:bg-pink-50/20 transition-colors group">
                        <td className="p-4 w-56 pl-10">
                          <div className="bg-gray-50 rounded-md p-2 flex items-center gap-2 border border-transparent focus-within:border-pink-200 focus-within:bg-white transition-all">
                            <i className="fas fa-clock text-pink-300 text-xs ml-1"></i>
                            <DatePicker
                              selected={item.timestamp}
                              onChange={(date: Date | null) => date && handleUpdate(item.id, 'timestamp', date)}
                              showTimeSelect
                              dateFormat="Pp"
                              className="w-full bg-transparent border-none font-bold text-xs text-gray-600 outline-none"
                            />
                          </div>
                        </td>
                        <td className="p-4 w-32">
                          <select 
                            value={item.type}
                            onChange={(e) => handleUpdate(item.id, 'type', e.target.value)}
                            className="w-full bg-pink-50/50 border-none font-black text-[10px] uppercase tracking-wider text-pink-500 cursor-pointer p-3 rounded-md focus:ring-2 ring-pink-100"
                          >
                            <option value="pet">Pet</option>
                            <option value="system">System</option>
                            <option value="letter">Letter</option>
                            <option value="quest">Quest</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <textarea 
                            value={item.text}
                            onChange={(e) => handleUpdate(item.id, 'text', e.target.value)}
                            className="w-full bg-transparent border-none font-bold text-sm text-gray-700 resize-none py-3 px-4 focus:bg-white focus:ring-2 ring-pink-50 rounded-md leading-relaxed min-h-[45px]"
                            rows={1}
                            placeholder="Tell the story..."
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = target.scrollHeight + 'px';
                            }}
                          />
                        </td>
                        <td className="p-4 w-48">
                          <div className="bg-blue-50/30 rounded-md p-2 flex items-center gap-2 border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-all">
                            <i className="fas fa-map-marker-alt text-blue-300 text-xs ml-1"></i>
                            <input 
                              type="text" 
                              value={item.location || ''}
                              placeholder="Where?"
                              onChange={(e) => handleUpdate(item.id, 'location', e.target.value)}
                              className="w-full bg-transparent border-none font-bold text-xs text-blue-500 outline-none"
                            />
                          </div>
                        </td>
                        <td className="p-4 w-56">
                          <div className="flex items-center gap-3 overflow-x-auto max-w-[220px] scrollbar-hide py-1">
                            {(item.mediaItems || (item.media ? [item.media] : [])).map((m, idx) => (
                              <div key={idx} className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 border-2 border-white shadow-sm shrink-0 relative group/img cursor-pointer" onClick={() => setViewingImage(m.url)}>
                                {m.type === 'image' && <img src={m.url} alt={`Memory media ${idx + 1}`} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform" />}
                                {m.type === 'video' && <div className="w-full h-full flex items-center justify-center text-xs">🎥</div>}
                                <button 
                                  aria-label={`Remove memory media ${idx + 1}`}
                                  className="absolute inset-0 bg-red-500/80 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next = (item.mediaItems || []).filter((_, i) => i !== idx);
                                    handleUpdate(item.id, 'mediaItems', next);
                                  }}
                                >
                                   <i className="fas fa-times text-xs"></i>
                                </button>
                              </div>
                            ))}
                            <label className="w-12 h-12 rounded-md border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-pink-300 transition-all shrink-0 hover:shadow-md" aria-label="Add memory images">
                               <i className="fas fa-plus text-[10px] text-gray-300"></i>
                               <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileChange(item.id, e)} />
                            </label>
                          </div>
                        </td>
                        <td className="p-4 w-20 text-center pr-10">
                          <button 
                            onClick={() => handleRemoveRow(item.id)}
                            aria-label="Delete memory"
                            className="w-10 h-10 flex items-center justify-center rounded-md bg-gray-50 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                          >
                            <i className="fas fa-trash-alt text-sm"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
               </div>
             </div>
          </div>
        </motion.div>
      )}
      {/* Image Viewer Overlay */}
      {viewingImage && (
        <motion.div
          key="image-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-xl flex items-center justify-center"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            aria-label="Close image viewer"
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            src={viewingImage}
            alt="Selected memory"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimelineSpreadsheet;

