"use client";

import * as React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Interaction, MediaContent } from '../types';
import TimelineSpreadsheet from './TimelineSpreadsheet';
import { timelineAPI } from '../services/api';
import DatePicker from 'react-datepicker';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import "react-datepicker/dist/react-datepicker.css";
import OptimizedImage from './OptimizedImage';
import TimelineImages from './TimelineImages';

interface TimelineProps {
  interactions: Interaction[];
  anniversaryDate?: string;
  defaultRows?: number;
  onAddInteraction?: (interaction: Interaction) => void;
  onUpdateInteraction?: (interaction: Interaction) => void;
  onDeleteInteraction?: (id: string) => void;
  onOpenSpreadsheet?: () => void;

  cardScale?: number;
  layoutMode?: 'vertical' | 'wave' | 'snake' | 'gallery';
  zoomLevel?: number; // 0-7 index
  thumbnailHeight?: number;
  onOpenSettings?: () => void;
  onUpdateConfig?: (config: { layoutMode?: 'vertical' | 'wave' | 'snake' | 'gallery', zoomLevel?: number }) => void;
  
  // Image modal props
  showImageModal?: boolean;
  onSetShowImageModal?: (show: boolean) => void;
  modalImageIndex?: number;
  onSetModalImageIndex?: (index: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  interactions, 
  anniversaryDate,
  defaultRows = 5,
  onAddInteraction, 
  onUpdateInteraction, 
  onDeleteInteraction,
  onOpenSpreadsheet,
  cardScale = 1.0,
  layoutMode: initialLayoutMode = 'vertical',
  zoomLevel: initialZoomLevel = 0,
  thumbnailHeight = 150,
  onOpenSettings,
  onUpdateConfig,
  showImageModal: externalShowImageModal,
  onSetShowImageModal: externalSetShowImageModal,
  modalImageIndex: externalModalImageIndex,
  onSetModalImageIndex: externalSetModalImageIndex
}) => {
  const [layoutMode, setLayoutMode] = useState(initialLayoutMode);
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (containerRef.current) {
      const updateWidth = () => {
        setContainerWidth(containerRef.current?.offsetWidth || 800);
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  const handleLayoutModeChange = (newMode: 'vertical' | 'wave' | 'snake') => {
    setLayoutMode(newMode);
    onUpdateConfig?.({ layoutMode: newMode });
  };

  const handleZoomLevelChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    onUpdateConfig?.({ zoomLevel: newZoom });
  };

  useEffect(() => setLayoutMode(initialLayoutMode), [initialLayoutMode]);
  useEffect(() => setZoomLevel(initialZoomLevel), [initialZoomLevel]);

  const ZOOM_LEVELS = [1, 5, 10, 30, 60, 100, 200, 500];
  const effectiveZoom = ZOOM_LEVELS[zoomLevel] || 1;

  const [activeItem, setActiveItem] = useState<Interaction | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Use external modal state if provided, otherwise use internal state
  const showImageModal = externalShowImageModal ?? false;
  const setShowImageModal = externalSetShowImageModal ?? (() => {});
  const modalImageIndex = externalModalImageIndex ?? 0;
  const setModalImageIndex = externalSetModalImageIndex ?? (() => {});

  // Add keyboard navigation for image carousel and modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewingImage) {
        if (e.key === 'ArrowLeft') {
          handlePreviousImage();
        } else if (e.key === 'ArrowRight') {
          handleNextImage();
        } else if (e.key === 'Escape') {
          setViewingImage(null);
        }
      } else if (showImageModal) {
        if (e.key === 'ArrowLeft') {
          handleModalPreviousImage();
        } else if (e.key === 'ArrowRight') {
          handleModalNextImage();
        } else if (e.key === 'Escape') {
          setShowImageModal(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingImage, currentImageIndex, showImageModal, modalImageIndex]);

  // Handle custom events from homepage
  useEffect(() => {
    const handleOpenCarouselFromHome = (event: any) => {
      const { imageUrl } = event.detail;
      handleImageClick(imageUrl);
    };

    window.addEventListener('openTimelineCarouselFromHome', handleOpenCarouselFromHome);

    return () => {
      window.removeEventListener('openTimelineCarouselFromHome', handleOpenCarouselFromHome);
    };
  }, []);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  
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
    // Handle gallery mode - return empty layout since gallery view is handled separately
    if (layoutMode === 'gallery') {
      return { items: [], height: 0, path: '', nowY: -1, centerX: 0, nowX: -1, snakeMode: false };
    }

    if (allInteractions.length === 0) return { items: [], height: 0, path: '', nowY: -1, centerX: 0, nowX: -1, snakeMode: false };

    const sorted = [...allInteractions];
    const startDate = sorted[0].timestamp;
    const endDate = sorted[sorted.length - 1].timestamp; // Ensure we cover the full range
    const startTime = startDate.getTime();

    // --- VERTICAL MODE CALCULATION ---
    if (layoutMode === 'vertical') {
        const rowHeight = effectiveZoom === 1 ? 150 : effectiveZoom === 5 ? 250 : effectiveZoom === 10 ? 400 : 800; // Adjusted based on zoom
        const centerX = containerWidth / 2;
        
        // Ensure centerX is used correctly even on mobile
        const itemsWithPos = sorted.map((item, index) => {
             const isRightSide = index % 2 === 0;
             return {
                ...item,
                x: centerX,
                y: 100 + index * rowHeight,
                isRightSide, 
                isFuture: item.timestamp.getTime() > Date.now(),
                rotation: 0
             };
        });
        
        return { 
           items: itemsWithPos, 
           height: itemsWithPos.length * rowHeight + 200, 
           path: `M ${centerX} 0 L ${centerX} ${itemsWithPos.length * rowHeight + 200}`, 
           centerX, 
           nowY: -1, 
           snakeMode: false 
        };
    }

    // --- SNAKE MODE CALCULATION ---
    if (layoutMode === 'snake') {
        const startYear = startDate.getFullYear();
        // Ensure endYear covers current year for "Today" marker
        const endYear = Math.max(new Date().getFullYear(), endDate.getFullYear());
        const totalRows = endYear - startYear + 1;
        const rowHeight = effectiveZoom === 1 ? 180 : effectiveZoom === 5 ? 300 : effectiveZoom === 10 ? 500 : effectiveZoom === 30 ? 1000 : effectiveZoom === 60 ? 2000 : effectiveZoom === 100 ? 3500 : effectiveZoom === 200 ? 7000 : 15000;
        const localContainerWidth = containerWidth || Math.min(windowWidth, 800); 
        const sidePad = windowWidth < 640 ? 15 : (effectiveZoom === 1 ? 160 : effectiveZoom === 5 ? 100 : effectiveZoom === 10 ? 60 : 40);
        const activeWidth = localContainerWidth - (sidePad * 2);
        
        let pathD = '';
        const itemsWithPos: any[] = [];
        
        // Generate Path & Place Items
        for (let i = 0; i < totalRows; i++) {
           const currentYear = startYear + i;
           const isEven = i % 2 === 0;
           const rowY = i * rowHeight + 100; // Start with some padding
           
           // Path Points
           const startX = isEven ? sidePad : localContainerWidth - sidePad;
           const endX = isEven ? localContainerWidth - sidePad : sidePad;
           
           if (i === 0) pathD += `M ${startX} ${rowY}`;
           
           // Line across the year
           pathD += ` L ${endX} ${rowY}`;
           
           // Connector to next row (if not last)
             if (i < totalRows - 1) {
               const nextRowY = rowY + rowHeight;
               const cp1x = isEven ? localContainerWidth : 0;
               const cp1y = rowY;
               const cp2x = isEven ? localContainerWidth : 0;
               const cp2y = nextRowY;
               pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${nextRowY}`;
             }

           // Place items for this year only
           const yearItems = sorted.filter(item => item.timestamp.getFullYear() === currentYear);
           const yearStart = new Date(currentYear, 0, 1).getTime();
           const yearEnd = new Date(currentYear + 1, 0, 1).getTime();
           const yearDuration = yearEnd - yearStart;

           yearItems.forEach((item, index) => {
              const progress = (item.timestamp.getTime() - yearStart) / yearDuration;
              const visualProgress = progress; 
              
              const x = isEven 
                ? sidePad + (visualProgress * activeWidth)
                : (localContainerWidth - sidePad) - (visualProgress * activeWidth);
                
              // Staggering: Offset Y slightly if items are tight
              const staggerY = yearItems.length > 1 ? (index % 2 === 0 ? -30 : 30) : 0;
                
              itemsWithPos.push({
                 ...item,
                 x,
                 y: rowY + staggerY,
                 isRightSide: !isEven, 
                 isEvenRow: isEven,
                 isFuture: item.timestamp.getTime() > Date.now(),
                 rotation: (index % 3 - 1) * 2 // -2, 0, 2
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
                : (localContainerWidth - sidePad) - (progress * activeWidth);
        }

        return { items: itemsWithPos, height: totalRows * rowHeight + 200, path: pathD, centerX: localContainerWidth/2, nowY, nowX, snakeMode: true };
    }

    // --- WAVE MODE CALCULATION ---
    const pxPerYear = effectiveZoom === 1 ? 150 : effectiveZoom === 5 ? 300 : effectiveZoom === 10 ? 600 : effectiveZoom === 30 ? 1500 : effectiveZoom === 60 ? 3000 : effectiveZoom === 100 ? 6000 : effectiveZoom === 200 ? 12000 : 30000; 
    const pxPerMs = pxPerYear / (365 * 24 * 60 * 60 * 1000);
    
    // Check total height required
    const duration = endDate.getTime() - startTime;
    const totalHeight = Math.max(600, duration * pxPerMs + 200);

    // Curve Parameters
    // Curve Parameters
    const localContainerWidth = containerWidth || Math.min(windowWidth, 1200);
    const centerX = localContainerWidth / 2; 
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
      
      const isFuture = item.timestamp.getTime() > nowTime;

      // Enhanced Staggering for anti-overlap
      let staggerX = 0;
      let sideOffset = 0;
      
      // Force alternating sides if very close
      const isRightSide = index % 2 === 0;

      if (index > 0) {
        const prevY = 50 + (sorted[index-1].timestamp.getTime() - startTime) * pxPerMs;
        if (y - prevY < 120) { // If closer than 120px vertically
           staggerX = (index % 3 - 1) * 30; // -30, 0, 30
           sideOffset = isRightSide ? 40 : -40;
        }
      }

      return {
        ...item,
        x: x + staggerX + sideOffset,
        y,
        isRightSide,
        isFuture,
        rotation: (index % 4 - 2) * 2 // Jitter
      };
    });

    return { items: itemsWithPos, height: totalHeight, path: pathData, centerX, nowY, snakeMode: false };
  }, [allInteractions, effectiveZoom, containerWidth, layoutMode]);


  const handleEditClick = (item: Interaction) => {
    if (!item.id.startsWith('anniv-')) {
      setActiveItem({ 
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
      });
      setIsNew(false);
    }
  };

  // Get all images from all interactions
  const getAllImages = () => {
    const allImages: { url: string; interactionId: string; interactionTitle: string }[] = [];
    interactions.forEach(interaction => {
      if (interaction.media) {
        // Handle single media or media array
        const mediaItems = Array.isArray(interaction.media) ? interaction.media : [interaction.media];
        mediaItems.forEach((media: any) => {
          if (media.type === 'image') {
            allImages.push({
              url: media.url,
              interactionId: interaction.id,
              interactionTitle: (interaction as any).message || 'Untitled'
            });
          }
        });
      }
    });
    return allImages;
  };

  // Handle image click to open carousel
  const handleImageClick = (imageUrl: string) => {
    const allImages = getAllImages();
    const imageIndex = allImages.findIndex(img => img.url === imageUrl);
    setModalImageIndex(imageIndex >= 0 ? imageIndex : 0);
    setShowImageModal(true);
  };

  // Navigate to previous image
  const handlePreviousImage = () => {
    const allImages = getAllImages();
    if (allImages.length === 0) return;
    
    const newIndex = currentImageIndex === 0 ? allImages.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(newIndex);
    setViewingImage(allImages[newIndex].url);
  };

  // Navigate to next image
  const handleNextImage = () => {
    const allImages = getAllImages();
    if (allImages.length === 0) return;
    
    const newIndex = (currentImageIndex + 1) % allImages.length;
    setCurrentImageIndex(newIndex);
    setViewingImage(allImages[newIndex].url);
  };

  // Navigate to previous image in modal
  const handleModalPreviousImage = () => {
    const allImages = getAllImages();
    if (allImages.length === 0) return;
    
    const newIndex = modalImageIndex === 0 ? allImages.length - 1 : modalImageIndex - 1;
    setModalImageIndex(newIndex);
  };

  // Navigate to next image in modal
  const handleModalNextImage = () => {
    const allImages = getAllImages();
    if (allImages.length === 0) return;
    
    const newIndex = modalImageIndex === allImages.length - 1 ? 0 : modalImageIndex + 1;
    setModalImageIndex(newIndex);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
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
      <div className="fixed top-28 right-4 lg:right-10 flex flex-col gap-4 items-end pointer-events-none"
         style={{ zIndex: 'var(--z-index-fixed)' }}>
         
          <div className="pointer-events-auto flex flex-col gap-2 items-end">
              <div className="flex flex-col gap-2 mb-2 p-1 bg-white/50 backdrop-blur-sm rounded-full">
                  <button 
                     onClick={() => {
                        const modes: ('vertical' | 'wave' | 'snake' | 'gallery')[] = ['vertical', 'wave', 'snake', 'gallery'];
                        const next = modes[(modes.indexOf(layoutMode) + 1) % 4];
                        handleLayoutModeChange(next);
                     }}
                     className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-purple-500 hover:bg-purple-50 transition-all border border-purple-100"
                     title={`Switch View: ${layoutMode}`}
                  >
                     <i className={`fas ${layoutMode === 'vertical' ? 'fa-stream' : layoutMode === 'wave' ? 'fa-water' : layoutMode === 'snake' ? 'fa-route' : 'fa-images'}`}></i>
                  </button>
              </div>

              <button 
                  onClick={() => onOpenSpreadsheet?.()}
                  className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-pink-500 hover:bg-pink-50 transition-all border border-pink-100"
                  title="Open Spreadsheet (Bulk Edit)"
              >
                  <i className="fas fa-table"></i>
              </button>
              {onOpenSettings && (
                <button 
                    onClick={() => onOpenSettings()}
                    className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all border border-gray-100"
                    title="Timeline Settings"
                >
                    <i className="fas fa-cog"></i>
                </button>
              )}
          </div>
         
          <button 
             onClick={handleAddNew}
             className="pointer-events-auto w-10 h-10 md:w-12 md:h-12 bg-pink-500 text-white rounded-full shadow-xl shadow-pink-200 flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all group relative"
          >
           <i className="fas fa-plus text-lg"></i>
           <span className="absolute right-14 bg-black/80 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Add Memory or Plan</span>
         </button>
      </div>

      {/* Timeline Header Section - Only for non-gallery modes */}
      {layoutMode !== 'gallery' && (
        <div className="text-center mb-8 md:mb-16 pt-4 md:pt-0">
          <h2 className="font-pacifico text-2xl md:text-4xl text-pink-500 mb-2">Our Story</h2>
          <p className="text-[10px] md:text-base text-gray-500 font-quicksand max-w-xs md:max-w-md mx-auto px-4">Reliving every beautiful moment together ✨</p>
        </div>
      )}

      {/* Gallery Header Section - Only for gallery mode */}
      {layoutMode === 'gallery' && (
        <div className="text-center mb-8 md:mb-16 pt-4 md:pt-0">
          <h2 className="font-pacifico text-2xl md:text-4xl text-pink-500 mb-2">Our Story</h2>
          <p className="text-[10px] md:text-base text-gray-500 font-quicksand max-w-xs md:max-w-md mx-auto px-4">Reliving every beautiful moment together ✨</p>
        </div>
      )}

      {/* WAVE / SNAKE / GALLERY VIEW */}
      <div className="w-full flex justify-center pt-5 pb-40 relative" ref={containerRef}>
        {/* Subtle Stage Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 md:w-96 h-32 bg-gradient-to-b from-pink-50/50 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>
        
        <div style={{ height: layoutMode === 'gallery' ? 'auto' : timelineLayout.height, width: '100%', maxWidth: windowWidth < 640 ? '100%' : '1200px', position: 'relative' }}>
          
          {/* GALLERY CONTENT */}
          {layoutMode === 'gallery' && (
            <TimelineImages interactions={interactions} className="max-w-6xl mx-auto" />
          )}
          
          {/* TIMELINE CONTENT */}
          {layoutMode !== 'gallery' && (
            <>
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
                    strokeLinecap="round"
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
                             className="absolute font-black text-pink-500/10 md:text-pink-500/30 select-none font-pacifico z-0"
                             style={{ 
                               top: timelineLayout.snakeMode ? item.y - 40 : item.y - 60, 
                               left: timelineLayout.snakeMode ? (item.isEvenRow ? 20 : 'auto') : (item.isRightSide ? item.x - 200 : item.x + 50),
                               right: timelineLayout.snakeMode ? (!item.isEvenRow ? 20 : 'auto') : 'auto',
                               transform: timelineLayout.snakeMode ? 'none' : 'translateX(-50%)',
                               fontSize: windowWidth < 640 ? '2.5rem' : (timelineLayout.snakeMode ? '4rem' : '5rem')
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
                           className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 w-max max-w-[140px] md:max-w-[200px] group cursor-pointer z-30 ${
                             timelineLayout.snakeMode 
                               ? 'flex-col -translate-y-[calc(100%+20px)]' 
                               : (item.isRightSide ? 'flex-row left-5 md:left-10' : 'flex-row-reverse right-5 md:right-10')
                           }`}
                           onClick={(e) => {
                           // Check if the click target is an image
                           const isImageClick = (e.target as HTMLElement).closest('img') || 
                                             (e.target as HTMLElement).closest('[data-image-container]');
                           if (isImageClick) {
                             // Let the image click handler handle this
                             return;
                           }
                           handleEditClick(item);
                         }}
                         >
                            {/* Connecting Line */}
                            <div className={`absolute ${
                              timelineLayout.snakeMode
                                ? 'w-[2px] h-5 bg-pink-200 -bottom-5 left-1/2 -translate-x-1/2'
                                : `h-[2px] w-5 md:w-10 top-1/2 -translate-y-1/2 ${item.isFuture ? 'bg-purple-200' : 'bg-pink-200'} ${item.isRightSide ? '-left-5 md:-left-10' : '-right-5 md:-right-10'}`
                            }`} />

                              <div 
                                className={`relative group transition-transform ${item.mediaItems && item.mediaItems.filter((mi: MediaContent) => mi.type === 'image').length > 1 ? 'hover:scale-105' : ''}`}
                                style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                              >
                                {/* Background Frames for "Stacked" Effect */}
                                {(() => {
                                   const imagesCount = item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image').length || 0;
                                   if (imagesCount <= 1) return null;
                                   return (
                                     <>
                                        <div className="absolute inset-0 bg-white border border-gray-100 shadow-sm -rotate-6 -translate-x-1.5 translate-y-1 rounded-sm opacity-60"></div>
                                        <div className="absolute inset-0 bg-white border border-gray-100 shadow-sm rotate-3 translate-x-1 translate-y-0.5 rounded-sm opacity-40"></div>
                                     </>
                                   );
                                })()}

                                <div 
                                   className="relative bg-white p-1.5 md:p-2 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 hover:shadow-2xl hover:-translate-y-2 hover:rotate-2 transition-all duration-300 text-center self-center"
                                   style={{ 
                                       transform: `scale(${cardScale})`, 
                                       transformOrigin: 'center',
                                       width: (item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image').length || (item.media?.type === 'image' ? 1 : 0)) > 0 
                                           ? `${thumbnailHeight + (windowWidth < 640 ? 12 : 16)}px`
                                           : (windowWidth < 640 ? '96px' : '144px') // Fallback to w-24/w-36 equivalent
                                   }}
                                >
                                {/* Hero Image Section */}
                                <div 
                                   className={`w-full aspect-square relative overflow-hidden bg-gray-50 rounded-xs mb-2 ${
                                       (item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image').length || (item.media?.type === 'image' ? 1 : 0)) > 0 ? '' : 'h-0 mb-0'
                                   }`}
                                   style={{ 
                                       height: (item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image').length || (item.media?.type === 'image' ? 1 : 0)) > 0 
                                           ? `${thumbnailHeight}px` 
                                           : '0px'
                                   }}
                                >
                                   {/* IMAGE THUMBNAIL - POLAROID MAIN */}
                                    {(() => {
                                      const images = item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image') || (item.media?.type === 'image' ? [item.media] : []);
                                      if (images.length === 0) return null;
                                      
                                      return (
                                        <div className="w-full h-full group">
                                           <img 
                                              src={images[0].url} 
                                              alt="" 
                                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer" 
                                              loading="lazy"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleImageClick(images[0].url);
                                              }}
                                           />
                                           
                                           {images.length > 1 && (
                                             <div className="absolute top-1 right-1 bg-black/50 text-white text-[8px] py-0.5 px-1.5 rounded-sm backdrop-blur-sm">
                                                <i className="fas fa-images mr-1"></i> {images.length}
                                             </div>
                                           )}
                                        </div>
                                      );
                                    })()}
                                </div>

                                {/* Bottom Margin for Caption & Date */}
                                <div className="flex flex-col items-start px-1 pb-1">
                                   <p className="text-[7.5px] md:text-[10px] font-bold text-gray-800 leading-tight line-clamp-2 text-left w-full h-4 md:h-6">
                                     {item.text}
                                   </p>
                                   
                                   <div className="mt-2 w-full flex justify-between items-center border-t border-gray-50 pt-1.5">
                                      <div className="flex flex-col items-start">
                                         <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tighter ${
                                             item.isFuture ? 'text-purple-400' : 'text-gray-400'
                                         }`}>
                                            {getMonthName(item.timestamp)} {item.timestamp.getDate()}
                                         </span>
                                         {item.isFuture && (
                                            <span className="text-[7px] font-black text-purple-300 uppercase tracking-widest leading-none">PLAN</span>
                                         )}
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5">
                                         {item.location && <i className="fas fa-map-marker-alt text-[8px] text-pink-300"></i>}
                                         {((item.mediaItems?.length || 0) > 0 || !!item.media) && (
                                            <i className={`fas ${
                                               (item.mediaItems?.filter((mi: MediaContent) => mi.type === 'video').length > 0 || item.media?.type === 'video')
                                                 ? 'fa-video text-blue-300' 
                                                 : 'fa-camera text-pink-300'
                                            } text-[8px]`}></i>
                                         )}
                                      </div>
                                   </div>
                                </div>
                           </div>
                       </div>
                     </div>
                     </motion.div>
                 </React.Fragment>
               );
            })}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
      
      {/* View Mode: Timeline or Gallery */}
      {layoutMode === 'gallery' ? (
        <></>
      ) : (
        <></>
      )}

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
              className={`bg-white w-full ${windowWidth < 768 ? 'rounded-t-3xl h-[85vh]' : 'max-w-md rounded-3xl max-h-[90vh]'} shadow-2xl overflow-hidden flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-6 text-white flex justify-between items-center shrink-0 transition-colors ${
                isFutureDate ? 'bg-purple-500' : 'bg-pink-500'
              } ${windowWidth < 768 ? 'rounded-t-3xl' : ''}`}>
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
                 <div className="bg-gray-50/50 rounded-2xl p-6 border-2 border-gray-100 flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${isFutureDate ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
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
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Location</label>
                   <div className="relative">
                     <i className={`fas fa-map-pin absolute left-4 top-1/2 -translate-y-1/2 ${isFutureDate ? 'text-purple-400' : 'text-pink-400'}`}></i>
                      <input 
                        type="text" 
                        value={activeItem.location || ""} 
                        onChange={(e) => setActiveItem({ ...activeItem!, location: e.target.value })}
                       className={`w-full border-2 rounded-xl p-4 pl-10 text-sm font-bold text-gray-700 outline-none transition-all bg-gray-50/50 ${
                         isFutureDate ? 'border-purple-50 focus:ring-purple-300' : 'border-pink-50 focus:ring-pink-300'
                       }`}
                       placeholder="Where did it happen?"
                     />
                   </div>
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
                                className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-50 shadow-sm relative cursor-pointer hover:border-pink-300 transition-colors"
                                onClick={() => m.type === 'image' && handleImageClick(m.url)}
                              >
                                 {m.type === 'image' && <OptimizedImage src={m.url} className="w-full h-full object-cover" alt="Timeline media" />}
                                 {m.type === 'video' && <div className="w-full h-full flex flex-col items-center justify-center text-xs gap-1 text-gray-500"><i className="fas fa-video text-lg"></i> Video</div>}
                                 {m.type === 'audio' && <div className="w-full h-full flex flex-col items-center justify-center text-xs gap-1 text-gray-500"><i className="fas fa-microphone text-lg"></i> Audio</div>}
                              </div>
                              <button 
                                onClick={() => removeMedia(idx)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-md hover:scale-110 transition-transform z-10"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                           </div>
                        ))}
                        
                        {/* Add Button */}
                        <button
                           onClick={() => setIsAddMediaOpen(true)}
                           className={`w-20 h-20 shrink-0 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                              isFutureDate 
                                 ? 'border-purple-200 bg-purple-50 text-purple-400 hover:bg-purple-100' 
                                 : 'border-pink-200 bg-pink-50 text-pink-400 hover:bg-pink-100'
                           }`}
                        >
                           <i className="fas fa-plus text-xl"></i>
                           <span className="text-[9px] font-black uppercase">Add</span>
                        </button>
                    </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                      {isFutureDate ? 'The Plan' : 'The Story'}
                   </label>
                      <textarea 
                        value={activeItem.text || ""} 
                        onChange={(e) => setActiveItem({ ...activeItem!, text: e.target.value })}
                     className={`w-full h-32 border-2 rounded-xl p-4 text-sm font-bold text-gray-700 outline-none resize-none transition-all bg-gray-50/50 ${
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
                       className="flex-1 py-4 bg-red-50 text-red-500 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors"
                     >
                       Delete
                     </button>
                   )}
                   <button 
                     onClick={handleSave}
                     disabled={!activeItem.text.trim()}
                     className={`flex-[2] py-4 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 disabled:grayscale ${
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
