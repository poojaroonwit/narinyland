"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Interaction } from '../types';
import OptimizedImage from './OptimizedImage';

interface TimelineImagesProps {
  interactions: Interaction[];
  className?: string;
  maxImages?: number;
}

const TimelineImages: React.FC<TimelineImagesProps> = ({ 
  interactions, 
  className = "", 
  maxImages = 6
}) => {
  // Get all images from timeline interactions
  const allTimelineImages: Array<{
    url: string;
    title: string;
    date: Date;
    id: string;
    interactionId: string;
  }> = [];

  interactions.forEach(interaction => {
    // Handle both single media and media arrays
    const mediaItems = interaction.mediaItems || (interaction.media ? [interaction.media] : []);
    const imageMediaItems = mediaItems.filter((media: any) => media.type === 'image');
    
    if (imageMediaItems.length > 0) {
      // Add all images from this interaction
      imageMediaItems.forEach((media: any, index) => {
        allTimelineImages.push({
          url: media.url,
          title: interaction.text || `Memory ${allTimelineImages.length + 1}`,
          date: interaction.timestamp,
          id: `${interaction.id}-${index}`,
          interactionId: interaction.id
        });
      });
    }
  });

  // Pagination state
  const [displayedImages, setDisplayedImages] = useState(20); // Start with 20 images
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load more images function
  const loadMoreImages = useCallback(() => {
    if (isLoading || displayedImages >= allTimelineImages.length) return;
    
    setIsLoading(true);
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedImages(prev => Math.min(prev + 20, allTimelineImages.length));
      setIsLoading(false);
    }, 300);
  }, [isLoading, displayedImages, allTimelineImages.length]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading) {
          loadMoreImages();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loadMoreImages, isLoading]);

  // Get currently displayed images
  const timelineImages = allTimelineImages.slice(0, displayedImages);

  if (allTimelineImages.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 max-w-7xl mx-auto px-4">
        {timelineImages.map((image, index) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.1 
            }}
            className="group cursor-pointer"
            onClick={() => {
              // Find the image in the carousel and open it
              const event = new CustomEvent('openTimelineCarouselFromHome', { 
                detail: { imageUrl: image.url } 
              });
              window.dispatchEvent(event);
            }}
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
              {/* Image */}
              <OptimizedImage
                src={image.url}
                className="w-full h-full object-cover object-center"
                alt={image.title}
                priority={index < 3} // Prioritize first 3 images
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Title */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="text-sm font-medium line-clamp-2">{image.title}</div>
                <div className="text-xs opacity-80 mt-1">
                  {image.date.toLocaleDateString()}
                </div>
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 border-2 border-pink-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More Trigger */}
      {displayedImages < allTimelineImages.length && (
        <div ref={loadMoreRef} className="flex justify-center items-center py-8">
          {isLoading ? (
            <div className="flex items-center gap-2 text-pink-500">
              <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading more memories...</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-2">Scroll for more</div>
              <div className="w-8 h-8 mx-auto border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineImages;
