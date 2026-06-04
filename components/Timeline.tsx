"use client";

import * as React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interaction, MediaContent } from '../types';
import OptimizedImage from './OptimizedImage';
import LocationPicker from './LocationPicker';
import TimelineImages from './TimelineImages';
import GlobalImageModal from './GlobalImageModal';

interface TimelineProps {
  interactions: Interaction[];
  anniversaryDate?: string;
  defaultRows?: number;
  onAddInteraction?: (interaction: Interaction) => void;
  onUpdateInteraction?: (interaction: Interaction) => void;
  onDeleteInteraction?: (id: string) => void;
  onOpenSpreadsheet?: () => void;

  cardScale?: number;
  layoutMode?: 'vertical' | 'wave' | 'gallery';
  zoomLevel?: number; // 0-7 index
  thumbnailHeight?: number;
  onUpdateConfig?: (config: { layoutMode?: 'vertical' | 'wave' | 'gallery', zoomLevel?: number }) => void;
  
  // Image modal props
  showImageModal?: boolean;
  onSetShowImageModal?: (show: boolean) => void;
  modalImageIndex?: number;
  onSetModalImageIndex?: (index: number) => void;
  modalInteractionId?: string | null;
  onSetModalInteractionId?: (id: string | null) => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  interactions, 
  anniversaryDate,
  onAddInteraction, 
  onUpdateInteraction, 
  onDeleteInteraction,
  onOpenSpreadsheet,
  cardScale = 1.0,
  layoutMode: initialLayoutMode = 'vertical',
  zoomLevel: initialZoomLevel = 0,
  thumbnailHeight = 150,
  onUpdateConfig,
  showImageModal: externalShowImageModal,
  onSetShowImageModal: externalSetShowImageModal,
  modalImageIndex: externalModalImageIndex,
  onSetModalImageIndex: externalSetModalImageIndex,
  modalInteractionId: externalModalInteractionId,
  onSetModalInteractionId: externalSetModalInteractionId
}) => {
  const [layoutMode, setLayoutMode] = useState(initialLayoutMode);
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Touch gesture state for pinch-to-zoom
  const [touchStartDistance, setTouchStartDistance] = useState(0);

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      setTouchStartDistance(distance);
    }
  };

  // Handle touch move for pinch-to-zoom
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistance > 0) {
      e.preventDefault(); // Prevent default scroll behavior
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / touchStartDistance;
      
      // Calculate zoom level change based on scale
      const currentLevel = ZOOM_LEVELS.findIndex(z => z === effectiveZoom);
      let newLevel = currentLevel;
      
      // More sensitive scaling - adjust level based on scale
      if (scale > 1.1) { // Pinch out - zoom in
        newLevel = Math.min(currentLevel + Math.floor((scale - 1) * 2), ZOOM_LEVELS.length - 1);
      } else if (scale < 0.9) { // Pinch in - zoom out
        newLevel = Math.max(currentLevel - Math.floor((1 - scale) * 2), 0);
      }
      
      if (newLevel !== currentLevel && newLevel >= 0 && newLevel < ZOOM_LEVELS.length) {
        handleZoomLevelChange(ZOOM_LEVELS[newLevel]);
      }
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setTouchStartDistance(0);
  };

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

  const handleLayoutModeChange = (newMode: 'vertical' | 'wave' | 'gallery') => {
    setLayoutMode(newMode);
    onUpdateConfig?.({ layoutMode: newMode });
  };

  const handleZoomLevelChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    onUpdateConfig?.({ zoomLevel: newZoom });
  };

  useEffect(() => {
    setLayoutMode(initialLayoutMode);
  }, [initialLayoutMode]);
  useEffect(() => {
    setZoomLevel(initialZoomLevel);
  }, [initialZoomLevel]);

  const ZOOM_LEVELS = [1, 5, 10, 30, 60, 100, 200, 500];
  const effectiveZoom = ZOOM_LEVELS[zoomLevel] || 1;

  const [activeItem, setActiveItem] = useState<Interaction | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const [internalShowModal, setInternalShowModal] = useState(false);
  const [internalModalIndex, setInternalModalIndex] = useState(0);
  const [internalInteractionId, setInternalInteractionId] = useState<string | null>(null);
  const [timelineNow] = useState(() => Date.now());

  const showImageModal = externalShowImageModal ?? internalShowModal;
  const setShowImageModal = externalSetShowImageModal ?? setInternalShowModal;
  const modalImageIndex = externalModalImageIndex ?? internalModalIndex;
  const setModalImageIndex = externalSetModalImageIndex ?? setInternalModalIndex;
  const modalInteractionId = externalModalInteractionId ?? internalInteractionId;
  const setModalInteractionId = externalSetModalInteractionId ?? setInternalInteractionId;
  
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
      return { items: [], height: 0, path: '', nowY: -1, centerX: 0, nowX: -1 };
    }

    if (allInteractions.length === 0) return { items: [], height: 0, path: '', nowY: -1, centerX: 0, nowX: -1 };

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
                isFuture: item.timestamp.getTime() > timelineNow,
                rotation: 0
             };
        });
        
        return { 
           items: itemsWithPos, 
           height: itemsWithPos.length * rowHeight + 200, 
           path: `M ${centerX} 0 L ${centerX} ${itemsWithPos.length * rowHeight + 200}`, 
           centerX, 
           nowY: -1 
        };
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

    return { items: itemsWithPos, height: totalHeight, path: pathData, centerX, nowY };
  }, [allInteractions, effectiveZoom, containerWidth, layoutMode, timelineNow, windowWidth]);


  const handleEditClick = (item: Interaction) => {
    if (!item.id.startsWith('anniv-')) {
      setActiveItem({ 
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
      });
      setIsNew(false);
    }
  };

  // Get all images from a specific interaction
  const getImagesForInteraction = React.useCallback((interactionId?: string | null) => {
    const allImages: { url: string; interactionId: string; interactionTitle: string }[] = [];
    interactions
      .filter(i => !interactionId || i.id === interactionId)
      .forEach(interaction => {
        const title = interaction.text || 'Untitled';
        // Prefer mediaItems array (multi-media format) over legacy single media
        if (interaction.mediaItems && interaction.mediaItems.length > 0) {
          interaction.mediaItems.forEach((media: MediaContent) => {
            if (media.type === 'image') {
              allImages.push({ url: media.url, interactionId: interaction.id, interactionTitle: title });
            }
          });
        } else if (interaction.media) {
          const items = [interaction.media];
          items.forEach((media: MediaContent) => {
            if (media.type === 'image') {
              allImages.push({ url: media.url, interactionId: interaction.id, interactionTitle: title });
            }
          });
        }
      });
    return allImages;
  }, [interactions]);

  // Handle image click to open carousel
  const handleImageClick = React.useCallback((imageUrl: string) => {
    // Find interaction id first
    const interaction = interactions.find(i => {
      const mediaItems = Array.isArray(i.mediaItems) ? i.mediaItems : (i.media ? [i.media] : []);
      return mediaItems.some((m: MediaContent) => m.url === imageUrl);
    });

    const targetInteractionId = interaction?.id || null;
    setModalInteractionId(targetInteractionId);

    const images = getImagesForInteraction(targetInteractionId);
    const imageIndex = images.findIndex(img => img.url === imageUrl);
    
    setModalImageIndex(imageIndex >= 0 ? imageIndex : 0);
    setShowImageModal(true);
  }, [getImagesForInteraction, interactions, setModalImageIndex, setModalInteractionId, setShowImageModal]);

  // Handle custom events from homepage
  useEffect(() => {
    const handleOpenCarouselFromHome = (event: Event) => {
      const { imageUrl } = (event as CustomEvent<{ imageUrl?: string }>).detail || {};
      if (imageUrl) handleImageClick(imageUrl);
    };

    window.addEventListener('openTimelineCarouselFromHome', handleOpenCarouselFromHome);

    return () => {
      window.removeEventListener('openTimelineCarouselFromHome', handleOpenCarouselFromHome);
    };
  }, [handleImageClick]);

  // Navigate to previous image in modal
  const handleModalPreviousImage = React.useCallback(() => {
    const images = getImagesForInteraction(modalInteractionId);
    if (images.length === 0) return;
    
    const newIndex = modalImageIndex === 0 ? images.length - 1 : modalImageIndex - 1;
    setModalImageIndex(newIndex);
  }, [getImagesForInteraction, modalImageIndex, modalInteractionId, setModalImageIndex]);

  // Navigate to next image in modal
  const handleModalNextImage = React.useCallback(() => {
    const images = getImagesForInteraction(modalInteractionId);
    if (images.length === 0) return;
    
    const newIndex = modalImageIndex === images.length - 1 ? 0 : modalImageIndex + 1;
    setModalImageIndex(newIndex);
  }, [getImagesForInteraction, modalImageIndex, modalInteractionId, setModalImageIndex]);

  // Add keyboard navigation for image carousel and modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showImageModal) return;

      if (e.key === 'ArrowLeft') {
        handleModalPreviousImage();
      } else if (e.key === 'ArrowRight') {
        handleModalNextImage();
      } else if (e.key === 'Escape') {
        setShowImageModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleModalNextImage, handleModalPreviousImage, setShowImageModal, showImageModal]);

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

  const handleSave = () => {
    if (!activeItem || !activeItem.text.trim()) return;
    if (isNew) {
      onAddInteraction?.(activeItem);
    } else {
      onUpdateInteraction?.(activeItem);
    }
    setActiveItem(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && activeItem) {
      const newItems: MediaContent[] = Array.from(files).map(file => ({
        type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image',
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
                        const modes: ('vertical' | 'wave' | 'gallery')[] = ['vertical', 'wave', 'gallery'];
                        const next = modes[(modes.indexOf(layoutMode) + 1) % 3];
                        handleLayoutModeChange(next);
                     }}
                     className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-purple-500 hover:bg-purple-50 transition-all border border-purple-100"
                     title={`Switch View: ${layoutMode}`}
                  >
                     <i className={`fas ${layoutMode === 'vertical' ? 'fa-stream' : layoutMode === 'wave' ? 'fa-water' : 'fa-images'}`}></i>
                  </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex flex-col gap-2 mb-2 p-1 bg-white/50 backdrop-blur-sm rounded-full">
                  <button 
                     onClick={() => {
                        // Zoom in logic using proper zoom system
                        const currentLevel = ZOOM_LEVELS.findIndex(z => z === effectiveZoom);
                        const newLevel = Math.min(currentLevel + 1, ZOOM_LEVELS.length - 1);
                        handleZoomLevelChange(ZOOM_LEVELS[newLevel]);
                     }}
                     className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-all border border-blue-100"
                     title="Zoom In"
                  >
                     <i className="fas fa-search-plus"></i>
                  </button>
                  <button 
                     onClick={() => {
                        // Zoom out logic using proper zoom system
                        const currentLevel = ZOOM_LEVELS.findIndex(z => z === effectiveZoom);
                        const newLevel = Math.max(currentLevel - 1, 0);
                        handleZoomLevelChange(ZOOM_LEVELS[newLevel]);
                     }}
                     className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-all border border-blue-100"
                     title="Zoom Out"
                  >
                     <i className="fas fa-search-minus"></i>
                  </button>
              </div>

              <button 
                  onClick={() => onOpenSpreadsheet?.()}
                  className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-pink-500 hover:bg-pink-50 transition-all border border-pink-100"
                  title="Open Spreadsheet (Bulk Edit)"
              >
                  <i className="fas fa-table"></i>
              </button>
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
      <div 
        className="w-full flex justify-center pt-5 pb-40 relative" 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle Stage Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 md:w-96 h-32 bg-gradient-to-b from-pink-50/50 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>
        
        <div ref={containerRef} style={{ height: layoutMode === 'gallery' ? 'auto' : timelineLayout.height, width: '100%', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          
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
                    strokeWidth={2}
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
                      left: '50%',
                      width: '100%',
                      transform: 'translateY(0)' 
                   }}
                 >
                   <div className="h-px bg-pink-500/50 w-full max-w-md absolute border-t border-dashed border-pink-400"></div>
                   <div className="bg-pink-500 text-white text-[10px] font-black px-3 py-1 rounded-full relative z-10 shadow-sm uppercase tracking-widest">
                      Today
                   </div>
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
                               top: item.y - 60, 
                               left: item.isRightSide ? item.x - 200 : item.x + 50,
                               right: 'auto',
                               transform: 'translateX(-50%)',
                               fontSize: windowWidth < 640 ? '2.5rem' : '5rem'
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
                              item.isRightSide ? 'flex-row left-5 md:left-10' : 'flex-row-reverse right-5 md:right-10'
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
                            <div className={`absolute h-[2px] w-5 md:w-10 top-1/2 -translate-y-1/2 ${item.isFuture ? 'bg-purple-200' : 'bg-pink-200'} ${item.isRightSide ? '-left-5 md:-left-10' : '-right-5 md:-right-10'}`} />

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
                                           <OptimizedImage 
                                              src={images[0].url} 
                                              alt="Timeline memory media" 
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
                                                ((item.mediaItems?.filter((mi: MediaContent) => mi.type === 'video')?.length || 0) > 0 || item.media?.type === 'video')
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
                              onChange={handleFileChange}
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
                     onClick={handleSave}
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

      <GlobalImageModal
        show={showImageModal}
        onClose={() => setShowImageModal(false)}
        interactions={getImagesForInteraction(modalInteractionId).map(img => ({
           id: img.interactionId,
           text: img.interactionTitle,
           timestamp: new Date(),
           type: 'system',
           media: { type: 'image', url: img.url }
        }) as Interaction)}
        currentIndex={modalImageIndex}
        onPrevious={handleModalPreviousImage}
        onNext={handleModalNextImage}
      />
    </div>
  );
};

export default Timeline;

