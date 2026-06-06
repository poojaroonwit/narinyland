"use client";

import * as React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interaction, MediaContent } from '../types';
import TimelineImages from './TimelineImages';
import GlobalImageModal from './GlobalImageModal';
import { TimelineEditorModal } from './timeline/TimelineEditorModal';
import { TimelineEmptyState } from './timeline/TimelineEmptyState';
import { TimelineEventMarker } from './timeline/TimelineEventMarker';
import { ZOOM_LEVELS, buildTimelineInteractions, calculateTimelineLayout } from './timeline/helpers';

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

  const allInteractions = useMemo(() => buildTimelineInteractions(interactions, anniversaryDate), [interactions, anniversaryDate]);

  const timelineLayout = useMemo(() => calculateTimelineLayout({
    allInteractions,
    effectiveZoom,
    containerWidth,
    layoutMode,
    timelineNow,
    windowWidth,
  }), [allInteractions, effectiveZoom, containerWidth, layoutMode, timelineNow, windowWidth]);


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
    return <TimelineEmptyState onAddNew={handleAddNew} />;
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
                {timelineLayout.items.map((item, i) => (
                  <TimelineEventMarker
                    key={item.id}
                    item={item}
                    index={i}
                    prevItem={timelineLayout.items[i - 1]}
                    windowWidth={windowWidth}
                    cardScale={cardScale}
                    thumbnailHeight={thumbnailHeight}
                    onEdit={handleEditClick}
                    onImageClick={handleImageClick}
                  />
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
      
      <TimelineEditorModal
        activeItem={activeItem}
        isNew={isNew}
        isFutureDate={!!isFutureDate}
        windowWidth={windowWidth}
        setActiveItem={setActiveItem}
        onDeleteInteraction={onDeleteInteraction}
        onSave={handleSave}
        onFileChange={handleFileChange}
        onRemoveMedia={removeMedia}
        onImageClick={handleImageClick}
      />

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

