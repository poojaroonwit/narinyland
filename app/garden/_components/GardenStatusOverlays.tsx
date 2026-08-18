"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGardenPageContext } from './context';

/**
 * The family-farm scene renders its own game HUD. This component now keeps only
 * app-level status UI that belongs above the game, instead of the former
 * LAND/WORLD toggle and 3D garden counters.
 */
export const GardenStatusOverlays: React.FC = () => {
  const { hasAcceptedProposal, showInstallPrompt, handleInstallApp } = useGardenPageContext();

  if (!hasAcceptedProposal) return null;

  return (
    <AnimatePresence>
      {showInstallPrompt && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          onClick={handleInstallApp}
          className="fixed left-3 top-3 z-[65] flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-xs font-black text-emerald-700 shadow-lg backdrop-blur-xl sm:left-5 sm:top-4"
        >
          <span aria-hidden="true">📲</span>
          <span className="hidden sm:inline">Install Narinyland</span>
          <span className="sm:hidden">Install</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};
