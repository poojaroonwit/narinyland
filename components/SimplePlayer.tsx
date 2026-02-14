"use client";

import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';

// Stable component reference outside render cycle
const Player = ReactPlayer as any;

interface SimplePlayerProps {
  url: string;
}

const SimplePlayer: React.FC<SimplePlayerProps> = ({ url }) => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [muted, setMuted] = useState(true); // Start muted to allow autoplay
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [progress, setProgress] = useState(0);

  const isMounted = React.useRef(true);
  
  // Memoize config to prevent re-renders
  const playerConfig = React.useMemo(() => ({
    youtube: {
      playerVars: { 
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        playsinline: 1
      }
    }
  }), []);

  // Auto-play attempt on mount
  useEffect(() => {
    isMounted.current = true;
    // Attempt to play immediately (muted) - with a small delay to avoid strict mode double-mount issues
    const timer = setTimeout(() => {
        if (isMounted.current) setPlaying(true);
    }, 500);
    
    const handleInteraction = () => {
      if (!isMounted.current) return;
      setMuted(false);
      setPlaying(true);
      setHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  if (!url) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
       {/* Player must be "visible" for YouTube to work. Opacity 0.01 to avoid "hidden" optimizations. Size 10x10 to avoid tracking pixel blocking. */}
       <div style={{ position: 'fixed', top: -9999, opacity: 0.01, pointerEvents: 'none' }}>
        <Player
          url={url}
          playing={playing}
          volume={volume}
          muted={muted}
          width="10px"
          height="10px"
          // Basic YouTube config
          config={playerConfig}
          onProgress={({ playedSeconds }: any) => {
             setProgress(Math.floor(playedSeconds));
          }}
          onError={(e: any) => {
            const msg = e?.message || e?.toString() || "";
            if (msg.includes("interrupted") || msg.includes("AbortError") || msg.includes("removed from the document")) {
                return;
            }
            console.error("SimplePlayer Error:", e);
            setError("Playback Error");
          }}
          onPlay={() => setError(null)}
        />
      </div>

      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-full border border-pink-100 shadow-lg group hover:bg-white transition-all">
        {/* Play/Pause */}
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

        {/* Info / Volume */}
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">
                {muted && playing ? "Tap to Unmute" : playing ? "Now Playing" : "Paused"}
            </span>
            
            {/* Volume Slider - always visible for now to debug */}
            <input 
            type="range" 
            min={0} 
            max={1} 
            step={0.1} 
            value={muted ? 0 : volume} 
            onChange={(e) => {
                setVolume(parseFloat(e.target.value));
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
