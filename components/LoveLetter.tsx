"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoveLetterMessage, MediaContent } from '../types';
import DatePicker from 'react-datepicker';
import OptimizedImage from './OptimizedImage';
import "react-datepicker/dist/react-datepicker.css";

type Partners = Record<string, { name: string; avatar: string }>;

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
  
  const partnerEntries = Object.entries(partners || {});
  const firstPartnerId = partnerEntries[0]?.[0] || 'partner1';
  const secondPartnerId = partnerEntries[1]?.[0] || 'partner2';
  
  const [composeFrom, setComposeFrom] = useState<string>(secondPartnerId);
  const [composeContent, setComposeContent] = useState('');
  const [composeDate, setComposeDate] = useState(new Date().toISOString().slice(0, 16));
  const [composeMedia, setComposeMedia] = useState<MediaContent | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isOpen) {
      setView('list');
      setSelectedMessage(null);
    }
  }, [isOpen]);

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
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const url = URL.createObjectURL(blob);
        setComposeMedia({ type: 'audio', url });
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Mic access required.");
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
      media: composeMedia,
      folder: 'Sent'
    };
    onSendMessage(newMessage);
    setView('list');
    setComposeContent('');
    setComposeMedia(undefined);
  };

  const getPartnerName = (id: string) => partners[id]?.name || id;
  const getPartnerAvatar = (id: string) => partners[id]?.avatar || '👤';

  if (!isOpen && !isInline) return null;

  const MainContent = (
    <motion.div
      initial={isInline ? { opacity: 0 } : { x: "100%" }}
      animate={{ x: 0, opacity: 1 }}
      exit={isInline ? { opacity: 0 } : { x: "100%" }}
      className={`${isInline ? 'w-full h-full max-w-4xl mx-auto rounded-clay border border-black/5' : 'bg-white w-full md:w-[500px] h-full shadow-2xl'} overflow-hidden flex flex-col font-geist relative`}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-white border-b border-black/5 p-8 flex justify-between items-center z-20">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => {
              if (view !== 'list') setView('list');
              else onClose();
            }} 
            className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-all"
          >
            <i className={`fas ${view === 'list' ? 'fa-times' : 'fa-arrow-left'} text-xs text-black/40`}></i>
          </button>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-black opacity-20 uppercase tracking-[0.5em]">
              {view === 'list' ? 'ARCHIVE' : view === 'compose' ? 'CREATE' : 'READING'}
            </p>
            <h2 className="font-black text-xl text-black uppercase tracking-tight">
              {view === 'list' ? 'MESSAGES' : view === 'compose' ? 'NEW RECORD' : 'LOG ENTRY'}
            </h2>
          </div>
        </div>
      </div>

      {/* --- LIST VIEW --- */}
      {view === 'list' && (
        <div className="flex flex-col h-full bg-white">
          <div className="flex gap-4 p-4 overflow-x-auto no-scrollbar border-b border-black/5">
            {folders.map(f => (
              <button 
                key={f}
                onClick={() => setCurrentFolder(f)}
                className={`px-6 py-2.5 rounded-pill text-[9px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${currentFolder === f ? 'bg-black text-white shadow-xl' : 'text-black/30 hover:text-black/60'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {messages.filter(m => (m.folder || 'Inbox') === currentFolder).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">ZERO ARCHIVES</p>
              </div>
            ) : (
              [...messages]
                .filter(m => (m.folder || 'Inbox') === currentFolder)
                .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map(msg => {
                  const isLocked = new Date(msg.unlockDate) > new Date();
                  const isUnread = !msg.isRead && !isLocked && msg.folder === 'Inbox';
                  return (
                    <motion.div
                      key={msg.id}
                      layout
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        if (isLocked) return;
                        if (!msg.isRead && onUpdateMessage) onUpdateMessage({ ...msg, isRead: true });
                        setSelectedMessage(msg);
                        setView('read');
                      }}
                      className="group cursor-pointer flex items-center gap-8 py-4 border-b border-black/5 last:border-0"
                    >
                      <div className="w-14 h-14 bg-black/5 rounded-xl flex items-center justify-center text-2xl grayscale group-hover:grayscale-0 transition-all flex-shrink-0">
                        {isLocked ? '🔒' : getPartnerAvatar(msg.fromId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-1">
                          <h4 className="text-[11px] font-black text-black uppercase tracking-tight">
                            {getPartnerName(msg.fromId)}
                            {isUnread && <span className="ml-2 w-2 h-2 bg-black rounded-full inline-block"></span>}
                          </h4>
                          <span className="text-[8px] font-black text-black/20 uppercase tracking-widest">
                            {new Date(msg.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-black/40 truncate uppercase tracking-widest">
                          {isLocked ? `LOCKED UNTIL ${new Date(msg.unlockDate).toLocaleDateString()}` : (msg.content || 'RECORD ATTACHED')}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
            )}
          </div>
          
          <button
            onClick={() => setView('compose')}
            className="absolute bottom-10 right-10 w-16 h-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-30 border border-white/10"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
      )}

      {/* --- COMPOSE VIEW --- */}
      {view === 'compose' && (
        <div className="flex-1 p-8 bg-white flex flex-col gap-10 overflow-y-auto">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em]">SOURCE</label>
            <div className="flex bg-black/5 p-1.5 rounded-pill overflow-x-auto max-w-full">
              {partnerEntries.map(([id, p]) => (
                <button 
                  key={id}
                  onClick={() => setComposeFrom(id)} 
                  className={`flex-1 py-3 px-4 rounded-pill text-[10px] font-black transition-all uppercase tracking-[0.2em] whitespace-nowrap ${composeFrom === id ? 'bg-black text-white shadow-xl' : 'text-black/30'}`}
                >
                  {p.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em]">RESTRICTION DATE</label>
            <DatePicker
              selected={new Date(composeDate)}
              onChange={(date: Date | null) => date && setComposeDate(date.toISOString().slice(0, 16))}
              showTimeSelect
              className="w-full bg-black/5 border border-transparent rounded-clay p-4 text-[11px] font-black uppercase tracking-widest focus:bg-white focus:border-black outline-none transition-all"
            />
          </div>

          <div className="space-y-4 flex-1 flex flex-col">
            <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em]">ENCRYPTION CONTENT</label>
            <textarea 
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              className="w-full h-full bg-black/5 border border-transparent rounded-clay p-6 text-[12px] font-black uppercase tracking-wider leading-relaxed focus:bg-white focus:border-black outline-none transition-all resize-none shadow-inner"
              placeholder="INPUT LOG DATA..."
            />
          </div>

          <button 
            onClick={handleSend}
            disabled={!composeContent.trim() && !composeMedia}
            className="w-full py-6 bg-black text-white font-black rounded-clay shadow-2xl hover:bg-black/80 transition-all disabled:opacity-20 uppercase tracking-[0.3em] text-[11px]"
          >
            TRANSMIT RECORD
          </button>
        </div>
      )}

      {/* --- READ VIEW --- */}
      <AnimatePresence>
        {view === 'read' && selectedMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[50] bg-white flex flex-col p-8 md:p-12 overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-20">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em]">LOG {selectedMessage.id}</p>
                <p className="text-[11px] font-black text-black uppercase tracking-widest">FROM: {getPartnerName(selectedMessage.fromId).toUpperCase()}</p>
                <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">{new Date(selectedMessage.timestamp).toLocaleString().toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setView('list')}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-all"
              >
                <i className="fas fa-times text-xs text-black/40"></i>
              </button>
            </div>

            <div className="flex-1 max-w-lg mx-auto w-full">
               {selectedMessage.media && (
                 <div className="mb-12 rounded-clay overflow-hidden grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-1000 shadow-2xl border border-black/5">
                   {selectedMessage.media.type === 'image' && <img src={selectedMessage.media.url} className="w-full object-cover" />}
                   {selectedMessage.media.type === 'video' && <video src={selectedMessage.media.url} controls className="w-full h-auto" />}
                   {selectedMessage.media.type === 'audio' && <audio src={selectedMessage.media.url} controls className="w-full" />}
                 </div>
               )}
               <div className="text-xl font-black text-black uppercase tracking-tight leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.content}
               </div>
            </div>

            <div className="mt-20 pt-10 border-t border-black/5 text-center">
              <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.8em]">END OF ARCHIVE</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (isInline) return MainContent;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-3xl flex justify-end items-stretch"
          onClick={onClose}
        >
          {MainContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoveLetter;
