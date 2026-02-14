// @ts-nocheck
import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicPlayerProps {
  url: string;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ url }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);

  // Auto-play on first interaction
  React.useEffect(() => {
    const handleInteraction = () => {
      setPlaying(true);
      // Clean up after first interaction
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

  // Clean URL to avoid playlist/radio bugs in embed
  const cleanUrl = React.useMemo(() => {
    if (!url) return '';
    console.log("MusicPlayer: Received URL", url);
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // Support standard v=ID, youtu.be/ID, shorts/ID, and embed/ID
      const match = url.match(/(?:[?&]v=|be\/|shorts\/|embed\/)([^&?#/ ]+)/);
      console.log("MusicPlayer: YouTube Match", match);
      return match ? `https://www.youtube.com/watch?v=${match[1]}` : url;
    }
    return url;
  }, [url]);
  
  // Reset ready state when URL changes
  React.useEffect(() => {
    setIsReady(false);
    setIsActuallyPlaying(false);
  }, [cleanUrl]);

  if (!cleanUrl) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[60]">
      {/* Player Container - Always mounted to keep music playing */}
      <motion.div
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={{
          open: { opacity: 1, scale: 1, y: 0, pointerEvents: "auto" },
          closed: { opacity: 0, scale: 0.8, y: 20, pointerEvents: "none" }
        }}
        transition={{ duration: 0.3 }}
        className="mb-4 bg-white/90 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-white/50 w-72 origin-bottom-left absolute bottom-16 left-0"
      >
         <div className="rounded-2xl overflow-hidden shadow-inner bg-black aspect-video mb-4 relative group ring-4 ring-pink-50">
            {/* @ts-ignore - ReactPlayer types can be problematic with some setups */}
            <ReactPlayer
              key={cleanUrl} 
              url={cleanUrl}
              playing={isReady && playing} // Re-added isReady to avoid AbortError
              volume={volume}
              muted={muted}
              width="100%"
              height="100%"
              controls={false}
              onReady={() => {
                console.log("MusicPlayer: Player is ready");
                // Small delay before setting ready to true to ensure internal player state is stable
                setTimeout(() => setIsReady(true), 150);
              }}
              onStart={() => {
                console.log("MusicPlayer: Playback started");
                setIsActuallyPlaying(true);
              }}
              onPlay={() => {
                console.log("MusicPlayer: Play event");
                setIsActuallyPlaying(true);
              }}
              onPause={() => {
                console.log("MusicPlayer: Pause event");
                setIsActuallyPlaying(false);
              }}
              onBuffer={() => setIsActuallyPlaying(false)}
              onBufferEnd={() => setIsActuallyPlaying(true)}
              onError={(e) => {
                // Ignore AbortError as it's typically a race condition with play/pause
                if (e?.toString().includes('AbortError')) {
                   console.warn("MusicPlayer: Ignored AbortError (race condition)");
                   return;
                }
                console.error("MusicPlayer Error:", e);
                setIsActuallyPlaying(false);
              }}
              config={{
                youtube: {
                  playerVars: { 
                    autoplay: 1,
                    playsinline: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    enablejsapi: 1,
                    origin: typeof window !== 'undefined' ? window.location.origin : ''
                  }
                }
              }}
              className="pointer-events-none"
            />
            
            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-2 text-white pointer-events-auto">
                {!isActuallyPlaying && playing && (
                   <div className="flex flex-col items-center gap-1">
                      <p className="text-[10px] font-bold bg-black/60 px-2 py-1 rounded animate-pulse">
                         {!isReady ? 'Loading player...' : 'Waiting for audio...'}
                      </p>
                   </div>
                )}
                <button 
                  onClick={() => setPlaying(!playing)} 
                  className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/40 transition-all hover:scale-110"
                >
                  <i className={`fas ${playing && isActuallyPlaying ? 'fa-pause' : 'fa-play'} text-lg drop-shadow-md`}></i>
                </button>
            </div>
         </div>
         
         <div className="flex items-center gap-3 px-1">
            <button onClick={() => setMuted(!muted)} className="text-pink-400 hover:text-pink-600 w-8 flex justify-center transition-colors">
              <i className={`fas ${muted || volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up'}`}></i>
            </button>
            <div className="flex-1 relative h-6 flex items-center">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={e => {
                    setVolume(parseFloat(e.target.value));
                    setMuted(false);
                }}
                className="w-full absolute z-20 opacity-0 cursor-pointer h-full"
              />
              <div className="w-full h-1.5 bg-pink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-400 to-rose-400" 
                  style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                />
              </div>
            </div>
         </div>

         <div className="mt-4 flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-300">
              {isActuallyPlaying ? 'Now Playing' : playing ? 'Buffering...' : 'Paused'}
            </p>
            <button 
              onClick={() => {
                const currentUrl = cleanUrl;
                // Force remount by temporarily clearing URL
                // Actually, just resetting state is usually enough
                setIsReady(false);
                setIsActuallyPlaying(false);
                setPlaying(false);
                setTimeout(() => setPlaying(true), 100);
              }} 
              className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-pink-400 transition-colors"
              title="Refresh Player"
            >
              <i className="fas fa-sync-alt mr-1"></i> Refresh
            </button>
         </div>
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
            setIsOpen(!isOpen);
            // If it's the first time opening and not playing, try to play
            if (!playing) setPlaying(true);
        }}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl border-4 transition-colors z-50 relative ${isOpen || isActuallyPlaying ? 'bg-gradient-to-tr from-pink-500 to-rose-400 border-white text-white' : 'bg-white border-pink-50 text-pink-400'}`}
      >
        {isActuallyPlaying ? (
           <div className="flex gap-1 items-end h-5 pb-1">
             <motion.div animate={{ height: [4, 16, 8, 16] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-white rounded-full" />
             <motion.div animate={{ height: [8, 12, 4, 12] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-white rounded-full" />
             <motion.div animate={{ height: [12, 6, 16, 6] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-white rounded-full" />
           </div>
        ) : (
           <i className="fas fa-music"></i>
        )}
      </motion.button>
    </div>
  );
};

export default React.memo(MusicPlayer);
