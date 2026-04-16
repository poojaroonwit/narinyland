"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MemoryItem, Interaction } from '../types';
import OptimizedImage from './OptimizedImage';

interface MemoryFrameProps {
  isVisible: boolean;
  items: MemoryItem[];
  albums?: Array<{ id: string; name: string }>; // Added albums prop
  style?: string; // 'polaroid' | 'carousel'
  source?: 'manual' | 'instagram';
  username?: string;
  viewMode: 'all' | 'public' | 'private';
  onViewModeChange: (mode: 'all' | 'public' | 'private') => void;
  variant?: 'default' | 'sky';
  timelineItems?: Interaction[]; // New prop for timeline items
  includeTimelineInGallery?: boolean; // New prop to control inclusion
}

const MemoryFrame: React.FC<MemoryFrameProps> = ({ 
  isVisible, 
  items, 
  albums = [], 
  style = 'polaroid', 
  source = 'manual', 
  username,
  viewMode,
  onViewModeChange,
  variant = 'default',
  timelineItems = [],
  includeTimelineInGallery = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null); // New state for filtering
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Helper to get the display URL — Instagram post URLs go through our server proxy
  const getDisplayUrl = (url: string) => {
    if (!url) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Crect width='600' height='600' fill='%23f9fafb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
    // If it's an Instagram post URL, proxy through our backend to get the actual image
    if (/instagram\.com\/(p|reel|tv)\//.test(url)) {
      return `/api/instagram/image?url=${encodeURIComponent(url)}`;
    }
    // If it's a relative API URL, convert to full URL
    if (url.startsWith('/api/')) {
      return `${window.location.origin}${url}`;
    }
    return url;
  };

  const isInstagramLink = (url: string) => url.includes('instagram.com') || url.includes('cdninstagram.com');

  // Convert timeline interactions to MemoryItem format
  const convertTimelineToMemoryItems = (timeline: Interaction[]): MemoryItem[] => {
    return timeline
      .filter(interaction => {
        // Handle both single media and media arrays
        const mediaItems = interaction.mediaItems || (interaction.media ? [interaction.media] : []);
        return mediaItems.some((media: any) => media.type === 'image');
      })
      .map((interaction, index) => {
        // Get the first image from the media items
        const mediaItems = interaction.mediaItems || (interaction.media ? [interaction.media] : []);
        const firstImage = mediaItems.find((media: any) => media.type === 'image');
        return {
          id: interaction.id,
          url: firstImage?.url || '',
          privacy: 'public' as 'public' | 'private', // Default to public for timeline images
          caption: interaction.text || `Memory ${index + 1}`
        };
      })
      .filter(item => item.url); // Filter out any items without valid image URLs
  };

  // Combine gallery items and timeline items
  const allItems = useMemo(() => {
    const galleryItems = items;
    const timelineMemoryItems = includeTimelineInGallery ? convertTimelineToMemoryItems(timelineItems) : [];
    return [...galleryItems, ...timelineMemoryItems];
  }, [items, timelineItems, includeTimelineInGallery]);

  const filteredItems = useMemo(() => {
    let result = allItems;
    if (viewMode !== 'all') {
      result = result.filter(item => item.privacy === viewMode);
    }
    if (selectedAlbumId) {
      result = result.filter(item => item.albumId === selectedAlbumId);
    }
    return result;
  }, [allItems, viewMode, selectedAlbumId]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [viewMode, selectedAlbumId]);

  useEffect(() => {
    if (isVisible && !isZoomed && style === 'polaroid' && filteredItems.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
      }, 4000); 
      return () => clearInterval(interval);
    }
  }, [isVisible, filteredItems.length, isZoomed, style]);

  useEffect(() => {
    if (isVisible && !isZoomed && style === 'carousel' && !isHovering && filteredItems.length > 0) {
      const interval = setInterval(() => {
        if (scrollContainerRef.current) {
           const nextIndex = (currentIndex + 1) % filteredItems.length;
           scrollToIndex(nextIndex);
        }
      }, 4000); 
      return () => clearInterval(interval);
    }
  }, [isVisible, isZoomed, style, isHovering, currentIndex, filteredItems.length]);

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
       const container = scrollContainerRef.current;
       const children = container.children;
       if (children[index]) {
         const child = children[index] as HTMLElement;
         const newLeft = child.offsetLeft - (container.clientWidth / 2) + (child.clientWidth / 2);
         container.scrollTo({ left: newLeft, behavior: 'smooth' });
       }
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current && style === 'carousel') {
      const container = scrollContainerRef.current;
      const center = container.scrollLeft + (container.clientWidth / 2);
      
      let closestIndex = 0;
      let minDistance = Infinity;

      Array.from(container.children).forEach((child, index) => {
        const c = child as HTMLElement;
        const childCenter = c.offsetLeft + (c.clientWidth / 2);
        const dist = Math.abs(center - childCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });
      
      if (closestIndex !== currentIndex) {
        setCurrentIndex(closestIndex);
      }
    }
  };

  const handleZoom = (img: string) => {
    setZoomedImage(getDisplayUrl(img));
    setIsZoomed(true);
  };

  /* Floating Animation Logic for Sky Variant */
  const floatingPositions = useMemo(() => {
    return filteredItems.map(() => ({
      top: `${5 + Math.random() * 40}%`, // Top 5-45% of screen
      left: `${5 + Math.random() * 90}%`, // 5-95% width
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
      scale: 0.5 + Math.random() * 0.5
    }));
  }, [filteredItems.length]); // Regenerate only when count changes

  // The original skyPos and its useEffect are no longer needed as each item will have its own random position and animation.
  // const [skyPos, setSkyPos] = useState({ top: '10%', left: '10%' });
  // useEffect(() => {
  //   if (variant === 'sky') {
  //     setSkyPos({
  //       top: `${5 + Math.random() * 30}%`,
  //       left: `${5 + Math.random() * 75}%`
  //     });
  //   }
  // }, [variant]);

  if (!isVisible) return null;

  if (variant === 'sky') {
    return (
      <>
        {/* Sky Container - Floating Scattered Images */}
        <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden h-[60vh]">
           {filteredItems.slice(0, 20).map((item, idx) => {
             const pos = floatingPositions[idx] || { top: '10%', left: '10%', duration: 10, delay: 0, scale: 1 };
             return (
               <motion.div
                 key={`${item.url}-${idx}`}
                 className="absolute w-28 h-28 md:w-32 md:h-32 pointer-events-auto cursor-zoom-in aspect-square"
                 style={{ top: pos.top, left: pos.left }}
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ 
                   opacity: 1, 
                   scale: pos.scale,
                   y: [0, -20, 0, 20, 0],
                   x: [0, 15, 0, -15, 0],
                   rotate: [0, 5, 0, -5, 0]
                 }}
                 transition={{ 
                   duration: pos.duration, 
                   delay: pos.delay,
                   repeat: Infinity, 
                   ease: "easeInOut" 
                 }}
                 onClick={() => handleZoom(item.url)}
                 whileHover={{ scale: 1.2, zIndex: 50, rotate: 0 }}
               >
                 <div className="w-full h-full p-3 bg-white/40 backdrop-blur-md rounded-md border-2 border-white/60 shadow-lg transform rotate-[-2deg] hover:rotate-0 transition-all duration-300 overflow-hidden flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center">
                      <OptimizedImage 
                        src={item.url} 
                        className="w-auto h-auto max-w-full max-h-full object-contain rounded-md"
                        alt={`Memory ${idx}`}
                        priority={idx < 3} // Prioritize first 3 images for sky variant
                        fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='112'%3E%3Crect width='112' height='112' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='10'%3EImage%3C/text%3E%3C/svg%3E"
                        width={112}
                        height={112}
                        onError={(e) => {
                          console.warn(`Failed to load image: ${item.url}`, e);
                        }}
                      />
                    </div>
                 </div>
               </motion.div>
             );
           })}
        </div>

        {/* Zoom Modal (Shared) */}
        <AnimatePresence>
          {isZoomed && zoomedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-black/98 backdrop-blur-xl p-6"
              onClick={() => setIsZoomed(false)}
            >
              <button className="absolute top-10 right-10 text-white text-6xl font-light hover:text-pink-400 transition-colors">&times;</button>
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                className="relative max-w-6xl max-h-[85vh] group"
                onClick={(e) => e.stopPropagation()}
              >
                <OptimizedImage 
                  src={zoomedImage} 
                  alt="Zoomed Memory" 
                  className="w-full h-full object-cover object-center rounded-md shadow-[0_0_100px_rgba(236,72,153,0.2)] border-4 border-white/10"
                  priority={true} // Prioritize zoomed images
                  fallback="https://images.unsplash.com/photo-1516589174184-c6848463ea2a?q=80&w=800&auto=format&fit=crop"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.div 
        className={'relative w-full max-w-4xl mx-auto px-4 z-10 flex flex-col items-center'}
      >
        <div className={'w-full flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6'}>
           <div className="flex flex-col">
              <h2 className={'text-3xl font-pacifico text-pink-500 drop-shadow-sm'}>Our Memories</h2>
              {(source === 'instagram' || (filteredItems[currentIndex] && isInstagramLink(filteredItems[currentIndex].url))) && (
                 <motion.div 
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="flex items-center gap-2 mt-2"
                 >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center text-white text-[9px] shadow-sm">
                       <i className="fab fa-instagram"></i>
                    </div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      {username ? `@${username}` : 'Instagram Feed'}
                    </span>
                 </motion.div>
              )}
           </div>

           <div className="flex flex-col gap-3">
              <div className={`flex bg-white/40 backdrop-blur-xl p-1.5 rounded-md shadow-inner border border-white self-center lg:self-end`}>
                 <button
                   onClick={() => onViewModeChange('all')}
                   className={`px-5 py-2 rounded-md text-[10px] font-black transition-all uppercase tracking-widest ${
                     viewMode === 'all' ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-400 hover:text-pink-500'
                   }`}
                 >
                   All
                 </button>
                 <button
                   onClick={() => onViewModeChange('public')}
                   className={`px-5 py-2 rounded-md text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-2 ${
                     viewMode === 'public' ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-400 hover:text-pink-500'
                   }`}
                 >
                   <i className="fas fa-globe"></i> World
                 </button>
                 <button
                   onClick={() => onViewModeChange('private')}
                   className={`px-5 py-2 rounded-md text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-2 ${
                     viewMode === 'private' ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-400 hover:text-pink-500'
                   }`}
                 >
                   <i className="fas fa-lock text-xs"></i> Us
                 </button>
              </div>

              {/* Album Selection Row */}
              {albums && albums.length > 0 && (
                <div className="flex gap-2 w-full justify-center md:justify-end overflow-x-auto no-scrollbar pt-2 pb-1 max-w-full">
                  <button
                    onClick={() => setSelectedAlbumId(null)}
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black border uppercase whitespace-nowrap transition-colors ${!selectedAlbumId ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'bg-white/80 text-pink-500 border-pink-200 hover:bg-pink-50'}`}
                  >
                    All Pictures
                  </button>
                  {albums.map((album) => (
                     <button
                       key={album.id}
                       onClick={() => setSelectedAlbumId(album.id)}
                       className={`px-4 py-1.5 rounded-full text-[9px] font-black border uppercase whitespace-nowrap transition-colors ${selectedAlbumId === album.id ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'bg-white/80 text-gray-500 border-gray-200 hover:border-pink-300 hover:text-pink-500'}`}
                     >
                       {album.name}
                     </button>
                  ))}
                </div>
              )}
           </div>
        </div>

        {filteredItems.length === 0 ? (
           <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full py-24 bg-white/40 backdrop-blur-md rounded-[3rem] border-4 border-dashed border-pink-200 flex flex-col items-center justify-center text-pink-300 shadow-sm"
           >
              <div className="text-7xl mb-4">🙊</div>
              <p className="font-pacifico text-2xl">No {viewMode} memories yet!</p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Add some in the settings!</p>
           </motion.div>
        ) : (
          <div className="w-full">
            {style === 'polaroid' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={'w-full max-w-[20rem] md:max-w-[24rem] lg:max-w-[28rem] xl:max-w-[32rem] mx-auto'}
              >
                <div className="relative bg-white p-2 pb-12 md:p-2.5 pb-14 lg:p-3 pb-16 xl:p-4 pb-20 shadow-[0_35px_80px_rgba(0,0,0,0.15)] border-[8px] md:border-[10px] lg:border-[12px] xl:border-[16px] border-white/90 rounded-md transform rotate-[-1deg] hover:rotate-0 transition-all duration-700">
                  <div 
                    className="relative w-full aspect-square overflow-hidden bg-gray-50 rounded-sm cursor-zoom-in group"
                    onClick={() => handleZoom(filteredItems[currentIndex].url)}
                  >
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={filteredItems[currentIndex].url}
                        src={getDisplayUrl(filteredItems[currentIndex].url)}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1516589174184-c6848463ea2a?q=80&w=800&auto=format&fit=crop"; // Fallback image
                        }}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "anticipate" }}
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Our Memory"
                      />
                    </AnimatePresence>
                    
                    <div className="absolute top-4 left-4 flex gap-2">
                       {filteredItems[currentIndex].privacy === 'private' && (
                         <div className="w-8 h-8 bg-purple-600/90 backdrop-blur-md rounded-full flex items-center justify-center text-white text-[10px] shadow-lg border border-white/30">
                            <i className="fas fa-lock"></i>
                         </div>
                       )}
                    </div>

                    {(source === 'instagram' || isInstagramLink(filteredItems[currentIndex].url)) && (
                      <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg border border-white/30">
                        <i className="fab fa-instagram text-[11px]"></i>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-500">
                      <i className="fas fa-expand text-white text-3xl drop-shadow-lg"></i>
                    </div>
                  </div>

                  <div className="absolute bottom-5 left-0 w-full text-center">
                    <p className={`font-pacifico text-pink-500 text-2xl tracking-wide`}>
                       {viewMode === 'private' ? 'Secret Moments' : 'Everlasting Love'}
                    </p>
                  </div>

                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-32 h-10 bg-pink-100/40 rotate-[-1deg] backdrop-blur-md shadow-sm border border-white/20"></div>
                
                  <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                    {filteredItems.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          idx === currentIndex ? 'bg-pink-500 scale-150 shadow-sm' : 'bg-pink-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {style === 'carousel' && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="w-full flex flex-col gap-6"
                 onMouseEnter={() => setIsHovering(true)}
                 onMouseLeave={() => setIsHovering(false)}
               >
                  <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto pb-12 gap-8 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth"
                  >
                     {filteredItems.map((item, idx) => (
                        <motion.div 
                          key={item.url}
                          layout
                          whileHover={{ scale: 1.05, y: -8 }}
                          className={`snap-center shrink-0 w-[20rem] md:w-[24rem] lg:w-[28rem] xl:w-[32rem] bg-white p-2 pb-12 md:p-2.5 pb-14 lg:p-3 pb-16 xl:p-4 pb-20 shadow-[0_25px_60px_rgba(0,0,0,0.12)] rounded-md md:rounded-[2.2rem] lg:rounded-[2.4rem] xl:rounded-[2.5rem] transition-all cursor-zoom-in relative border-[4px] md:border-[8px] lg:border-[12px] xl:border-[16px] border-white/90 group`}
                          onClick={() => handleZoom(item.url)}
                        >
                           <div className="w-full h-56 md:h-72 lg:h-80 xl:h-96 overflow-hidden rounded-[1.2rem] md:rounded-[1.4rem] lg:rounded-[1.5rem] xl:rounded-[1.6rem] bg-gray-50 relative border border-gray-100 flex items-center justify-center">
                              <div className="w-full h-full flex items-center justify-center">
                                <OptimizedImage 
                                  src={item.url} 
                                  alt={`Memory ${idx}`} 
                                  className="w-auto h-auto max-w-full max-h-full object-contain transition-transform duration-1000 group-hover:scale-110"
                                  priority={idx < 3} // Prioritize first 3 images in carousel
                                  fallback="https://images.unsplash.com/photo-1516589174184-c6848463ea2a?q=80&w=800&auto=format&fit=crop"
                                />
                              </div>
                              
                              <div className="absolute top-3 left-3 flex gap-2">
                                 {item.privacy === 'private' && (
                                   <div className="bg-purple-600/90 backdrop-blur-md p-2.5 rounded-full text-white shadow-lg border border-white/20">
                                      <i className="fas fa-lock text-[10px]"></i>
                                   </div>
                                 )}
                              </div>

                              {(source === 'instagram' || isInstagramLink(item.url)) && (
                                <div className="absolute top-3 right-3 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 backdrop-blur-md p-2.5 rounded-full text-white shadow-lg border border-white/20">
                                  <i className="fab fa-instagram text-xs"></i>
                                </div>
                              )}
                           </div>
                           <p className={`absolute bottom-4 left-0 w-full text-center font-pacifico text-pink-400 text-xl tracking-wide`}>
                              {item.privacy === 'private' ? 'Our Secret' : `Chapter ${idx + 1}`}
                           </p>
                        </motion.div>
                     ))}
                  </div>

                  <div className="flex justify-center gap-4">
                    {filteredItems.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollToIndex(idx)}
                        className={`w-3.5 h-3.5 rounded-full transition-all duration-700 ${
                          idx === currentIndex 
                            ? 'bg-pink-500 scale-125 shadow-md w-8' 
                            : 'bg-pink-200 hover:bg-pink-300'
                        }`}
                        aria-label={`Go to memory ${idx + 1}`}
                      />
                    ))}
                  </div>
               </motion.div>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isZoomed && zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/98 backdrop-blur-xl p-6"
            onClick={() => setIsZoomed(false)}
          >
            <button className="absolute top-10 right-10 text-white text-6xl font-light hover:text-pink-400 transition-colors">&times;</button>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="relative max-w-6xl max-h-[85vh] group"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={zoomedImage} 
                referrerPolicy="no-referrer"
                onError={(e) => {
                   e.currentTarget.src = "https://images.unsplash.com/photo-1516589174184-c6848463ea2a?q=80&w=800&auto=format&fit=crop";
                }}
                alt="Zoomed Memory" 
                className="w-full h-full object-contain rounded-md shadow-[0_0_100px_rgba(236,72,153,0.2)] border-4 border-white/10"
              />
              <div className="absolute -bottom-16 left-0 w-full flex justify-center gap-4">
                {items.find(i => getDisplayUrl(i.url) === zoomedImage)?.privacy === 'private' && (
                  <div className="bg-purple-600/90 px-6 py-2.5 rounded-full text-white text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 border border-white/20">
                    <i className="fas fa-lock"></i> Locked Vault Memory
                  </div>
                )}
                {(zoomedImage.includes('instagram.com') || zoomedImage.includes('cdninstagram.com')) && (
                   <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2.5 rounded-full text-white text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 border border-white/20">
                      <i className="fab fa-instagram"></i> Instagram Highlight
                   </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MemoryFrame;

