"use client";

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Interaction } from '../types';

interface GlobalImageModalProps {
  show: boolean;
  onClose: () => void;
  interactions: Interaction[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const GlobalImageModal: React.FC<GlobalImageModalProps> = ({
  show,
  onClose,
  interactions,
  currentIndex,
  onPrevious,
  onNext
}) => {
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

  const allImages = getAllImages();

  // Add keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (show) {
        if (e.key === 'ArrowLeft') {
          onPrevious();
        } else if (e.key === 'ArrowRight') {
          onNext();
        } else if (e.key === 'Escape') {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, currentIndex]);

  if (!show || allImages.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        style={{ zIndex: 'var(--z-index-modal, 9999)' }}
        onClick={onClose}
      >
        <button 
          className="absolute top-6 right-6 text-white text-xl bg-black/50 hover:bg-black/80 w-12 h-12 flex items-center justify-center rounded-full transition-all z-10"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        
        <div className="relative flex flex-col items-center max-w-full max-h-full">
          {/* Image Counter */}
          <div className="absolute -top-16 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {allImages.length}
          </div>
          
          {/* Navigation Buttons */}
          <button
            className="absolute left-4 text-white text-xl bg-black/50 hover:bg-black/80 w-12 h-12 flex items-center justify-center rounded-full transition-all z-10"
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          
          <button
            className="absolute right-4 text-white text-xl bg-black/50 hover:bg-black/80 w-12 h-12 flex items-center justify-center rounded-full transition-all z-10"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          
          {/* Image */}
          <motion.img
            key={allImages[currentIndex]?.url}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            src={allImages[currentIndex]?.url}
            className="max-w-96 max-h-96 w-96 h-96 object-cover rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Image Info */}
          {allImages.length > 0 && (
            <div className="mt-4 text-white text-center">
              <div className="text-sm opacity-80">
                {allImages[currentIndex]?.interactionTitle}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalImageModal;

