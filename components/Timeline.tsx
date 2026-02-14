"use client";

import * as React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Interaction, MediaContent } from '../types';
import TimelineSpreadsheet from './TimelineSpreadsheet';
import { timelineAPI } from '../services/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface TimelineProps {
  interactions: Interaction[];
  anniversaryDate?: string;
  defaultRows?: number;
  onAddInteraction?: (interaction: Interaction) => void;
  onUpdateInteraction?: (interaction: Interaction) => void;
  onDeleteInteraction?: (id: string) => void;
  onOpenSpreadsheet?: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  interactions, 
  anniversaryDate,
  defaultRows = 5,
  onAddInteraction, 
  onUpdateInteraction, 
  onDeleteInteraction,
  onOpenSpreadsheet
}) => {
  const [zoomLevel, setZoomLevel] = useState<1 | 5 | 10 | 30>(1);
  const [activeItem, setActiveItem] = useState<Interaction | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [layoutMode, setLayoutMode] = useState<'wave' | 'snake'>('wave');
  
  // Media & Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  };

  const getMonthColor = (date: Date) => {
    const month = date.getMonth();
    const colors = [
      'bg-blue-400', 'bg-blue-300', 'bg-green-400', 'bg-green-500', 
      'bg-yellow-400', 'bg-orange-400', 'bg-orange-500', 'bg-red-400', 
      'bg-purple-400', 'bg-purple-500', 'bg-pink-400', 'bg-pink-300'
    ];
    return colors[month] || 'bg-gray-400';
  };
  
  const allInteractions = useMemo(() => {
    // Normalize existing interactions to ensure timestamps are Date objects
    const combined = interactions.map(i => ({
      ...i,
      timestamp: i.timestamp instanceof Date ? i.timestamp : new Date(i.timestamp)
    }));

    if (anniversaryDate) {
      const start = new Date(anniversaryDate);
      const startYear = start.getFullYear();
      const currentYear = new Date().getFullYear();
      const maxUserYear = combined.length > 0 ? Math.max(...combined.map(i => i.timestamp.getFullYear())) : currentYear;
      
      for (let y = startYear; y <= Math.max(currentYear + 2, maxUserYear + 1); y++) {
        const annivDate = new Date(start);
        annivDate.setFullYear(y);
        combined.push({
          id: "anniv-" + y,
          text: y === startYear ? "The Beginning of Us ❤️" : getOrdinal(y - startYear) + " Anniversary! 💑",
          timestamp: annivDate,
          type: 'system',
        });
      }
    }
    return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [interactions, anniversaryDate]);

  // Layout Calculations
  const timelineLayout = useMemo(() => {
    if (allInteractions.length === 0) return { items: [], height: 0, path: '', nowY: -1, centerX: 0, nowX: -1, snakeMode: false };

    const sorted = [...allInteractions];
    const startDate = sorted[0].timestamp;
    const endDate = sorted[sorted.length - 1].timestamp; // Ensure we cover the full range
    const startTime = startDate.getTime();

    // --- SNAKE MODE CALCULATION ---
    if (layoutMode === 'snake') {
        const startYear = startDate.getFullYear();
        // Ensure endYear covers current year for "Today" marker
        const endYear = Math.max(new Date().getFullYear(), endDate.getFullYear());
        const totalRows = endYear - startYear + 1;
        const rowHeight = zoomLevel === 1 ? 180 : zoomLevel === 5 ? 300 : zoomLevel === 10 ? 500 : 1000;
        const containerWidth = Math.min(windowWidth, 800); 
        const sidePad = windowWidth < 640 ? 40 : (zoomLevel === 1 ? 160 : zoomLevel === 5 ? 100 : zoomLevel === 10 ? 60 : 40);
        const activeWidth = containerWidth - (sidePad * 2);
        
        let pathD = '';
        const itemsWithPos: any[] = [];
        
        // Generate Path & Place Items
        for (let i = 0; i < totalRows; i++) {
           const currentYear = startYear + i;
           const isEven = i % 2 === 0;
           const rowY = i * rowHeight + 100; // Start with some padding
           
           // Path Points
           const startX = isEven ? sidePad : containerWidth - sidePad;
           const endX = isEven ? containerWidth - sidePad : sidePad;
           
           if (i === 0) pathD += `M ${startX} ${rowY}`;
           
           // Line across the year
           pathD += ` L ${endX} ${rowY}`;
           
           // Connector to next row (if not last)
             if (i < totalRows - 1) {
               const nextRowY = rowY + rowHeight;
               const cp1x = isEven ? containerWidth : 0;
               const cp1y = rowY;
               const cp2x = isEven ? containerWidth : 0;
               const cp2y = nextRowY;
               pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${nextRowY}`;
             }

           // Place items for this year only
           const yearItems = sorted.filter(item => item.timestamp.getFullYear() === currentYear);
           const yearStart = new Date(currentYear, 0, 1).getTime();
           const yearEnd = new Date(currentYear + 1, 0, 1).getTime();
           const yearDuration = yearEnd - yearStart;

           yearItems.forEach(item => {
              const progress = (item.timestamp.getTime() - yearStart) / yearDuration;
              const visualProgress = progress; 
              
              const x = isEven 
                ? sidePad + (visualProgress * activeWidth)
                : (containerWidth - sidePad) - (visualProgress * activeWidth);
                
              itemsWithPos.push({
                 ...item,
                 x,
                 y: rowY,
                 isRightSide: !isEven, // tooltip direction preference
                 isEvenRow: isEven,
                 isFuture: item.timestamp.getTime() > Date.now()
              });
           });
        }

        // Calculate "Now" Position (Snake)
        let nowY = -1;
        let nowX = -1;
        const now = new Date();
        const nowYear = now.getFullYear();
        if (nowYear >= startYear && nowYear <= endYear) {
           const i = nowYear - startYear;
           const isEven = i % 2 === 0;
           nowY = i * rowHeight + 100;
           
           const yearStart = new Date(nowYear, 0, 1).getTime();
           const yearEnd = new Date(nowYear + 1, 0, 1).getTime();
           const progress = (now.getTime() - yearStart) / (yearEnd - yearStart);
           
           nowX = isEven 
                ? sidePad + (progress * activeWidth)
                : (containerWidth - sidePad) - (progress * activeWidth);
        }

        return { items: itemsWithPos, height: totalRows * rowHeight + 200, path: pathD, centerX: containerWidth/2, nowY, nowX, snakeMode: true };
    }

    // --- WAVE MODE CALCULATION ---
    const pxPerYear = zoomLevel === 1 ? 150 : zoomLevel === 5 ? 300 : zoomLevel === 10 ? 600 : 1500; 
    const pxPerMs = pxPerYear / (365 * 24 * 60 * 60 * 1000);
    
    // Check total height required
    const duration = endDate.getTime() - startTime;
    const totalHeight = Math.max(600, duration * pxPerMs + 200);

    // Curve Parameters
    // Curve Parameters
    const containerWidth = Math.min(windowWidth, 1200);
    const centerX = containerWidth / 2; 
    const amplitude = windowWidth < 640 ? 80 : 250; 
    const wavelength = 350; 

    // Generate Path Points
    const points = [];
    for (let y = 0; y <= totalHeight; y += 10) {
      const x = centerX + Math.sin(y / wavelength * Math.PI * 2) * amplitude;
      points.push(`${x},${y}`);
    }
    const pathData = `M ${points[0]} L ${points.slice(1).join(' ')}`;

    // Calculate "Now" Position
    let nowY = -1;
    const nowTime = new Date().getTime();
    if (nowTime >= startTime && nowTime <= endDate.getTime()) {
       nowY = 50 + (nowTime - startTime) * pxPerMs;
    }

    // Map Items to Positions
    const itemsWithPos = sorted.map((item, index) => {
      const timeOffset = item.timestamp.getTime() - startTime;
      const y = 50 + timeOffset * pxPerMs; 
      const x = centerX + Math.sin(y / wavelength * Math.PI * 2) * amplitude;
      
      const isRightSide = x < centerX; 
      const isFuture = item.timestamp.getTime() > nowTime;

      return {
        ...item,
        x,
        y,
        isRightSide,
        isFuture
      };
    });

    return { items: itemsWithPos, height: totalHeight, path: pathData, centerX, nowY, snakeMode: false };
  }, [allInteractions, zoomLevel, windowWidth, layoutMode]);


  const handleEditClick = (item: Interaction) => {
    if (!item.id.startsWith('anniv-')) {
      setActiveItem({ 
        ...item,
        timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
      });
      setIsNew(false);
    }
  };

  const handleAddNew = () => {
    const newItem: Interaction = {
      id: Date.now().toString(),
      text: "",
      timestamp: new Date(),
      type: 'system'
    };
    setActiveItem(newItem);
    setIsNew(true);
  };

  const handleMassUpdate = async (updatedItems: Interaction[]) => {
    for (const item of updatedItems) {
      if (item.id.startsWith('temp-')) {
        // This is a new item added from spreadsheet
        onAddInteraction?.(item);
        continue;
      }
      
      const original = interactions.find(i => i.id === item.id);
      if (JSON.stringify(original) !== JSON.stringify(item)) {
        onUpdateInteraction?.(item);
      }
    }
  };

  const handleSave = () => {
    if (!activeItem || !activeItem.text.trim()) return;
    if (isNew) {
      onAddInteraction?.(activeItem);
    } else {
      onUpdateInteraction?.(activeItem);
    }
    setActiveItem(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = e.target.files;
    if (files && files.length > 0 && activeItem) {
      const newItems: MediaContent[] = Array.from(files).map(file => ({
        type,
        url: URL.createObjectURL(file)
      }));
      
      const currentItems = activeItem.mediaItems || (activeItem.media ? [activeItem.media] : []);
      const nextItems = [...currentItems, ...newItems];
      
      setActiveItem({ 
        ...activeItem, 
        mediaItems: nextItems,
        media: nextItems[0]
      });
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
        if (activeItem) {
          setActiveItem({ ...activeItem, media: { type: 'audio', url } });
        }
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access is required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const removeMedia = (index?: number) => {
    if (!activeItem) return;
    
    if (index !== undefined && activeItem.mediaItems) {
       const item = activeItem.mediaItems[index];
       if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
       const next = activeItem.mediaItems.filter((_, i) => i !== index);
       setActiveItem({ ...activeItem, mediaItems: next, media: next[0] });
    } else {
       if (activeItem.media?.url.startsWith('blob:')) URL.revokeObjectURL(activeItem.media.url);
       setActiveItem({ ...activeItem, media: undefined, mediaItems: [] });
    }
  };

  // Check if we have items
  if (allInteractions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
         <div className="text-6xl mb-4">✨</div>
         <h2 className="font-pacifico text-3xl text-gray-400 mb-4">Your Story Begins Here</h2>
         <button onClick={handleAddNew} className="bg-pink-500 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">
           Start Planning
         </button>
      </div>
    );
  }
 
  const isFutureDate = activeItem && activeItem.timestamp > new Date();

  return (
    <div className="w-full relative pb-20 overflow-hidden">
      {/* Header Controls */}
      <div className="fixed top-28 right-4 lg:right-10 z-50 flex flex-col gap-4 items-end pointer-events-none">
         
         <div className="pointer-events-auto flex flex-col gap-2 items-end">
             {/* MODE TOGGLE */}
             <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-pink-100 flex gap-1">
                <button 
                  onClick={() => setLayoutMode('wave')}
                  className={`p-2 rounded-xl transition-all ${layoutMode === 'wave' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-400 hover:bg-pink-50'}`}
                  title="Wave View"
                >
                  <i className="fas fa-water rotate-90 text-xs"></i>
                </button>
                 <button 
                   onClick={() => setLayoutMode('snake')}
                   className={`p-2 rounded-xl transition-all ${layoutMode === 'snake' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-400 hover:bg-pink-50'}`}
                   title="Snake Year View"
                 >
                    <i className="fas fa-road text-xs"></i>
                 </button>
                 <div className="w-px h-4 bg-gray-200 self-center mx-1"></div>
                 <button 
                   onClick={() => onOpenSpreadsheet?.()}
                   className="p-2 rounded-xl text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-all"
                   title="Open Spreadsheet (Bulk Edit)"
                 >
                    <i className="fas fa-table text-xs"></i>
                 </button>
              </div>

              <div className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-pink-100 flex items-center gap-1">
                 <button 
                   onClick={() => {
                     if (zoomLevel === 30) setZoomLevel(10);
                     else if (zoomLevel === 10) setZoomLevel(5);
                     else setZoomLevel(1);
                   }}
                   className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-all"
                   title="Zoom Out"
                 >
                   <i className="fas fa-minus text-xs"></i>
                 </button>
                 <div className="flex bg-gray-50 rounded-full p-1 gap-1">
                   {[1, 5, 10, 30].map((s) => (
                     <button
                       key={s}
                       onClick={() => setZoomLevel(s as any)}
                       className={`w-10 h-10 rounded-full text-[10px] font-black transition-all flex flex-col items-center justify-center ${
                         zoomLevel === s 
                           ? 'bg-pink-500 text-white shadow-md scale-110' 
                           : 'text-gray-400 hover:text-pink-400'
                       }`}
                     >
                       <span>{s}x</span>
                     </button>
                   ))}
                 </div>
                 <button 
                   onClick={() => {
                     if (zoomLevel === 1) setZoomLevel(5);
                     else if (zoomLevel === 5) setZoomLevel(10);
                     else setZoomLevel(30);
                   }}
                   className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-all"
                   title="Zoom In"
                 >
                   <i className="fas fa-plus text-xs"></i>
                 </button>
              </div>
         </div>
         
         <button 
            onClick={handleAddNew}
            className="pointer-events-auto w-12 h-12 bg-pink-500 text-white rounded-full shadow-xl shadow-pink-200 flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all group relative"
         >
           <i className="fas fa-plus text-lg"></i>
           <span className="absolute right-14 bg-black/80 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Add Memory or Plan</span>
         </button>
      </div>
      
      <div className="w-full flex justify-center pt-10 pb-40 relative">
        <div style={{ height: timelineLayout.height, width: '100%', maxWidth: windowWidth < 640 ? '100%' : '1200px', position: 'relative' }}>
          
          {/* THE SVG PATH LINE */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
             <defs>
               <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#fbcfe8" />
                 <stop offset="100%" stopColor="#a78bfa" />
               </linearGradient>
             </defs>
             {/* Background thick path */}
             <motion.path 
                d={timelineLayout.path}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="6"
                strokeLinecap="round" // Round line caps for snake turns
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
             />
             {/* Foreground dashed path for detail */}
             <motion.path 
                d={timelineLayout.path}
                fill="none"
                stroke="white"
                strokeWidth={layoutMode === 'snake' ? 3 : 2}
                strokeDasharray="10 10"
                strokeOpacity="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
             />
          </svg>

          {/* NOW INDICATOR */}
          {timelineLayout.nowY > 0 && typeof timelineLayout.nowY === 'number' && (
             <div 
               className="absolute flex items-center justify-center pointer-events-none z-0"
               style={{ 
                  top: timelineLayout.nowY,
                  left: timelineLayout.snakeMode && timelineLayout.nowX !== -1 ? timelineLayout.nowX : '50%',
                  width: timelineLayout.snakeMode ? 'auto' : '100%',
                  transform: timelineLayout.snakeMode ? 'translate(-50%, -50%)' : 'translateY(0)' 
               }}
             >
                {timelineLayout.snakeMode ? (
                   <div className="relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-pink-500 animate-ping opacity-50"></div>
                      <div className="bg-pink-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-sm uppercase z-10 relative whitespace-nowrap">
                         Today
                      </div>
                   </div>
                ) : (
                   <>
                      <div className="h-px bg-pink-500/50 w-full max-w-md absolute border-t border-dashed border-pink-400"></div>
                      <div className="bg-pink-500 text-white text-[10px] font-black px-3 py-1 rounded-full relative z-10 shadow-sm uppercase tracking-widest">
                         Today
                      </div>
                   </>
                )}
             </div>
          )}

          {/* EVENTS */}
          <AnimatePresence>
            {timelineLayout.items.map((item, i) => {
               const isAnniversary = item.id.startsWith('anniv-');
               const isQuest = item.type === 'quest';
               // Check if first in year (Wave Mode) OR always show year label in Snake Mode (handled differently)
               
               const prevItem = timelineLayout.items[i-1];
               const isFirstOfYear = !prevItem || prevItem.timestamp.getFullYear() !== item.timestamp.getFullYear();
               
               return (
                 <React.Fragment key={item.id}>
                    {/* Year Marker */}
                    {isFirstOfYear && (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0 }}
                         whileInView={{ opacity: 1, scale: 1 }}
                         viewport={{ once: true }}
                         className="absolute font-black text-pink-500/30 select-none font-pacifico z-0"
                         style={{ 
                           top: timelineLayout.snakeMode ? item.y - 40 : item.y - 60, 
                           left: timelineLayout.snakeMode ? (item.isEvenRow ? 20 : 'auto') : (item.isRightSide ? item.x - 200 : item.x + 50),
                           right: timelineLayout.snakeMode ? (!item.isEvenRow ? 20 : 'auto') : 'auto',
                           transform: timelineLayout.snakeMode ? 'none' : 'translateX(-50%)',
                           fontSize: timelineLayout.snakeMode ? '4rem' : '5rem'
                         }}
                       >
                         {item.timestamp.getFullYear()}
                       </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.5, delay: i % 5 * 0.1 }}
                      className="absolute z-10"
                      style={{ 
                        top: item.y, 
                        left: item.x,
                        transform: 'translate(-50%, -50%)' 
                      }}
                    >
                      {/* DOT ON LINE */}
                      <div className={`w-4 h-4 rounded-full border-[3px] border-white shadow-md relative z-20 transition-transform hover:scale-150 ${
                        isAnniversary 
                          ? 'bg-yellow-400 w-5 h-5 -ml-0.5 -mt-0.5' 
                          : item.isFuture 
                            ? 'bg-purple-400' 
                            : isQuest 
                              ? 'bg-green-400' 
                              : 'bg-pink-500'
                      }`}>
                         {isAnniversary && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm">👑</span>}
                         {item.isFuture && !isAnniversary && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px]">📌</span>}
                      </div>

                      {/* CONTENT CARD */}
                      <div 
                        className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 w-max max-w-[120px] md:max-w-[180px] group cursor-pointer z-30 ${
                          timelineLayout.snakeMode 
                            ? 'flex-col -translate-y-[calc(100%+15px)]' 
                            : (item.isRightSide ? 'flex-row left-8' : 'flex-row-reverse right-8')
                        }`}
                        onClick={() => handleEditClick(item)}
                      >
                         {/* Connecting Line (Hidden in snake mode top-float style, or maybe strictly vertical line) */}
                         <div className={`absolute ${
                           timelineLayout.snakeMode
                             ? 'w-[2px] h-4 bg-pink-200 -bottom-4 left-1/2 -translate-x-1/2'
                             : `h-[2px] w-8 top-1/2 -translate-y-1/2 ${item.isFuture ? 'bg-purple-200' : 'bg-pink-200'} ${item.isRightSide ? '-left-8' : '-right-8'}`
                         }`} />

                         <div className="relative bg-white/80 hover:bg-white backdrop-blur-md p-3 rounded-[2rem] shadow-sm border hover:shadow-xl hover:scale-105 transition-all duration-300 text-center">
                            {/* Date Badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                               <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-wider shadow-sm ${
                                  item.isFuture ? 'bg-purple-400' : getMonthColor(item.timestamp)
                               }`}>
                                 {getMonthName(item.timestamp)} {item.timestamp.getDate()}
                               </span>
                            </div>

                            <p className="text-[10px] md:text-xs font-bold text-gray-700 leading-snug mt-2 line-clamp-3">
                              {item.text}
                            </p>

                            {item.location && (
                               <div className="mt-1.5 flex items-center justify-center gap-1 text-[9px] font-bold text-pink-400">
                                 <i className="fas fa-map-marker-alt"></i>
                                 <span className="truncate max-w-[100px]">{item.location}</span>
                               </div>
                            )}
                            
                             {((item.mediaItems?.length || 0) > 0 || !!item.media) && (
                               <div className="mt-2 flex justify-center gap-2">
                                 <div className="px-2 py-1 bg-gray-100 rounded-lg text-[9px] font-bold text-gray-500 flex items-center gap-1">
                                   <i className={`fas ${
                                     (item.mediaItems?.length || 0) > 1 
                                       ? 'fa-images text-pink-400' 
                                       : (item.media?.type === 'video' || item.mediaItems?.[0]?.type === 'video')
                                         ? 'fa-video text-blue-400' 
                                         : 'fa-image text-pink-400'
                                   }`}></i>
                                   <span className="capitalize">
                                     {(item.mediaItems?.length || 0) > 1 
                                       ? `${item.mediaItems?.length} Photos` 
                                       : (item.media?.type || item.mediaItems?.[0]?.type || 'Image')}
                                   </span>
                                 </div>
                               </div>
                            )}
                            
                            {item.isFuture && (
                               <div className="mt-1 text-[8px] font-black text-purple-400 uppercase tracking-widest">
                                  Upcoming Plan
                               </div>
                            )}
                         </div>
                      </div>
                    </motion.div>
                 </React.Fragment>
               );
            })}
          </AnimatePresence>
        </div>
      </div>

       {/* EDIT/ADD MODAL */}
       <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            onClick={() => setActiveItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-6 text-white flex justify-between items-center shrink-0 transition-colors ${
                isFutureDate ? 'bg-purple-500' : 'bg-pink-500'
              }`}>
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
                 <div className="bg-gray-50/50 rounded-[2.5rem] p-6 border-2 border-gray-100 flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${isFutureDate ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
                       <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div className="flex-1">
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest pl-1">
                         {isFutureDate ? 'Event Schedule' : 'Milestone Date & Time'}
                       </label>
                       <div className="flex items-center gap-2">
                         <DatePicker
                           selected={activeItem.timestamp}
                           onChange={(date: Date | null) => date && setActiveItem({ ...activeItem, timestamp: date })}
                           showTimeSelect
                           dateFormat="Pp"
                           className="bg-transparent border-none font-bold text-gray-700 outline-none p-0 cursor-pointer text-lg focus:ring-0 flex-1"
                         />
                         <button 
                           onClick={() => setActiveItem({ ...activeItem, timestamp: new Date() })}
                           className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition-all ${isFutureDate ? 'text-purple-500 border-purple-200 hover:bg-purple-50' : 'text-pink-500 border-pink-200 hover:bg-pink-50'}`}
                         >
                           Today
                         </button>
                       </div>
                       <p className="text-[10px] text-gray-400 font-bold mt-1 pl-1">Choose the exact moment of this memory ✨</p>
                    </div>
                 </div>

                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Location</label>
                   <div className="relative">
                     <i className={`fas fa-map-pin absolute left-4 top-1/2 -translate-y-1/2 ${isFutureDate ? 'text-purple-400' : 'text-pink-400'}`}></i>
                     <input 
                       type="text" 
                       value={activeItem.location || ""} 
                       onChange={(e) => setActiveItem({ ...activeItem, location: e.target.value })}
                       className={`w-full border-2 rounded-[2rem] p-4 pl-10 text-sm font-bold text-gray-700 outline-none transition-all bg-gray-50/50 ${
                         isFutureDate ? 'border-purple-50 focus:ring-purple-300' : 'border-pink-50 focus:ring-300'
                       }`}
                       placeholder="Where did it happen?"
                     />
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                     {isFutureDate ? 'Inspiration Attachment' : 'Memory Attachment'}
                   </label>
                   {/* Replaced !activeItem.media with check for mediaItems length */}
                   {(!activeItem.mediaItems || activeItem.mediaItems.length === 0) && (
                     <div className="flex gap-2">
                         <label className={`flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer transition-all bg-white group ${isFutureDate ? 'hover:bg-purple-50 hover:border-purple-300' : 'hover:bg-pink-50 hover:border-pink-300'}`}>
                           <i className={`fas fa-image text-xl mb-1 group-hover:scale-110 transition-transform ${isFutureDate ? 'text-purple-400' : 'text-pink-400'}`}></i>
                           <span className="text-[8px] font-black text-gray-400 uppercase">Photos</span>
                           <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                         </label>
 
                         <label className="flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all bg-white group">
                           <i className="fas fa-video text-blue-400 text-xl mb-1 group-hover:scale-110 transition-transform"></i>
                           <span className="text-[8px] font-black text-gray-400 uppercase">Videos</span>
                           <input type="file" multiple accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                         </label>

                        <button 
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`flex-1 flex flex-col items-center justify-center py-4 px-2 border-2 border-dashed rounded-2xl transition-all bg-white group ${
                            isRecording 
                              ? 'bg-red-50 border-red-400 animate-pulse' 
                              : 'border-gray-200 hover:bg-orange-50 hover:border-orange-300'
                          }`}
                        >
                          <i className={`fas ${isRecording ? 'fa-stop text-red-500' : 'fa-microphone text-orange-400'} text-xl mb-1 group-hover:scale-110 transition-transform`}></i>
                          <span className="text-[8px] font-black text-gray-400 uppercase">{isRecording ? 'Stop' : 'Voice'}</span>
                        </button>
                     </div>
                   )}
                    {/* Multiple Media Preview */}
                    {(activeItem.mediaItems?.length || 0) > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest ml-1">Attached Media:</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {activeItem.mediaItems?.map((m, idx) => (
                            <div key={idx} className="relative group shrink-0">
                               <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-50 shadow-sm relative">
                                  {m.type === 'image' && <img src={m.url} className="w-full h-full object-cover" />}
                                  {m.type === 'video' && <div className="w-full h-full flex items-center justify-center text-lg">🎥</div>}
                                  {m.type === 'audio' && <div className="w-full h-full flex items-center justify-center text-lg">🎤</div>}
                               </div>
                               <button 
                                 onClick={() => removeMedia(idx)}
                                 className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md hover:scale-110 transition-transform"
                               >
                                 <i className="fas fa-times"></i>
                               </button>
                            </div>
                          ))}
                          
                          {/* Quick Add More button inside list */}
                          <label className={`w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-pink-50 hover:border-pink-200 transition-all shrink-0`}>
                             <i className="fas fa-plus text-gray-400 text-xs translate-y-1"></i>
                             <span className="text-[7px] font-black text-gray-300 uppercase mt-1">Add</span>
                             <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                          </label>
                        </div>
                      </div>
                    )}
                </div>

                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                      {isFutureDate ? 'The Plan' : 'The Story'}
                   </label>
                   <textarea 
                     value={activeItem.text}
                     onChange={(e) => setActiveItem({ ...activeItem, text: e.target.value })}
                     className={`w-full h-32 border-2 rounded-[2rem] p-4 text-sm font-bold text-gray-700 outline-none resize-none transition-all bg-gray-50/50 ${
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
                       className="flex-1 py-4 bg-red-50 text-red-500 font-black rounded-[2rem] text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors"
                     >
                       Delete
                     </button>
                   )}
                   <button 
                     onClick={handleSave}
                     disabled={!activeItem.text.trim()}
                     className={`flex-[2] py-4 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 disabled:grayscale ${
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
    </div>
  );
};

export default Timeline;
