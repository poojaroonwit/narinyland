
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoveLetterMessage, MediaContent } from '../types';
import DatePicker from 'react-datepicker';
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
  partners: Partners;
}

const LoveLetter: React.FC<LoveLetterProps> = ({ isOpen, onClose, messages, onSendMessage, partners }) => {
  const [view, setView] = useState<'list' | 'compose' | 'read'>('list');
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
      setView('list');
      setSelectedMessage(null);
    }
  }, [isOpen]);

  const handleOpenMessage = (msg: LoveLetterMessage) => {
    const now = new Date();
    const unlockTime = new Date(msg.unlockDate);
    
    if (unlockTime > now) {
      alert(`This letter is locked until ${unlockTime.toLocaleString()}! 🔒`);
      return;
    }

    setSelectedMessage(msg);
    setView('read');
  };

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          {/* Main Card */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-md h-[650px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative"
          >
            {/* Header */}
            <div className="bg-pink-500 p-6 flex justify-between items-center text-white z-20 shadow-md">
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => {
                     if (view !== 'list') setView('list');
                     else onClose();
                   }} 
                   className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                 >
                   <i className={`fas ${view === 'list' ? 'fa-times' : 'fa-arrow-left'}`}></i>
                 </button>
                 <h2 className="font-pacifico text-2xl">
                   {view === 'list' ? 'Love Mail' : view === 'compose' ? 'Write Love' : 'Reading...'}
                 </h2>
              </div>
            </div>

            {/* --- LIST VIEW --- */}
            {view === 'list' && (
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="font-bold">The mailbox is empty...</p>
                    <p className="text-xs">Why not write a surprise note?</p>
                  </div>
                ) : (
                  [...messages].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(msg => {
                    const isLocked = new Date(msg.unlockDate) > new Date();
                    return (
                      <motion.div
                        key={msg.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => handleOpenMessage(msg)}
                        className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer transition-all ${isLocked ? 'opacity-75' : 'hover:shadow-md hover:border-pink-100'}`}
                      >
                         <div className="relative shrink-0">
                           <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center text-3xl shadow-inner">
                             {getPartnerAvatar(msg.fromId)}
                           </div>
                           {/* Small Media Thumbnail if unlocked and image exists */}
                           {!isLocked && msg.media?.type === 'image' && (
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white overflow-hidden shadow-sm">
                                <img src={msg.media.url} className="w-full h-full object-cover" />
                              </div>
                           )}
                         </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="font-bold text-gray-800 text-sm truncate">From {getPartnerName(msg.fromId)}</h4>
                           <div className="flex items-center gap-1.5 text-xs text-gray-500">
                             {msg.media && <i className={`fas ${msg.media.type === 'image' ? 'fa-image' : msg.media.type === 'video' ? 'fa-video' : 'fa-microphone'} text-pink-400`}></i>}
                             <span className="truncate italic">
                               {isLocked ? `Locked until ${new Date(msg.unlockDate).toLocaleDateString()}` : (msg.content || 'Attached a memory...')}
                             </span>
                           </div>
                         </div>
                         <div className="text-2xl filter drop-shadow-sm">
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
                  className="absolute bottom-8 right-8 w-16 h-16 bg-pink-500 text-white rounded-full shadow-xl flex items-center justify-center text-3xl z-30"
                >
                  <i className="fas fa-pen-fancy"></i>
                </motion.button>
              </div>
            )}

            {/* --- COMPOSE VIEW --- */}
            {view === 'compose' && (
              <div className="flex-1 p-6 bg-gray-50 flex flex-col gap-5 overflow-y-auto">
                 
                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Sender</label>
                   <div className="flex bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                      <button 
                        onClick={() => setComposeFrom('partner1')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${composeFrom === 'partner1' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500'}`}
                      >
                         {partners.partner1.avatar} {partners.partner1.name}
                      </button>
                      <button 
                        onClick={() => setComposeFrom('partner2')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${composeFrom === 'partner2' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500'}`}
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
                     className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-pink-300 outline-none shadow-sm"
                   />
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Add Memory</label>
                   {!composeMedia ? (
                     <div className="flex gap-3">
                        <label className="flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-pink-50 hover:border-pink-300 transition-all bg-white group">
                          <i className="fas fa-image text-pink-400 text-2xl mb-1.5 group-hover:scale-110 transition-transform"></i>
                          <span className="text-[10px] font-black text-gray-400 uppercase">Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                        </label>

                        <label className="flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all bg-white group">
                          <i className="fas fa-video text-blue-400 text-2xl mb-1.5 group-hover:scale-110 transition-transform"></i>
                          <span className="text-[10px] font-black text-gray-400 uppercase">Video</span>
                          <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                        </label>

                        <button 
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed rounded-2xl transition-all bg-white group ${
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
                      <div className="relative bg-white border border-gray-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-gray-100">
                            {composeMedia.type === 'image' && <img src={composeMedia.url} className="w-full h-full object-cover" />}
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
                     className="w-full h-full bg-white border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-pink-300 outline-none resize-none font-quicksand shadow-sm"
                     placeholder="Pour your heart out here..."
                   />
                 </div>

                 <button 
                   onClick={handleSend}
                   disabled={!composeContent.trim() && !composeMedia}
                   className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-sm"
                 >
                   Seal & Send 📮
                 </button>
              </div>
            )}

            {/* --- READ VIEW --- */}
            {view === 'read' && selectedMessage && (
               <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#fdf2f8]">
                 <ReadAnimation message={selectedMessage} onClose={() => setView('list')} />
               </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ReadAnimation: React.FC<{ message: LoveLetterMessage; onClose: () => void }> = ({ message, onClose }) => {
  const [stage, setStage] = useState<'closed' | 'opening' | 'reading'>('closed');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('opening'), 400);
    const t2 = setTimeout(() => setStage('reading'), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* ENVELOPE CONTAINER */}
        <motion.div
            initial={{ scale: 0.5, y: 150, opacity: 0 }}
            animate={{ 
              scale: stage === 'reading' ? 1.05 : 1, 
              y: stage === 'reading' ? 140 : 0, 
              opacity: 1 
            }}
            transition={{ type: "spring", duration: 1, bounce: 0.3 }}
            className="relative w-80 h-56 bg-pink-500 rounded-b-3xl shadow-2xl z-10 flex justify-center"
        >
            {/* Envelope Body (Front) */}
            <div className="absolute inset-0 rounded-b-3xl z-20 pointer-events-none" 
                style={{
                    background: 'linear-gradient(135deg, #ec4899, #db2777)',
                    clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)' 
                }} 
            />
            
            {/* Envelope Back */}
            <div className="absolute inset-0 bg-pink-600/50 rounded-b-3xl -z-10 shadow-inner"></div>

            {/* THE LETTER */}
            <motion.div
                initial={{ y: 0, zIndex: 0 }}
                animate={{ 
                    y: stage === 'closed' ? 0 : -160,
                    zIndex: stage === 'reading' ? 50 : 0,
                    scale: stage === 'reading' ? 1.4 : 1,
                    rotate: stage === 'reading' ? 0 : (Math.random() - 0.5) * 5
                }}
                transition={{ duration: 1, delay: 0.2, type: "spring", bounce: 0.4 }}
                className="absolute top-2 w-[92%] h-[92%] bg-[#fffbf0] shadow-xl rounded-sm p-5 flex flex-col items-center cursor-default border border-[#e8dfc8]"
                onClick={(e) => e.stopPropagation()} 
            >
                <AnimatePresence>
                  {stage === 'reading' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full h-full flex flex-col text-gray-800"
                    >
                        <div className="text-right text-[7px] font-black text-gray-400 mb-3 tracking-widest uppercase">
                          {new Date(message.timestamp).toLocaleDateString(undefined, { dateStyle: 'long' })}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
                          {/* Render Image Attachment */}
                          {message.media && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                              className="mb-4 rounded-lg overflow-hidden border-2 border-white shadow-md bg-gray-100"
                            >
                              {message.media.type === 'image' && (
                                <img src={message.media.url} className="w-full h-auto object-cover max-h-48" alt="Memory" />
                              )}
                              {message.media.type === 'video' && (
                                <video src={message.media.url} controls className="w-full h-auto" />
                              )}
                              {message.media.type === 'audio' && (
                                 <div className="p-3 bg-pink-50 flex items-center justify-center">
                                   <audio src={message.media.url} controls className="w-full h-8" />
                                 </div>
                              )}
                            </motion.div>
                          )}

                          <div className="font-quicksand text-[10px] leading-relaxed font-bold whitespace-pre-wrap text-gray-700 italic px-1">
                              "{message.content}"
                          </div>
                        </div>

                        <div className="text-right font-pacifico text-pink-500 text-lg mt-3 shrink-0 drop-shadow-sm">
                          {message.fromId === 'partner1' ? 'With love, Her' : 'With love, Him'} ❤️
                        </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Visual lines for folded state */}
                {stage !== 'reading' && (
                  <div className="absolute inset-0 flex flex-col justify-center gap-4 p-8 opacity-20">
                      <div className="w-full h-1 bg-gray-400 rounded"></div>
                      <div className="w-full h-1 bg-gray-400 rounded"></div>
                      <div className="w-2/3 h-1 bg-gray-400 rounded"></div>
                  </div>
                )}
            </motion.div>

            {/* Envelope Flap */}
            <motion.div
                initial={{ rotateX: 0 }}
                animate={{ rotateX: stage === 'closed' ? 0 : 180 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                style={{ 
                    transformOrigin: "top",
                    clipPath: 'polygon(0 0, 50% 60%, 100% 0)' 
                }}
                className="absolute top-0 w-full h-full bg-pink-600 z-30 shadow-lg"
            />
        </motion.div>

        {/* Action Buttons */}
        <AnimatePresence>
          {stage === 'reading' && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-12 flex gap-4 z-[70]"
              >
                <button
                    onClick={onClose}
                    className="bg-white text-pink-500 px-8 py-3 rounded-full font-black shadow-xl hover:bg-pink-50 border-2 border-pink-100 uppercase tracking-widest text-xs"
                >
                    Keep it safe 🔒
                </button>
              </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default LoveLetter;
