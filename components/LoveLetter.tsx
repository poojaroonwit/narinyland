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
      className={`${isInline ? 'w-full h-full max-w-4xl mx-auto border border-black/5 shadow-sm' : 'bg-white w-full md:w-[600px] h-full shadow-2xl'} overflow-hidden flex flex-col font-geist relative`}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-white border-b border-black/5 p-10 flex justify-between items-end z-20">
        <div className="flex items-center gap-10">
          <button 
            onClick={() => {
              if (view !== 'list') setView('list');
              else onClose();
            }} 
            className="w-14 h-14 flex items-center justify-center bg-black/5 hover:bg-black text-black hover:text-white transition-all border border-black/5"
          >
            <i className={`fas ${view === 'list' ? 'fa-times' : 'fa-arrow-left'} text-xs`}></i>
          </button>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.6em]">
              {view === 'list' ? 'REPOSITORY_ACCESS' : view === 'compose' ? 'NEW_ENCRYPTION' : 'LOG_DECRYPTION'}
            </p>
            <h2 className="font-black text-2xl text-black uppercase tracking-extratight leading-none">
              {view === 'list' ? 'MESSAGES' : view === 'compose' ? 'CREATE_ENTRY' : 'ARCHIVE_VIEW'}
            </h2>
          </div>
        </div>
      </div>

      {/* --- LIST VIEW --- */}
      {view === 'list' && (
        <div className="flex flex-col h-full bg-white">
          <div className="flex p-6 overflow-x-auto no-scrollbar border-b border-black/5 bg-black/[0.02]">
            {folders.map(f => (
              <button 
                key={f}
                onClick={() => setCurrentFolder(f)}
                className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap ${currentFolder === f ? 'bg-black text-white shadow-2xl' : 'text-black/20 hover:text-black/40'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-10">
            {messages.filter(m => (m.folder || 'Inbox') === currentFolder).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-10">
                <p className="text-[12px] font-black uppercase tracking-[0.8em]">NULL_ARCHIVE_RETURNED</p>
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
                      onClick={() => {
                        if (isLocked) return;
                        if (!msg.isRead && onUpdateMessage) onUpdateMessage({ ...msg, isRead: true });
                        setSelectedMessage(msg);
                        setView('read');
                      }}
                      className="group cursor-pointer flex items-center gap-10 py-6 border-b border-black/5 last:border-0 hover:bg-black/[0.01] transition-all -mx-10 px-10"
                    >
                      <div className="w-16 h-16 bg-black/[0.02] border border-black/5 flex items-center justify-center text-3xl grayscale group-hover:grayscale-0 transition-all flex-shrink-0">
                        {isLocked ? '🔒' : getPartnerAvatar(msg.fromId)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex justify-between items-end">
                          <h4 className="text-[13px] font-black text-black uppercase tracking-tight">
                            {getPartnerName(msg.fromId)}
                            {isUnread && <span className="ml-3 w-1.5 h-1.5 bg-black inline-block animate-pulse"></span>}
                          </h4>
                          <span className="text-[9px] font-black text-black/20 uppercase tracking-[0.3em]">
                            {format(new Date(msg.timestamp), 'yy.MM.dd').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] font-black text-black/40 truncate uppercase tracking-[0.2em] leading-none">
                          {isLocked ? `ACCESS_LOCKED::UNL_DATE_${format(new Date(msg.unlockDate), 'yy.MM.dd').toUpperCase()}` : (msg.content || 'ATTACHMENT_PROTOCOL')}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
            )}
          </div>
          
          <button
            onClick={() => setView('compose')}
            className="absolute bottom-12 right-12 w-20 h-20 bg-black text-white shadow-[0_30px_60px_rgba(0,0,0,0.4)] flex items-center justify-center hover:bg-neutral-800 transition-all z-30 border border-white/10"
          >
            <i className="fas fa-plus text-xl"></i>
          </button>
        </div>
      )}

      {/* --- COMPOSE VIEW --- */}
      {view === 'compose' && (
        <div className="flex-1 p-12 bg-white flex flex-col gap-12 overflow-y-auto">
          <div className="space-y-6">
            <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.6em]">IDENT_SOURCE</label>
            <div className="flex bg-black/[0.02] border border-black/5 p-2">
              {partnerEntries.map(([id, p]) => (
                <button 
                  key={id}
                  onClick={() => setComposeFrom(id)} 
                  className={`flex-1 py-4 px-6 text-[10px] font-black transition-all uppercase tracking-[0.3em] whitespace-nowrap ${composeFrom === id ? 'bg-black text-white shadow-2xl' : 'text-black/20 hover:text-black/40'}`}
                >
                  {p.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
 
          <div className="space-y-6">
            <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.6em]">SYSTEM_RESTRICTION_DATE</label>
            <DatePicker
              selected={new Date(composeDate)}
              onChange={(date: Date | null) => date && setComposeDate(date.toISOString().slice(0, 16))}
              showTimeSelect
              className="w-full bg-black/[0.02] border border-black/5 p-6 text-[12px] font-black uppercase tracking-[0.3em] focus:bg-white focus:border-black outline-none transition-all"
            />
          </div>
 
          <div className="space-y-6 flex-1 flex flex-col">
            <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.6em]">ENCRYPTION_CONTENT</label>
            <textarea 
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              className="w-full h-full bg-black/[0.02] border border-black/5 p-8 text-[14px] font-black uppercase tracking-extratight leading-relaxed focus:bg-white focus:border-black outline-none transition-all resize-none shadow-inner"
              placeholder="ENTER_LOG_DATA..."
            />
          </div>
 
          <button 
            onClick={handleSend}
            disabled={!composeContent.trim() && !composeMedia}
            className="w-full py-8 bg-black text-white font-black shadow-[0_40px_80px_rgba(0,0,0,0.4)] hover:bg-neutral-800 transition-all disabled:opacity-20 uppercase tracking-[0.6em] text-[12px]"
          >
            TRANSMIT_RECORD::FINAL
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
            <div className="flex justify-between items-start mb-32">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.8em]">RECORD_AUTH::{selectedMessage.id}</p>
                <p className="text-[14px] font-black text-black uppercase tracking-[0.4em]">FROM_ID:: {getPartnerName(selectedMessage.fromId).toUpperCase()}</p>
                <div className="bg-black/5 px-6 py-2 text-[10px] font-black text-black uppercase tracking-[0.3em] inline-block">{format(new Date(selectedMessage.timestamp), 'yy.MM.dd // HH:mm:ss').toUpperCase()}</div>
              </div>
              <button 
                onClick={() => setView('list')}
                className="w-16 h-16 flex items-center justify-center bg-black/5 hover:bg-black text-black hover:text-white transition-all border border-black/5"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
 
            <div className="flex-1 max-w-2xl mx-auto w-full space-y-20">
               {selectedMessage.media && (
                 <div className="rounded-none overflow-hidden grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-1000 shadow-2xl border border-black/5">
                   {selectedMessage.media.type === 'image' && <img src={selectedMessage.media.url} className="w-full object-cover" />}
                   {selectedMessage.media.type === 'video' && <video src={selectedMessage.media.url} controls className="w-full h-auto" />}
                   {selectedMessage.media.type === 'audio' && <audio src={selectedMessage.media.url} controls className="w-full" />}
                 </div>
               )}
               <div className="text-2xl font-black text-black uppercase tracking-extratight leading-snug whitespace-pre-wrap">
                  {selectedMessage.content}
               </div>
            </div>
 
            <div className="mt-40 py-20 border-t border-black/10 text-center">
              <p className="text-[10px] font-black text-black/20 uppercase tracking-[1em]">SYSTEM_END_OF_ARCHIVE</p>
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
