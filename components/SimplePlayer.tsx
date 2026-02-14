"use client";

import React, { useState, useEffect, useRef } from 'react';

interface SimplePlayerProps {
  url: string;
}

const SimplePlayer: React.FC<SimplePlayerProps> = ({ url }) => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Helper to extract YouTube ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYoutubeId(url);

  // Send commands to YouTube IFrame
  const sendCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  };

  // Sync state with YouTube via postMessage
  useEffect(() => {
    if (playing) {
      sendCommand('playVideo');
    } else {
      sendCommand('pauseVideo');
    }
  }, [playing]);

  useEffect(() => {
    if (muted) {
      sendCommand('mute');
    } else {
      sendCommand('unMute');
      sendCommand('setVolume', [volume * 100]);
    }
  }, [muted, volume]);

  // Initial interaction handler for autoplay compliance
  useEffect(() => {
    const handleInteraction = () => {
      setMuted(false);
      setPlaying(true);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  if (!videoId) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      {/* Hidden IFrame for Music */}
      <div style={{ position: 'fixed', top: -9999, opacity: 0.001, pointerEvents: 'none' }}>
        <iframe
          ref={iframeRef}
          width="10"
          height="10"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${videoId}`}
          title="YouTube Music Player"
          frameBorder="0"
          allow="autoplay; encrypted-media"
        ></iframe>
      </div>

      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-full border border-pink-100 shadow-lg group hover:bg-white transition-all">
        {/* Play/Pause / Unmute */}
        <button 
            onClick={() => {
                if (muted) {
                    setMuted(false);
                    setPlaying(true);
                } else {
                    setPlaying(!playing);
                }
            }}
            className="w-10 h-10 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center text-white transition-colors shadow-md transition-all active:scale-95"
        >
            {playing ? (muted ? "🔇" : "🔊") : "▶️"}
        </button>

        <div className="flex flex-col pr-2">
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">
                {muted && playing ? "Tap to Unmute" : playing ? "Now Playing" : "Paused"}
            </span>
            
            <input 
              type="range" 
              min={0} 
              max={1} 
              step={0.1} 
              value={muted ? 0 : volume} 
              onChange={(e) => {
                  const newVol = parseFloat(e.target.value);
                  setVolume(newVol);
                  setMuted(false);
                  setPlaying(true);
              }}
              className="w-20 h-1 bg-pink-200 rounded-full appearance-none cursor-pointer mt-1"
            />
        </div>
      </div>
      
      {error && <span className="text-red-500 text-xs font-bold px-2 bg-white rounded-full py-1 shadow-md">Error: {error}</span>}
    </div>
  );
};

export default SimplePlayer;
