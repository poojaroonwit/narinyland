"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../../../components/Logo';
import { useGardenPageContext } from './context';

export const GardenStatusOverlays: React.FC = () => {
  const {
    hasAcceptedProposal,
    activeTab,
    appConfig,
    isMobile,
    daysTogether,
    flowerCount,
    loveStats,
    worldMode,
    setWorldMode,
    setIsEditMode,
    showInstallPrompt,
    handleInstallApp,
  } = useGardenPageContext();

  if (!hasAcceptedProposal) return null;

  return (
    <>
      {activeTab === 'home' && (
        <div className="pointer-events-none fixed left-1/2 top-24 z-[60] flex -translate-x-1/2 flex-col items-center md:top-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 pb-1.5 md:gap-16 md:pb-2"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black uppercase tracking-widest text-pink-500 drop-shadow-sm md:text-[10px]">Together</span>
              <span className="flex items-center gap-1 text-sm font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] md:gap-2 md:text-3xl">
                <i className="fas fa-heart animate-pulse text-[10px] text-red-500 md:text-xl" />
                {daysTogether}
                <span className="text-[10px] font-bold opacity-80 md:text-sm">Days</span>
              </span>
            </div>

            <div className="hidden h-10 w-px bg-white/20 md:block" />

            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black uppercase tracking-widest text-pink-500 drop-shadow-sm md:text-[10px]">Garden</span>
              <div className="flex items-center gap-2 md:gap-8">
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-xs font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] md:text-2xl"><span>🌸</span>{flowerCount}</span>
                  <span className="text-[6px] font-black uppercase text-white/60 md:text-[8px]">Flowers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-xs font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] md:text-2xl"><span>🍃</span>{loveStats.leaves?.toLocaleString?.() ?? 0}</span>
                  <span className="text-[6px] font-black uppercase text-white/60 md:text-[8px]">Leaves</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-xs font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] md:text-2xl"><span>⭐</span>{loveStats.level}</span>
                  <span className="text-[6px] font-black uppercase text-white/60 md:text-[8px]">Level</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] md:text-2xl"><span>🪙</span>{loveStats.points?.toLocaleString?.() ?? 0}</span>
                  <span className="text-[6px] font-black uppercase text-white/60 md:text-[8px]">Points</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="relative isolate mt-0.5 h-0.5 w-24 overflow-hidden rounded-full border border-white/5 bg-white/10 md:mt-1 md:h-1 md:w-96">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((loveStats.xp || 0) / Math.max(1, (loveStats.level || 1) * 100)) * 100)}%` }}
              className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-yellow-400"
            />
          </div>

          <div className="pointer-events-auto mt-4 flex items-center rounded-md border border-pink-100 bg-white/80 p-1 shadow-md backdrop-blur-md">
            <button
              type="button"
              onClick={() => setWorldMode('tree')}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[10px] font-black tracking-widest transition-all ${worldMode === 'tree' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-400 hover:text-pink-500'}`}
            >
              <i className="fas fa-tree text-[9px]" /> LAND
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false);
                setWorldMode('globe');
              }}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[10px] font-black tracking-widest transition-all ${worldMode === 'globe' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-400 hover:text-pink-500'}`}
            >
              <i className="fas fa-globe-americas text-[9px]" /> WORLD
            </button>
          </div>
        </div>
      )}

      <div className="fixed left-6 top-4 z-[60] flex items-center md:top-6">
        <Logo size={isMobile ? 70 : 120} title={appConfig.appName} />
      </div>

      <AnimatePresence>
        {showInstallPrompt && (
          <motion.button
            type="button"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            onClick={handleInstallApp}
            className="fixed right-6 top-1/2 z-[65] flex -translate-y-1/2 items-center gap-3 rounded-md border-2 border-pink-100 bg-white/90 px-5 py-3 shadow-2xl backdrop-blur-md transition-all hover:border-pink-300"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-pink-500 text-xl text-white shadow-lg">
              <i className="fas fa-mobile-alt" />
            </div>
            <div className="text-left">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-pink-500">Install App</p>
              <p className="text-sm font-bold text-gray-700">Add to Home</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
