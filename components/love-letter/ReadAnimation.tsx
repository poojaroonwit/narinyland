"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoveLetterMessage } from '../../types';
import OptimizedImage from '../OptimizedImage';

const seededRatio = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  const ratio = Math.sin(hash * 9301 + 49297) * 233280;
  return ratio - Math.floor(ratio);
};

const stablePaperRotation = (id: string) => (seededRatio(id) - 0.5) * 5;

export const ReadAnimation: React.FC<{ message: LoveLetterMessage; onClose: () => void; onUpdateMessage?: (msg: LoveLetterMessage) => void }> = ({ message, onClose, onUpdateMessage }) => {
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
            className="relative w-80 h-56 bg-pink-500 rounded-b-md shadow-2xl z-10 flex justify-center"
        >
            {/* Envelope Body (Front) */}
            <div className="absolute inset-0 rounded-b-md z-20 pointer-events-none" 
                style={{
                    background: 'linear-gradient(135deg, #ec4899, #db2777)',
                    clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)' 
                }} 
            />
            
            {/* Envelope Back */}
            <div className="absolute inset-0 bg-pink-600/50 rounded-b-md -z-10 shadow-inner"></div>

            {/* THE LETTER */}
            <motion.div
                initial={{ y: 0, zIndex: 0 }}
                animate={{ 
                    y: stage === 'closed' ? 0 : -160,
                    zIndex: stage === 'reading' ? 50 : 0,
                    scale: stage === 'reading' ? 1.4 : 1,
                    rotate: stage === 'reading' ? 0 : stablePaperRotation(message.id)
                }}
                transition={{ duration: 1, delay: 0.2, type: "spring", bounce: 0.4 }}
                className="absolute top-2 w-[92%] h-[92%] bg-[#fffbf0] shadow-xl rounded-sm p-5 flex flex-col items-center cursor-default border border-[#e8dfc8] isolate"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Paper Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]"></div>

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
                              className="mb-4 rounded-md overflow-hidden border-2 border-white shadow-md bg-gray-100"
                            >
                              {message.media.type === 'image' && (
                                <OptimizedImage src={message.media.url} className="w-full h-auto object-cover max-h-48" alt="Memory" />
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
                              &quot;{message.content}&quot;
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
                    clipPath: 'polygon(0 0, 50% 64%, 100% 0)' 
                }}
                className="absolute top-0 w-full h-full bg-pink-600 z-30 shadow-lg flex justify-center items-center"
            >
                <div className="absolute top-[28%] w-10 h-10 bg-rose-700/80 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.3)] flex items-center justify-center border-2 border-rose-800 rotate-12 ring-2 ring-rose-500/20">
                   <div className="text-white text-lg filter drop-shadow-md">🌹</div>
                </div>
            </motion.div>
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
                {onUpdateMessage && message.folder !== 'Archive' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdateMessage({ ...message, folder: 'Archive' });
                            onClose();
                        }}
                        className="bg-gray-100 text-gray-500 px-6 py-3 rounded-full font-black shadow-md hover:bg-gray-200 uppercase tracking-widest text-xs"
                    >
                        Archive 📁
                    </button>
                )}
              </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};
