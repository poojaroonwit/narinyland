"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../../../components/Logo';
import { useGardenPageContext } from './context';

export const GardenStatusOverlays: React.FC = () => {
  const {
    hasAcceptedProposal,
    configLoaded,
    activeTab,
    appConfig,
    isMobile,
    daysTogether,
    flowerCount,
    loveStats,
    showInstallPrompt,
    setShowInstallPrompt,
    handleInstallApp,
  } = useGardenPageContext();

  if (!configLoaded || !hasAcceptedProposal) return null;

  return (
    <>
      {activeTab === 'home' && (
        <div className="pointer-events-none fixed left-1/2 top-36 z-[60] flex -translate-x-1/2 flex-col items-center md:top-[5.5rem]">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cozy-float flex items-center gap-4 rounded-[1.2rem] px-4 py-2 md:gap-8 md:px-5"
          >
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-semibold tracking-wide text-[#806757] md:text-[10px]">Together</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-[#4f4438] md:gap-2 md:text-3xl">
                <i className="fas fa-heart animate-pulse text-[10px] text-red-500 md:text-xl" />
                {daysTogether}
                <span className="text-[10px] font-medium opacity-80 md:text-sm">Days</span>
              </span>
            </div>

            <div className="hidden h-8 w-px bg-[#dfd1bf] md:block" />

            <div className="flex flex-col items-center">
              <span className="text-[9px] font-semibold tracking-wide text-[#806757] md:text-[10px]">Garden</span>
              <div className="flex items-center gap-2 md:gap-8">
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#4f4438] md:text-2xl"><span>🌸</span>{flowerCount}</span>
                  <span className="text-[9px] font-medium text-[#897b6b]">Flowers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#4f4438] md:text-2xl"><span>🍃</span>{loveStats.leaves?.toLocaleString?.() ?? 0}</span>
                  <span className="text-[9px] font-medium text-[#897b6b]">Leaves</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#8b704d] md:text-2xl"><span>⭐</span>{loveStats.level}</span>
                  <span className="text-[9px] font-medium text-[#897b6b]">Level</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] md:text-2xl"><span>🪙</span>{loveStats.points?.toLocaleString?.() ?? 0}</span>
                  <span className="text-[9px] font-medium text-[#897b6b]">Points</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="relative isolate mt-1 h-1 w-36 overflow-hidden rounded-full bg-[#e0d5c4] md:w-72">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((loveStats.xp || 0) / Math.max(1, (loveStats.level || 1) * 100)) * 100)}%` }}
              className="h-full rounded-full bg-[#81a082]"
            />
          </div>
        </div>
      )}

      <div className="fixed left-6 top-4 z-[60] flex items-center md:top-6">
        <Logo size={isMobile ? 70 : 120} title={appConfig.appName} />
      </div>

      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            role="region"
            aria-label="Install Narinyland"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            className="cozy-surface fixed right-3 top-[calc(10rem+env(safe-area-inset-top))] z-[65] flex max-w-[min(17rem,calc(100vw-1.5rem))] items-center gap-2 rounded-2xl p-2 shadow-lg md:right-5 md:top-[calc(5.5rem+env(safe-area-inset-top))]"
          >
            <button type="button" onClick={handleInstallApp}
              className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-2 text-left text-xs font-semibold text-[#52493f] hover:bg-[#f4eadc]">
              <i className="fas fa-mobile-alt text-[#54725b]" aria-hidden="true" />
              Add Narinyland to Home
            </button>
            <button type="button" aria-label="Dismiss install suggestion"
              onClick={() => setShowInstallPrompt(false)}
              className="min-h-11 min-w-11 rounded-xl text-stone-500 hover:bg-[#f4eadc]">
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
