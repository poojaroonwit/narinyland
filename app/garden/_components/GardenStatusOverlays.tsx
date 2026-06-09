// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Timeline from '../../../components/Timeline';
import MemoryFrame from '../../../components/MemoryFrame';
import ProposalScreen from '../../../components/ProposalScreen';
import LoveCoupons from '../../../components/LoveCoupons';
import LoveLetter from '../../../components/LoveLetter';
import LoveTree3D from '../../../components/LoveTree3D';
import EditDrawer from '../../../components/EditDrawer';
import Logo from '../../../components/Logo';
import SimplePlayer from '../../../components/SimplePlayer';
import Toast from '../../../components/Toast';
import TimelineSpreadsheet from '../../../components/TimelineSpreadsheet';
import UserDropdown from '../../../components/UserDropdown';
import UserProfileModal from '../../../components/UserProfileModal';
import Shop from '../../../components/Shop';
import World3D from '../../../components/World3D';
import { useGardenPageContext } from './context';

export const GardenStatusOverlays: React.FC = () => {
  const { user, logout, authLoading, circles, activeCircleId, setActiveCircle, hasAcceptedProposal, setHasAcceptedProposal, isLetterOpen, setIsLetterOpen, isEditDrawerOpen, setIsEditDrawerOpen, isSpreadsheetOpen, setIsSpreadsheetOpen, isStatsGuideOpen, setIsStatsGuideOpen, isVolumeModalOpen, setIsVolumeModalOpen, musicVolume, setMusicVolume, isMusicPlaying, setIsMusicPlaying, isMusicMuted, setIsMusicMuted, isMobile, deferredPrompt, setDeferredPrompt, isUserProfileModalOpen, setIsUserProfileModalOpen, showInstallPrompt, setShowInstallPrompt, toast, setToast, showToast, petEmotion, setPetEmotion, petMessage, setPetMessage, loveStats, setLoveStats, loveLetters, setLoveLetters, appConfig, setAppConfig, handleSetAppConfig, circleMembers, setCircleMembers, activePartners, galleryViewMode, setGalleryViewMode, activeTab, setActiveTab, worldMode, setWorldMode, isLandDropdownOpen, setIsLandDropdownOpen, isCircleDropdownOpen, setIsCircleDropdownOpen, isUserDropdownOpen, setIsUserDropdownOpen, selectedFlagItem, setSelectedFlagItem, isEditMode, setIsEditMode, configLoaded, setConfigLoaded, closeFloatingPanels, toggleVolumePanel, toggleCircleDropdown, toggleLandDropdown, switchTab, handleSelectLand, handleInstallApp, addXP, handleAddLeaf, handleProposalStepChange, handleProposalAccepted, handleRedeemCoupon, handleAddCoupon, handleDeleteCoupon, handleSendMessage, handleUpdateMessage, handleUpdateTimeline, handleAddTimeline, handleDeleteTimeline, handleMassTimelineUpdate, combinedInteractions, handleTimelineConfigUpdate, daysTogether, flowerCount } = useGardenPageContext();

  return (
    <>
            {hasAcceptedProposal && (
              <>
                {/* CENTERED STATUS BAR - HOME ONLY */}
                {activeTab === 'home' && worldMode === 'globe' && (
                  <div 
                    className="fixed top-24 md:top-8 left-1/2 transform -translate-x-1/2 z-[60] flex flex-col items-center pointer-events-auto cursor-pointer"
                    onClick={() => {
                      closeFloatingPanels();
                      setIsStatsGuideOpen(true);
                    }}
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex items-center gap-4 md:gap-16 pb-1.5 md:pb-2"
                    >
                        {/* Together Stat */}
                        <div className="flex flex-col items-center">
                          <span className="text-[7px] md:text-[10px] font-black text-pink-500 uppercase tracking-widest drop-shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">Together</span>
                          <span className="text-sm md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-2">
                             <i className="fas fa-heart text-red-500 animate-pulse text-[10px] md:text-xl"></i> {daysTogether} <span className="text-[10px] md:text-sm font-bold opacity-80">Days</span>
                          </span>
                        </div>
      
                        <div className="w-px h-6 md:h-10 bg-white/20 hidden md:block"></div>
      
                        {/* Garden Stats */}
                        <div className="flex flex-col items-center">
                          <span className="text-[7px] md:text-[10px] font-black text-pink-500 uppercase tracking-widest drop-shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">Garden</span>
                          <div className="flex items-center gap-2 md:gap-8">
                             <div className="flex flex-col items-center">
                                <span className="text-xs md:text-2xl font-bold text-white drop-shadow-[0_2px_4_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-1.5"><span className="text-sm md:text-2xl">🌸</span> {flowerCount}</span>
                                <span className="text-[6px] md:text-[8px] font-black text-white/50 uppercase tracking-tighter">Flowers</span>
                             </div>
                             <div className="flex flex-col items-center">
                                <span className="text-xs md:text-2xl font-bold text-white drop-shadow-[0_2px_4_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-1.5"><span className="text-sm md:text-2xl">🍃</span> {loveStats.leaves?.toLocaleString()}</span>
                                <span className="text-[6px] md:text-[8px] font-black text-white/50 uppercase tracking-tighter">Leaves</span>
                             </div>
                             <div className="flex flex-col items-center">
                                <span className="text-xs md:text-2xl font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-1.5"><span className="text-[10px] md:text-base">⭐</span> {loveStats.level}</span>
                                <span className="text-[6px] md:text-[8px] font-black text-white/50 uppercase tracking-tighter">Level</span>
                             </div>
                             <div className="flex flex-col items-center">
                                <span className="text-xs md:text-2xl font-bold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center gap-1 md:gap-1.5"><span className="text-[10px] md:text-base">🪙</span> {loveStats.points?.toLocaleString()}</span>
                                <span className="text-[6px] md:text-[8px] font-black text-white/50 uppercase tracking-tighter">Points</span>
                             </div>
                          </div>
                        </div>
                    </motion.div>
      
                    {/* Minimal XP Bar Underneath */}
                    <div className="w-24 md:w-96 h-0.5 md:h-1 bg-white/10 rounded-full overflow-hidden mt-0.5 md:mt-1 border border-white/5 isolate relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (loveStats.xp / (loveStats.level * 100)) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-yellow-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]"
                        />
                    </div>
      
                    {/* Land / World toggle integrated below status bar */}
                    <div 
                      className="mt-4 flex items-center bg-white/80 backdrop-blur-md rounded-md border border-pink-100 shadow-md p-1 pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setWorldMode('tree')}
                        className={`rounded-md px-4 py-1.5 text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 ${
                          worldMode === 'tree'
                            ? 'bg-pink-500 text-white shadow-sm'
                            : 'text-gray-400 hover:text-pink-500'
                        }`}
                      >
                        <i className="fas fa-tree text-[9px]"></i> LAND
                      </button>
                      <button
                        onClick={() => {
                          setIsEditMode(false);
                          setWorldMode('globe');
                        }}
                        className={`rounded-md px-4 py-1.5 text-[10px] font-black tracking-widest transition-all flex items-center gap-1.5 ${
                          worldMode === 'globe'
                            ? 'bg-pink-500 text-white shadow-sm'
                            : 'text-gray-400 hover:text-pink-500'
                        }`}
                      >
                        <i className="fas fa-globe-americas text-[9px]"></i> WORLD
                      </button>
                    </div>
                  </div>
                )}
      
                {/* Logo - Fixed Top Left */}
                <div className={`fixed top-4 md:top-6 left-6 flex items-center ${activeTab === 'home' && worldMode === 'tree' ? 'hidden' : ''}`}
                   style={{ zIndex: 'var(--z-index-fixed)' }}>
                  <Logo 
                    size={isMobile ? 70 : 120} 
                    title={appConfig.appName} 
                    className="" 
                  />
                </div>
      
                  {/* PWA Install Button & Grow Leaf Button */}
                  <div className={`fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4 items-end ${activeTab === 'home' && worldMode === 'tree' ? 'hidden' : ''}`}>
                    {/* PWA Install Notification */}
                    <AnimatePresence>
                      {showInstallPrompt && (
                        <motion.button
                          initial={{ x: 50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 50, opacity: 0 }}
                          onClick={handleInstallApp}
                          className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-md shadow-2xl border-2 border-pink-100 group hover:border-pink-300 transition-all"
                        >
                          <div className="w-10 h-10 bg-pink-500 rounded-md flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform">
                            <i className="fas fa-mobile-alt"></i>
                          </div>
                          <div className="text-left">
                             <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none mb-1">Install App</p>
                             <p className="text-sm font-bold text-gray-700 leading-none">Add to Home</p>
                          </div>
                        </motion.button>
                      )}
                    </AnimatePresence>
      
                    {/* Grow Leaf Button (Visible only if points >= 100) */}
                    <AnimatePresence>
                      {loveStats.points >= 100 && activeTab === 'home' && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0, x: 20 }}
                          animate={{ scale: 1, opacity: 1, x: 0 }}
                          exit={{ scale: 0, opacity: 0, x: 20 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleAddLeaf}
                          className="group relative flex flex-col items-center"
                          title="Grow a new leaf (Costs 100 points)"
                        >
                          <div className="absolute -top-12 right-0 bg-black/80 text-white text-[10px] font-black px-3 py-1.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity animate-bounce">
                             GROW LEAF! 🌱 -100 🪙
                          </div>
                          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-[0_20px_50px_rgba(16,185,129,0.4)] flex items-center justify-center text-3xl relative overflow-hidden group">
                             <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <motion.span 
                               animate={{ rotate: [0, 10, -10, 0] }}
                               transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                             >
                               🍃
                             </motion.span>
                          </div>
                        </motion.button>
                      )}
                    </AnimatePresence>
      
                 </div>
      
                {/* STATS GUIDE MODAL/DRAWER */}
                <AnimatePresence>
                  {isStatsGuideOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
                      onClick={() => setIsStatsGuideOpen(false)}
                    >
                      <motion.div
                        initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                        exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={`bg-white w-full max-w-2xl overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.3)] flex flex-col ${
                          isMobile ? 'rounded-t-md max-h-[90vh]' : 'rounded-md max-h-[85vh]'
                        }`}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Handle for mobile */}
                        {isMobile && (
                          <div className="flex justify-center pt-4 pb-2 shrink-0">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                          </div>
                        )}
      
                        <div className="overflow-y-auto custom-scrollbar p-6 md:p-10">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-8">
                             <div className="flex items-center gap-5">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 rounded-md flex items-center justify-center text-3xl font-black text-white shadow-xl border-4 border-white rotate-3">
                                  {loveStats.level}
                                </div>
                                <div>
                                   <h3 className="font-pacifico text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600">Garden Guide</h3>
                                   <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em]">World Status & Progress</p>
                                </div>
                             </div>
                             <button onClick={() => setIsStatsGuideOpen(false)} className="w-12 h-12 bg-gray-50 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
                                <i className="fas fa-times text-xl"></i>
                             </button>
                          </div>
      
                          {/* XP Progress */}
                          <div className="bg-pink-50/30 rounded-md p-6 md:p-8 border border-pink-100 mb-8 overflow-hidden relative group">
                              <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12 transition-transform group-hover:scale-[1.7]">
                                 <i className="fas fa-chart-line text-pink-500 text-6xl"></i>
                              </div>
                              <div className="flex justify-between items-end mb-4 relative z-10">
                                 <div>
                                    <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-1">Experience Points</span>
                                    <div className="flex items-baseline gap-2">
                                       <span className="text-4xl font-black text-gray-800">{loveStats.xp}</span>
                                       <span className="text-sm font-bold text-gray-400">/ {loveStats.level * 100} XP</span>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">World Level</span>
                                    <span className="text-xl font-black text-amber-600">Level {loveStats.level}</span>
                                 </div>
                              </div>
                              <div className="w-full h-4 bg-white/50 rounded-full overflow-hidden border border-pink-100 relative shadow-inner p-1">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (loveStats.xp / (loveStats.level * 100)) * 100)}%` }}
                                    className="h-full bg-gradient-to-r from-pink-400 via-rose-500 to-yellow-400 rounded-full relative"
                                  >
                                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                                  </motion.div>
                              </div>
                          </div>
      
                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-4 md:gap-6 mb-10">
                             <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-md border border-pink-100/50 flex flex-col items-center text-center gap-2 hover:shadow-lg transition-all group">
                                <span className="text-4xl group-hover:scale-125 transition-transform">🌸</span>
                                <span className="font-black text-gray-800 text-2xl drop-shadow-sm">{flowerCount}</span>
                                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Flowers Bloomed</span>
                             </div>
                             <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-md border border-green-100/50 flex flex-col items-center text-center gap-2 hover:shadow-lg transition-all group">
                                <span className="text-4xl group-hover:scale-125 transition-transform">🍃</span>
                                <span className="font-black text-gray-800 text-2xl drop-shadow-sm">{loveStats.leaves?.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Leaves Grown</span>
                             </div>
                          </div>
      
                          {/* Guide Section */}
                          <div className="space-y-6">
                             <h4 className="font-pacifico text-2xl text-gray-800 border-b border-gray-100 pb-4">How to grow our garden?</h4>
                             
                             <div className="space-y-4">
                                <div className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-md hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                                   <div className="w-12 h-12 shrink-0 bg-pink-100 rounded-md flex items-center justify-center text-2xl">🌸</div>
                                   <div>
                                      <h5 className="font-black text-gray-800 text-sm">Automated Blooms</h5>
                                      <p className="text-xs text-gray-500 font-medium leading-relaxed">A new flower blooms every <span className="text-pink-500 font-black">{appConfig.daysPerFlower} days</span> automatically to celebrate our journey together.</p>
                                   </div>
                                </div>
      
                                <div className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-md hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                                   <div className="w-12 h-12 shrink-0 bg-green-100 rounded-md flex items-center justify-center text-2xl">🍃</div>
                                   <div>
                                      <h5 className="font-black text-gray-800 text-sm">Manual Growth</h5>
                                      <p className="text-xs text-gray-500 font-medium leading-relaxed">You can manually grow a leaf by spending <span className="text-green-600 font-black">100 points</span>. Use the button on the right of the home screen!</p>
                                   </div>
                                </div>
      
                                <div className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-md hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                                   <div className="w-12 h-12 shrink-0 bg-purple-100 rounded-md flex items-center justify-center text-2xl">⭐</div>
                                   <div>
                                      <h5 className="font-black text-gray-800 text-sm">Earning Points & XP</h5>
                                      <p className="text-xs text-gray-500 font-medium leading-relaxed">Every milestone, memory, or letter shared adds <span className="text-purple-600 font-black">Points and XP</span> to our joint account.</p>
                                   </div>
                                </div>
                             </div>
                          </div>
      
                          {/* Footer Stats Info */}
                          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Relationship Length: {daysTogether} Days</span>
                              </div>
                              <div className="flex items-center gap-2 bg-pink-50/50 px-4 py-2 rounded-full border border-pink-100">
                                 <i className="fas fa-clock text-pink-400 text-[10px]"></i>
                                 <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Next Flower: {appConfig.daysPerFlower - (daysTogether % appConfig.daysPerFlower)} Days</span>
                              </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
    </>
  );
};
