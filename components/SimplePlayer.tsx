"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SimplePlayerProps {
  playlist: string[];
  volume?: number;
  setVolume?: (v: number) => void;
  playing?: boolean;
  setPlaying?: (p: boolean) => void;
  muted?: boolean;
  setMuted?: (m: boolean) => void;
}

const SimplePlayer: React.FC<SimplePlayerProps> = ({ 
  playlist = [], 
  volume: controlledVolume, 
  playing: controlledPlaying,
  setPlaying: controlledSetPlaying,
  muted: controlledMuted,
  setMuted: controlledSetMuted
}) => {
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [internalVolume] = useState(1.0);
  const [internalMuted, setInternalMuted] = useState(true);
  
  // Track current song index
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Use props if provided, otherwise internal state
  const playing = controlledPlaying ?? internalPlaying;
  const setPlaying = controlledSetPlaying ?? setInternalPlaying;
  const volume = controlledVolume ?? internalVolume;
  const muted = controlledMuted ?? internalMuted;
  const setMuted = controlledSetMuted ?? setInternalMuted;

  const [error] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Helper to extract YouTube ID
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Resume state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nari_music_state');
      if (saved) {
        const { index } = JSON.parse(saved) as { index?: number };
        // Only restore if valid index
        if (typeof index === 'number' && index >= 0 && index < playlist.length) {
          queueMicrotask(() => setCurrentTrackIndex(index));
        }
      }
    } catch (e) {
      console.warn('Failed to load music state', e);
    }
  }, [playlist.length]); // Only run once or when playlist size changes significantly

  // Persist current track index
  useEffect(() => {
    if (playlist.length > 0) {
      localStorage.setItem('nari_music_state', JSON.stringify({
        index: currentTrackIndex,
        timestamp: Date.now() // We mostly care about track index for now
      }));
    }
  }, [currentTrackIndex, playlist]);

  const nextTrack = React.useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentTrackIndex(prev => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const videoId = useMemo(() => {
     if (!playlist || playlist.length === 0) return null;
     const url = playlist[currentTrackIndex] || playlist[0];
     return getYoutubeId(url);
  }, [playlist, currentTrackIndex]);

  // Send commands to YouTube IFrame
  const sendCommand = React.useCallback((func: string, args: Array<string | number | boolean> = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  }, []);

  // Listen for YouTube API events (specifically ENDED state to auto-advance)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Filter messages from YouTube
      if (event.origin.includes('youtube.com')) {
         try {
           const data = JSON.parse(event.data);
           // info: 0 means ENDED
           if (data.event === 'onStateChange' && data.info === 0) {
              nextTrack();
           }
         } catch { /* ignore */ }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [nextTrack]);

  // Sync state with YouTube via postMessage
  useEffect(() => {
    if (playing) {
      sendCommand('playVideo');
    } else {
      sendCommand('pauseVideo');
    }
  }, [playing, videoId, sendCommand]); // Re-send play when videoId changes

  useEffect(() => {
    if (muted) {
      sendCommand('mute');
    } else {
      sendCommand('unMute');
      sendCommand('setVolume', [volume * 100]);
    }
  }, [muted, volume, videoId, sendCommand]);

  // Initial interaction handler for autoplay compliance
  useEffect(() => {
    const handleInteraction = () => {
      setMuted(false);
      setPlaying(true);
      
      // Give it a tiny bit of time for the state to propagate then force unMute via command
      setTimeout(() => {
        sendCommand('unMute');
        sendCommand('setVolume', [volume * 100]);
        sendCommand('playVideo');
      }, 500);
      
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [sendCommand, setMuted, setPlaying, volume]);

  if (!videoId) return null;

  return (
    <div className="fixed bottom-4 left-4 flex items-center gap-2"
         style={{ zIndex: 'var(--z-index-fixed)' }}>
      {/* Hidden IFrame for Music */}
      <div style={{ position: 'fixed', top: -9999, opacity: 0.001, pointerEvents: 'none' }}>
        <iframe
          ref={iframeRef}
          width="10"
          height="10"
          // Adding enablejsapi=1 is crucial for postMessage control
          // origin is required for security in some browsers
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&controls=0&modestbranding=1&loop=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
          title="YouTube Music Player"
          frameBorder="0"
          allow="autoplay; encrypted-media"
        ></iframe>
      </div>

      {error && <span className="fixed bottom-4 left-4 text-red-500 text-xs font-bold px-2 bg-white rounded-full py-1 shadow-md"
                style={{ zIndex: 'var(--z-index-fixed)' }}>Error: {error}</span>}
    </div>
  );
};

export default SimplePlayer;
