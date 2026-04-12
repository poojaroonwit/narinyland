"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MemoryItem, Interaction } from '../types';
import OptimizedImage from './OptimizedImage';

interface MemoryFrameProps {
  isVisible: boolean;
  items: MemoryItem[];
  albums?: Array<{ id: string; name: string }>; 
  style?: string; // 'polaroid' | 'carousel'
  source?: 'manual' | 'instagram';
  username?: string;
  viewMode: 'all' | 'public' | 'private';
  onViewModeChange: (mode: 'all' | 'public' | 'private') => void;
  variant?: 'default' | 'sky';
  timelineItems?: Interaction[]; 
  includeTimelineInGallery?: boolean; 
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
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null); 
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const getDisplayUrl = (url: string) => {
    if (!url) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Crect width='600' height='600' fill='%23000'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23fff' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
    if (/instagram\.com\/(p|reel|tv)\//.test(url)) {
      return `/api/instagram/image?url=${encodeURIComponent(url)}`;
    }
    if (url.startsWith('/api/')) {
      return `${window.location.origin}${url}`;
    }
    return url;
  };

  const isInstagramLink = (url: string) => url.includes('instagram.com') || url.includes('cdninstagram.com');

  const allItems = useMemo(() => {
    const galleryItems = items;
    const timelineMemoryItems = includeTimelineInGallery ? (timelineItems || [])
      .filter(interaction => {
        const mediaItems = interaction.mediaItems || (interaction.media ? [interaction.media] : []);
        return mediaItems.some((media: any) => media.type === 'image');
      })
      .map((interaction, index) => {
        const mediaItems = interaction.mediaItems || (interaction.media ? [interaction.media] : []);
        const firstImage = mediaItems.find((media: any) => media.type === 'image');
        return {
          id: interaction.id,
          url: firstImage?.url || '',
          privacy: 'public' as 'public' | 'private',
          caption: interaction.text || `Memory ${index + 1}`
        };
      })
      .filter(item => item.url) : [];
    return [...galleryItems, ...timelineMemoryItems];
  }, [items, timelineItems, includeTimelineInGallery]);

  const filteredItems = useMemo(() => {
    let result = allItems;
    if (viewMode !== 'all') result = result.filter(item => item.privacy === viewMode);
    if (selectedAlbumId) result = result.filter(item => item.albumId === selectedAlbumId);
    return result;
  }, [allItems, viewMode, selectedAlbumId]);

  useEffect(() => setCurrentIndex(0), [viewMode, selectedAlbumId]);

  useEffect(() => {
    if (isVisible && !isZoomed && style === 'polaroid' && filteredItems.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
      }, 5000); 
      return () => clearInterval(interval);
    }
  }, [isVisible, filteredItems.length, isZoomed, style]);

  const handleZoom = (img: string) => {
    setZoomedImage(getDisplayUrl(img));
    setIsZoomed(true);
  };

  if (!isVisible) return null;

  // Sky variant refactored
  if (variant === 'sky') {
    return (
      <div className="fixed inset-0 z-[10] pointer-events-none overflow-hidden font-geist">
        {filteredItems.slice(0, 15).map((item, idx) => (
          <motion.div
            key={`${item.url}-${idx}`}
            className="absolute w-32 md:w-48 pointer-events-auto cursor-zoom-in group"
            style={{ 
              top: `${10 + (idx * 20) % 70}%`, 
              left: `${5 + (idx * 15) % 90}%` 
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: [0, -10, 0, 10, 0],
              rotate: [(idx % 3 - 1) * 2, (idx % 3 - 1) * 3, (idx % 3 - 1) * 1]
            }}
            transition={{ 
              duration: 12 + idx, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            onClick={() => handleZoom(item.url)}
          >
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-clay border border-white/20 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:z-50">
              <img src={getDisplayUrl(item.url)} className="w-full h-full object-cover rounded-xl grayscale group-hover:grayscale-0 transition-all duration-700" />
            </div>
          </motion.div>
        ))}
        {/* Zoom Modal duplicated logic or shared */}
        <AnimatePresence>
          {isZoomed && zoomedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 pointer-events-auto"
              onClick={() => setIsZoomed(false)}
            >
              <div className="relative max-w-5xl max-h-[80vh]">
                <img src={zoomedImage} className="w-full h-full object-contain rounded-clay shadow-2xl border border-white/5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-20 font-geist">
      {/* Header controls refactored */}
      <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-10">
        <div className="space-y-4">
          <p className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em]">GALLERY</p>
          <h2 className="text-4xl font-black text-black uppercase tracking-tight">MEMORIES</h2>
        </div>

        <div className="flex flex-col gap-6 items-end">
          {/* Privacy Toggle */}
          <div className="flex bg-black/5 p-1.5 rounded-pill backdrop-blur-md">
            {['all', 'public', 'private'].map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode as any)}
                className={`px-6 py-2.5 rounded-pill text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                  viewMode === mode ? 'bg-black text-white shadow-xl' : 'text-black/30 hover:text-black/60'
                }`}
              >
                {mode === 'all' ? 'FULL ARCHIVE' : mode === 'public' ? 'WORLD' : 'INTERNAL'}
              </button>
            ))}
          </div>

          {/* Album Selection */}
          {albums.length > 0 && (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setSelectedAlbumId(null)}
                className={`px-5 py-2 rounded-pill text-[8px] font-black uppercase tracking-[0.2em] border transition-all ${
                  !selectedAlbumId ? 'bg-black text-white border-black' : 'bg-transparent text-black/40 border-black/10 hover:border-black/30'
                }`}
              >
                ALL EVENTS
              </button>
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  className={`px-5 py-2 rounded-pill text-[8px] font-black uppercase tracking-[0.2em] border transition-all ${
                    selectedAlbumId === album.id ? 'bg-black text-white border-black' : 'bg-transparent text-black/40 border-black/10 hover:border-black/30'
                  }`}
                >
                  {album.name.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {filteredItems.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="w-full py-40 border border-black/5 rounded-clay bg-black/5 flex flex-col items-center justify-center opacity-20"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.5em]">NO RECORDS FOUND</p>
          </motion.div>
        ) : (
          <div className="w-full">
            {style === 'polaroid' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl mx-auto"
              >
                <div 
                  className="bg-white p-6 pb-24 shadow-[0_50px_100px_rgba(0,0,0,0.1)] rounded-clay border border-black/5 relative group cursor-zoom-in"
                  onClick={() => handleZoom(filteredItems[currentIndex].url)}
                >
                  <div className="aspect-square bg-black/5 overflow-hidden rounded-xl">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={filteredItems[currentIndex].url}
                        src={getDisplayUrl(filteredItems[currentIndex].url)}
                        initial={{ opacity: 0, filter: 'grayscale(100%) blur(10px)' }}
                        animate={{ opacity: 1, filter: 'grayscale(0%) blur(0px)' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>
                  </div>
                  <div className="absolute bottom-6 left-0 w-full text-center">
                    <p className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em]">
                      {filteredItems[currentIndex].caption?.toUpperCase() || "DOCUMENTED MOMENT"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {filteredItems.map((item, idx) => (
                  <motion.div
                    key={`${item.url}-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="group cursor-zoom-in"
                    onClick={() => handleZoom(item.url)}
                  >
                    <div className="bg-white p-4 rounded-clay shadow-sm border border-black/5 group-hover:shadow-2xl transition-all duration-700">
                      <div className="aspect-[4/5] bg-black/5 overflow-hidden rounded-xl mb-6">
                        <img src={getDisplayUrl(item.url)} className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" />
                      </div>
                      <p className="text-[8px] font-black text-black/20 uppercase tracking-[0.3em]">
                        {item.privacy === 'private' ? 'RESTRICTED ARCHIVE' : 'PUBLIC RECORD'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Global Zoom Modal */}
      <AnimatePresence>
        {isZoomed && zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-white/95 backdrop-blur-3xl p-10"
            onClick={() => setIsZoomed(false)}
          >
            <div className="relative max-w-7xl max-h-[85vh]">
              <img src={zoomedImage} className="w-full h-full object-contain rounded-clay shadow-2xl border border-black/5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemoryFrame;
