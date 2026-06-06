
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoveLetterMessage, MediaContent } from '../types';
import DatePicker from 'react-datepicker';
import OptimizedImage from './OptimizedImage';
import { ReadAnimation } from './love-letter/ReadAnimation';
import "react-datepicker/dist/react-datepicker.css";

interface Partners {
  partner1: { name: string; avatar: string };
  partner2: { name: string; avatar: string };
}

interface LoveLetterProps {
  isOpen: boolean;
  onClose: () => void;
  messages: LoveLetterMessage[];
  onSendMessage: (msg: LoveLetterMessage) => void;
  onUpdateMessage?: (msg: LoveLetterMessage) => void;
  partners: Partners;
  isInline?: boolean;
  folders?: string[];
}

const LoveLetter: React.FC<LoveLetterProps> = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSendMessage, 
  onUpdateMessage,
  partners, 
  isInline = false,
  folders = ['Inbox', 'Sent', 'Archive', 'Trash']
}) => {
  const [view, setView] = useState<'list' | 'compose' | 'read'>('list');
  const [currentFolder, setCurrentFolder] = useState('Inbox');
  const [selectedMessage, setSelectedMessage] = useState<LoveLetterMessage | null>(null);
  
  // Compose State
  const [composeFrom, setComposeFrom] = useState<'partner1' | 'partner2'>('partner2');
  const [composeContent, setComposeContent] = useState('');
  const [composeDate, setComposeDate] = useState(new Date().toISOString().slice(0, 16));
  const [composeMedia, setComposeMedia] = useState<MediaContent | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setView('list');
        setSelectedMessage(null);
      });
    }
  }, [isOpen]);

  const handleOpenMessage = (msg: LoveLetterMessage) => {
    const now = new Date();
    const unlockTime = new Date(msg.unlockDate);
    
    if (unlockTime > now) {
      alert(`This letter is locked until ${unlockTime.toLocaleString()}! 🔒`);
      return;
    }

    if (!msg.isRead && onUpdateMessage) {
      onUpdateMessage({ ...msg, isRead: true, readAt: new Date() });
    }

    setSelectedMessage(msg);
    setView('read');
  };
  void handleOpenMessage;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setComposeMedia({ type, url });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const url = URL.createObjectURL(blob);
        setComposeMedia({ type: 'audio', url });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is required to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    if (!composeContent.trim() && !composeMedia) return;

    const newMessage: LoveLetterMessage = {
      id: Date.now().toString(),
      fromId: composeFrom,
      content: composeContent,
      timestamp: new Date(),
      unlockDate: new Date(composeDate),
      isRead: false,
      media: composeMedia
    };

    onSendMessage(newMessage);
    setView('list');
    setComposeContent('');
    setComposeMedia(undefined);
    setComposeDate(new Date().toISOString().slice(0, 16));
  };

  const getPartnerName = (id: string) => id === 'partner1' ? partners.partner1.name : partners.partner2.name;
  const getPartnerAvatar = (id: string) => id === 'partner1' ? partners.partner1.avatar : partners.partner2.avatar;

  if (!isOpen && !isInline) return null;

  const MainContent = (
    <motion.div
      initial={isInline ? { opacity: 0, y: 20 } : { x: "100%", y: "100%" }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={isInline ? { opacity: 0, y: 20 } : { x: "100%", y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`${isInline ? 'w-full h-full max-w-4xl mx-auto rounded-md shadow-xl' : 'bg-white w-full md:w-[450px] h-[100dvh] md:h-full rounded-t-md md:rounded-l-md md:rounded-tr-none shadow-2xl'} overflow-hidden flex flex-col relative bg-white`}
      onClick={e => e.stopPropagation()}
    >
            {/* Header */}
            <div className="bg-pink-500 p-6 flex justify-between items-center text-white z-20 shadow-md">
              <div className="flex items-center gap-3">
                 {!isInline && (
                   <button 
                     onClick={() => {
                       if (view !== 'list') setView('list');
                       else onClose();
                     }} 
                     className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                   >
                     <i className={`fas ${view === 'list' ? 'fa-times' : 'fa-arrow-left'}`}></i>
                   </button>
                 )}
                 {isInline && view !== 'list' && (
                   <button 
                     onClick={() => setView('list')} 
                     className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                   >
                     <i className="fas fa-arrow-left"></i>
                   </button>
                 )}
                 <h2 className="font-pacifico text-2xl">
                   {view === 'list' ? 'Love Mail' : view === 'compose' ? 'Write Love' : 'Reading...'}
                 </h2>
              </div>
            </div>

            {/* --- LIST VIEW --- */}
            {view === 'list' && (
              <div className="flex flex-col md:flex-row h-full">
                 {/* Folders Sidebar */}
                 <div className="w-full md:w-32 bg-gray-50 border-r border-gray-100 p-2 md:p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0 items-center md:items-stretch h-14 md:h-full no-scrollbar">
                    {folders.map(f => (
                       <button 
                         key={f}
                         onClick={() => setCurrentFolder(f)}
                         className={`px-3 py-2 rounded-md text-xs font-bold capitalize transition-all whitespace-nowrap flex items-center gap-2 ${currentFolder === f ? 'bg-pink-100 text-pink-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                       >
                         <i className={`fas fa-${f === 'Inbox' ? 'inbox' : f === 'Sent' ? 'paper-plane' : f === 'Archive' ? 'archive' : f === 'Trash' ? 'trash' : 'folder'}`}></i>
                         {f}
                       </button>
                    ))}
                    {/* Folder Count */}
                    <div className="hidden md:block mt-auto pt-4 border-t border-gray-100">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                          {messages.filter(m => (m.folder || 'Inbox') === currentFolder).length} items
                       </p>
                    </div>
                 </div>

                 {/* Messages List */}
                 <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-3 relative">
                   {messages.filter(m => (m.folder || 'Inbox') === currentFolder).length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-gray-400">
                       <div className="text-6xl mb-4 text-gray-200"><i className={`fas fa-${currentFolder === 'Inbox' ? 'inbox' : 'folder-open'}`}></i></div>
                       <p className="font-bold text-sm">No letters in {currentFolder}</p>
                       <p className="text-[10px] uppercase tracking-widest mt-1">Check back later or write one!</p>
                     </div>
                   ) : (
                     [...messages]
                       .filter(m => (m.folder || 'Inbox') === currentFolder)
                       .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                       .map(msg => {
                       const isLocked = new Date(msg.unlockDate) > new Date();
                       const isUnread = !msg.isRead && !isLocked && msg.folder !== 'Sent'; // Sent messages are always "read" implicitly?
                       return (
                         <motion.div
                           key={msg.id}
                           layout
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           onClick={() => {
                              if (isLocked) {
                                 alert(`This letter is locked until ${new Date(msg.unlockDate).toLocaleString()}! 🔒`);
                                 return;
                              }
                              if (!msg.isRead && onUpdateMessage) {
                                 onUpdateMessage({ ...msg, isRead: true, readAt: new Date() });
                              }
                              setSelectedMessage(msg);
                              setView('read');
                           }}
                           className={`bg-white p-4 rounded-md shadow-sm border ${isUnread ? 'border-pink-300 shadow-md bg-pink-50/30' : 'border-gray-100'} flex items-center gap-4 cursor-pointer transition-all hover:shadow-md hover:border-pink-200 group relative`}
                         >
                            {isUnread && <div className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-sm"></div>}
                            
                            <div className="relative shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner transition-colors ${isUnread ? 'bg-pink-100 text-pink-500' : 'bg-gray-100 text-gray-400'}`}>
                                {getPartnerAvatar(msg.fromId)}
                              </div>
                              {/* Media Indicator */}
                              {!isLocked && msg.media && (
                                 <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-100 text-[10px]">
                                    <i className={`fas ${msg.media.type === 'image' ? 'fa-image text-blue-400' : msg.media.type === 'video' ? 'fa-video text-purple-400' : 'fa-microphone text-orange-400'}`}></i>
                                 </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-0.5">
                                 <h4 className={`text-xs font-bold truncate ${isUnread ? 'text-pink-600' : 'text-gray-700'}`}>
                                    {getPartnerName(msg.fromId)} 
                                    <span className="font-normal text-gray-400 ml-1/2">• {new Date(msg.timestamp).toLocaleDateString()}</span>
                                 </h4>
                                 {msg.readAt && <i className="fas fa-check-double text-[8px] text-blue-400 ml-1" title={`Read: ${new Date(msg.readAt).toLocaleString()}`}></i>}
                              </div>
                              <p className={`text-[11px] truncate ${isUnread ? 'font-bold text-gray-800' : 'text-gray-500 italic'}`}>
                                {isLocked ? `Locked until ${new Date(msg.unlockDate).toLocaleDateString()}` : (msg.content || 'Attached a memory...')}
                              </p>
                            </div>
                            
                            <div className="text-xl filter drop-shadow-sm opacity-50 group-hover:opacity-100 transition-opacity">
                              {isLocked ? '🔒' : '💌'}
                            </div>
                         </motion.div>
                       );
                     })
                   )}
                   
                   <motion.button
                     whileHover={{ scale: 1.1, rotate: 5 }}
                     whileTap={{ scale: 0.9 }}
                     onClick={() => setView('compose')}
                     className="absolute bottom-6 right-6 w-14 h-14 bg-pink-500 text-white rounded-full shadow-xl flex items-center justify-center text-2xl z-30 hover:bg-pink-600 transition-colors"
                   >
                     <i className="fas fa-pen-fancy"></i>
                   </motion.button>
                 </div>
              </div>
            )}

            {/* --- COMPOSE VIEW --- */}
            {view === 'compose' && (
              <div className="flex-1 p-6 bg-gray-50 flex flex-col gap-5 overflow-y-auto">
                 
                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Sender</label>
                   <div className="flex bg-white rounded-md p-1.5 shadow-sm border border-gray-200">
                      <button 
                        onClick={() => setComposeFrom('partner1')}
                        className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all ${composeFrom === 'partner1' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500'}`}
                      >
                         {partners.partner1.avatar} {partners.partner1.name}
                      </button>
                      <button 
                        onClick={() => setComposeFrom('partner2')}
                        className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all ${composeFrom === 'partner2' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500'}`}
                      >
                         {partners.partner2.avatar} {partners.partner2.name}
                      </button>
                   </div>
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Unlock Date</label>
                   <DatePicker
                     selected={new Date(composeDate)}
                     onChange={(date: Date | null) => date && setComposeDate(date.toISOString().slice(0, 16))}
                     showTimeSelect
                     dateFormat="Pp"
                     className="w-full bg-white border border-gray-200 rounded-md p-3.5 text-sm focus:ring-2 focus:ring-pink-300 outline-none shadow-sm"
                   />
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Add Memory</label>
                   {!composeMedia ? (
                     <div className="flex gap-3">
                        <label className="flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed border-gray-200 rounded-md cursor-pointer hover:bg-pink-50 hover:border-pink-300 transition-all bg-white group">
                          <i className="fas fa-image text-pink-400 text-2xl mb-1.5 group-hover:scale-110 transition-transform"></i>
                          <span className="text-[10px] font-black text-gray-400 uppercase">Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                        </label>

                        <label className="flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed border-gray-200 rounded-md cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all bg-white group">
                          <i className="fas fa-video text-blue-400 text-2xl mb-1.5 group-hover:scale-110 transition-transform"></i>
                          <span className="text-[10px] font-black text-gray-400 uppercase">Video</span>
                          <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                        </label>

                        <button 
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed rounded-md transition-all bg-white group ${
                            isRecording 
                              ? 'bg-red-50 border-red-400 animate-pulse' 
                              : 'border-gray-200 hover:bg-orange-50 hover:border-orange-300'
                          }`}
                        >
                          <i className={`fas ${isRecording ? 'fa-stop text-red-500' : 'fa-microphone text-orange-400'} text-2xl mb-1.5 group-hover:scale-110 transition-transform`}></i>
                          <span className="text-[10px] font-black text-gray-400 uppercase">{isRecording ? 'Stop' : 'Voice'}</span>
                        </button>
                     </div>
                   ) : (
                      <div className="relative bg-white border border-gray-200 rounded-md p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center shadow-inner overflow-hidden border border-gray-100">
                            {composeMedia.type === 'image' && <OptimizedImage src={composeMedia.url} className="w-full h-full object-cover" alt="Compose media" />}
                            {composeMedia.type === 'video' && <div className="text-2xl">🎥</div>}
                            {composeMedia.type === 'audio' && <div className="text-2xl">🎤</div>}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-gray-700 capitalize">{composeMedia.type} Attached</span>
                            <p className="text-[10px] text-gray-400">Ready to send!</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (composeMedia.url.startsWith('blob:')) URL.revokeObjectURL(composeMedia.url);
                            setComposeMedia(undefined);
                          }} 
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                   )}
                 </div>

                 <div className="flex-1 min-h-[140px]">
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Your Message</label>
                   <textarea 
                     value={composeContent}
                     onChange={(e) => setComposeContent(e.target.value)}
                     className="w-full h-full bg-white border border-gray-200 rounded-md p-4 text-sm focus:ring-2 focus:ring-pink-300 outline-none resize-none font-quicksand shadow-sm"
                     placeholder="Pour your heart out here..."
                   />
                 </div>

                 <button 
                   onClick={handleSend}
                   disabled={!composeContent.trim() && !composeMedia}
                   className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-md shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-sm"
                 >
                   Seal & Send 📮
                 </button>
              </div>
            )}

            {/* --- READ VIEW --- */}
            {view === 'read' && selectedMessage && (
               <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md">
                 <ReadAnimation message={selectedMessage} onClose={() => setView('list')} />
               </div>
            )}

    </motion.div>
  );

  if (isInline) return MainContent;

  return (
    <AnimatePresence>
      {(isOpen || isInline) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-pink-900/10 md:bg-black/40 backdrop-blur-md flex justify-end items-end md:items-stretch"
          onClick={onClose}
        >
          {MainContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default LoveLetter;
