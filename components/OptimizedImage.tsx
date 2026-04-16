"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: string;
  fallback?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  style?: React.CSSProperties;
  sizes?: string;
  loading?: 'lazy' | 'eager';
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder,
  fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='16'%3EImage not available%3C/text%3E%3C/svg%3E",
  onError,
  onLoad,
  style,
  sizes = '100vw',
  loading = 'lazy'
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>(placeholder || fallback);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(priority);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [retryKey, setRetryKey] = useState(0); // Force re-render for retry

  // Generate optimized display URL
  const displayUrl = useMemo(() => {
    if (!src) return fallback;
    
    // If it's an Instagram post URL, proxy through our backend
    if (/instagram\.com\/(p|reel|tv)\//.test(src)) {
      return `/api/instagram/image?url=${encodeURIComponent(src)}`;
    }
    
    // If it's a relative API URL, convert to full URL
    if (src.startsWith('/api/')) {
      return `${window.location.origin}${src}`;
    }
    
    return src;
  }, [src, fallback]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!priority && imgRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observerRef.current?.disconnect();
          }
        },
        {
          rootMargin: '50px', // Start loading 50px before image comes into view
          threshold: 0.01
        }
      );
      
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Load image when it becomes visible (ultra simple)
  useEffect(() => {
    if (isIntersecting && imageState === 'loading') {
      const img = new Image();
      
      img.onload = () => {
        setImageState('loaded');
        setCurrentSrc(displayUrl);
      };
      
      img.onerror = () => {
        setImageState('error');
        setCurrentSrc(fallback);
      };
      
      img.src = displayUrl;
    }
  }, [isIntersecting, displayUrl, imageState, fallback]);

  // Note: Manual retry removed for simple load-and-cache behavior

  // Generate placeholder SVG
  const placeholderSvg = useMemo(() => {
    if (placeholder) return placeholder;
    
    const w = width || 400;
    const h = height || 300;
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Crect width='${w}' height='${h}' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='16'%3ELoading...%3C/text%3E%3C/svg%3E`;
  }, [placeholder, width, height]);

  return (
    <div className="relative overflow-hidden" style={style}>
      {/* Placeholder */}
      <div 
        className={`absolute inset-0 bg-gray-100 ${imageState === 'loaded' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      >
        <img 
          src={placeholderSvg}
          alt={alt}
          className={`w-full h-full object-cover ${className}`}
        />
      </div>
      
      {/* Main image */}
      <motion.img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${className}`}
        style={{
          opacity: imageState === 'loaded' ? 1 : 0,
        }}
        loading={loading}
        sizes={sizes}
        width={width}
        height={height}
        onError={(e) => {
          setImageState('error');
          setCurrentSrc(fallback);
          onError?.(e);
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageState === 'loaded' ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
            
      {/* Error indicator */}
      {imageState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">🖼️</div>
            <div className="text-sm">Failed to load</div>
            <div className="text-xs mt-1 opacity-60">Image unavailable</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
