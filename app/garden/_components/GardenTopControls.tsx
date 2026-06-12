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
import { circlesAPI, landsAPI } from '../../../services/api';
import { getErrorMessage } from '../../../lib/errors';

export const GardenTopControls: React.FC = () => {
  const { user, logout, authLoading, circles, activeCircleId, setActiveCircle, refreshUser, hasAcceptedProposal, setHasAcceptedProposal, isLetterOpen, setIsLetterOpen, isEditDrawerOpen, setIsEditDrawerOpen, isSpreadsheetOpen, setIsSpreadsheetOpen, isStatsGuideOpen, setIsStatsGuideOpen, isVolumeModalOpen, setIsVolumeModalOpen, musicVolume, setMusicVolume, isMusicPlaying, setIsMusicPlaying, isMusicMuted, setIsMusicMuted, isMobile, deferredPrompt, setDeferredPrompt, isUserProfileModalOpen, setIsUserProfileModalOpen, showInstallPrompt, setShowInstallPrompt, toast, setToast, showToast, petEmotion, setPetEmotion, petMessage, setPetMessage, loveStats, setLoveStats, loveLetters, setLoveLetters, appConfig, setAppConfig, handleSetAppConfig, circleMembers, setCircleMembers, activePartners, galleryViewMode, setGalleryViewMode, activeTab, setActiveTab, worldMode, setWorldMode, isLandDropdownOpen, setIsLandDropdownOpen, isCircleDropdownOpen, setIsCircleDropdownOpen, isUserDropdownOpen, setIsUserDropdownOpen, selectedFlagItem, setSelectedFlagItem, isEditMode, setIsEditMode, configLoaded, setConfigLoaded, closeFloatingPanels, toggleVolumePanel, toggleCircleDropdown, toggleLandDropdown, switchTab, handleSelectLand, handleInstallApp, addXP, handleAddLeaf, handleProposalStepChange, handleProposalAccepted, handleRedeemCoupon, handleAddCoupon, handleDeleteCoupon, handleSendMessage, handleUpdateMessage, handleUpdateTimeline, handleAddTimeline, handleDeleteTimeline, handleMassTimelineUpdate, combinedInteractions, handleTimelineConfigUpdate, daysTogether, flowerCount } = useGardenPageContext();
  const activeLand = appConfig.lands?.find(l => l.isActive) ?? appConfig.lands?.[0];
  const [newWorldName, setNewWorldName] = React.useState('');
  const [newLandName, setNewLandName] = React.useState('');
  const [isCreatingWorld, setIsCreatingWorld] = React.useState(false);
  const [isCreatingLand, setIsCreatingLand] = React.useState(false);

  const handleCreateWorld = async (event) => {
    event.preventDefault();
    const name = newWorldName.trim();
    if (!name || isCreatingWorld) return;

    setIsCreatingWorld(true);
    try {
      const result = await circlesAPI.create({ name });
      const circleId = result.circleId || result.id;
      if (!circleId) throw new Error('AppKit did not return a world ID.');

      const defaultLand = result.defaultLand
        ? { ...result.defaultLand, isActive: true, items: result.defaultLand.items || [] }
        : null;

      setNewWorldName('');
      setConfigLoaded?.(false);
      setAppConfig(prev => ({
        ...prev,
        ...(result.config || {}),
        appName: name,
        gallery: [],
        timeline: [],
        coupons: [],
        albums: [],
        lands: defaultLand ? [defaultLand] : [],
      }));
      setCircleMembers?.(user?.sub ? [{
        id: user.sub,
        userId: user.sub,
        name: user.name || 'You',
        avatar: user.picture || '',
        role: result.role || 'member',
      }] : []);
      setIsCircleDropdownOpen(false);
      await setActiveCircle(circleId, {
        name: result.name || name,
        description: typeof result.description === 'string' ? result.description : name,
        role: result.role || 'member',
      });
      await refreshUser?.();
      showToast?.(`Created world "${name}"${result.creatorLinked ? ' and linked it to you' : ''}`);
    } catch (err) {
      showToast?.(`Could not create world: ${getErrorMessage(err)}`);
    } finally {
      setIsCreatingWorld(false);
    }
  };

  const handleCreateLand = async (event) => {
    event.preventDefault();
    const name = newLandName.trim();
    if (!name || isCreatingLand) return;

    setIsCreatingLand(true);
    try {
      const createdLand = await landsAPI.create(name);
      const activeCreatedLand = createdLand.isActive ? createdLand : await landsAPI.setActive(createdLand.id);
      const normalizedCreatedLand = { ...activeCreatedLand, isActive: true, items: activeCreatedLand.items || [] };

      setAppConfig(prev => {
        const existingLands = prev.lands || [];
        const nextLands = [
          ...existingLands
            .filter(land => land.id !== normalizedCreatedLand.id)
            .map(land => ({ ...land, isActive: false })),
          normalizedCreatedLand,
        ];

        return { ...prev, lands: nextLands };
      });
      setNewLandName('');
      setIsLandDropdownOpen(false);
      showToast?.(`Created land "${name}"`);
    } catch (err) {
      showToast?.(`Could not create land: ${getErrorMessage(err)}`);
    } finally {
      setIsCreatingLand(false);
    }
  };

  return (
    <>
            {/* Fixed UI Overlays - Always Visible (Outside the scrollable content flow) */}
      
            {/* Config & Top Menu - Persistently Visible */}
            <div className="fixed top-4 right-4 md:right-6 flex items-center gap-3 md:gap-4 z-[60]">
               <button
                 onClick={toggleVolumePanel}
                 className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 border backdrop-blur-md ${
                   isMusicMuted ? 'bg-gray-500/40 text-white border-gray-400/50' : 'bg-white/40 text-pink-500 border-white/50'
                 }`}
               >
                 <i className={`fas ${isMusicMuted ? 'fa-volume-mute' : 'fa-music'} text-xs`}></i>
               </button>
      
                 {/* World Selection (Circle Switcher) - Left side */}
                 <div className="relative">
                    <button
                      onClick={toggleCircleDropdown}
                      className="h-10 px-4 rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-gray-700 shadow-lg flex items-center gap-2 hover:bg-white/60 transition-all transform hover:scale-105"
                    >
                      <i className="fas fa-globe-asia text-emerald-500 text-xs"></i>
                      <span className="text-xs font-bold truncate max-w-[80px] md:max-w-[120px]">
                        {circles.find(c => c.id === activeCircleId)?.name || 'Select World'}
                      </span>
                      <i className={`fas fa-chevron-down text-[10px] opacity-40 transition-transform ${isCircleDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>
      
                    <AnimatePresence>
                      {isCircleDropdownOpen && (
                        <>
                          {/* Backdrop for mobile */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCircleDropdownOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[75] md:hidden"
                          />
      
                          <motion.div
                            initial={isMobile ? { y: "100%" } : { opacity: 0, y: -10, scale: 0.95 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
                            exit={isMobile ? { y: "100%" } : { opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.2 }}
                            className={`fixed md:absolute bottom-0 md:bottom-auto md:top-full md:right-0 md:mt-3 w-full md:w-64 bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] md:rounded-md shadow-2xl border-t md:border border-pink-100 overflow-hidden z-[80]`}
                          >
                            {/* Drawer Handle (Mobile) */}
                            <div className="flex justify-center pt-4 pb-2 md:hidden">
                              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                            </div>
      
                            <div className="p-6 md:p-1.5">
                              <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-4 ml-4 md:hidden">Switch World</p>
                              <div className="mb-2 hidden items-center justify-between px-2 md:flex">
                                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-pink-400">Create World</span>
                                <i className="fas fa-circle-plus text-[10px] text-pink-300"></i>
                              </div>
                              <form onSubmit={handleCreateWorld} className="mb-3 md:mb-1.5 flex items-center gap-2 rounded-full md:rounded-md border border-pink-100 bg-pink-50/80 p-1.5">
                                <input
                                  value={newWorldName}
                                  onChange={(event) => setNewWorldName(event.target.value)}
                                  placeholder="New world"
                                  aria-label="New world name"
                                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm md:text-xs font-bold text-gray-700 placeholder:text-pink-300 outline-none"
                                  disabled={isCreatingWorld}
                                />
                                <button
                                  type="submit"
                                  disabled={!newWorldName.trim() || isCreatingWorld}
                                  title="Create world"
                                  className="h-9 w-9 shrink-0 rounded-full bg-pink-500 text-white shadow-md transition-all hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-pink-200"
                                >
                                  <i className={`fas ${isCreatingWorld ? 'fa-spinner fa-spin' : 'fa-plus'} text-[11px]`}></i>
                                </button>
                              </form>
                              <div className="space-y-1 md:space-y-0.5">
                                {circles.map(circle => (
                                  <button
                                    key={circle.id}
                                    onClick={() => {
                                      setActiveCircle(circle.id, circle);
                                      setIsCircleDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-6 py-4 md:px-4 md:py-2.5 rounded-full md:rounded-md text-sm md:text-xs font-bold transition-all flex items-center justify-between group ${
                                      circle.id === activeCircleId
                                      ? 'bg-pink-500 text-white shadow-md'
                                      : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                                    }`}
                                  >
                                    <span className="truncate">{circle.name}</span>
                                    {circle.id === activeCircleId && <i className="fas fa-check text-[10px]"></i>}
                                  </button>
                                ))}
                              </div>
                            </div>
      
                            {/* Extra spacing for mobile safe area */}
                            <div className="h-8 md:hidden"></div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                 </div>
      
                 {/* Land Switcher - Right of World Selection */}
                   <div className="relative">
                      <button
                        onClick={toggleLandDropdown}
                        className="h-10 px-4 rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-gray-700 shadow-lg flex items-center gap-2 hover:bg-white/60 transition-all transform hover:scale-105"
                      >
                        <i className="fas fa-map-marked-alt text-amber-500 text-xs"></i>
                        <span className="text-xs font-bold truncate max-w-[80px] md:max-w-[120px]">
                          {activeLand?.name || 'Select Land'}
                        </span>
                        <i className={`fas fa-chevron-down text-[10px] opacity-40 transition-transform ${isLandDropdownOpen ? 'rotate-180' : ''}`}></i>
                      </button>
      
                      <AnimatePresence>
                        {isLandDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-56 bg-white/90 backdrop-blur-xl rounded-md shadow-2xl border border-pink-100 overflow-hidden z-[80] p-1.5"
                          >
                            <div className="mb-2 flex items-center justify-between px-2 pt-1">
                              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-500">Create Land</span>
                              <i className="fas fa-circle-plus text-[10px] text-amber-300"></i>
                            </div>
                            <form onSubmit={handleCreateLand} className="mb-1.5 flex items-center gap-2 rounded-md border border-amber-100 bg-amber-50/80 p-1.5">
                              <input
                                value={newLandName}
                                onChange={(event) => setNewLandName(event.target.value)}
                                placeholder={activeCircleId ? 'New land' : 'Select world first'}
                                aria-label="New land name"
                                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs font-bold text-gray-700 placeholder:text-amber-300 outline-none"
                                disabled={isCreatingLand || !activeCircleId}
                              />
                              <button
                                type="submit"
                                disabled={!activeCircleId || !newLandName.trim() || isCreatingLand}
                                title="Create land"
                                className="h-8 w-8 shrink-0 rounded-full bg-amber-500 text-white shadow-md transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-200"
                              >
                                <i className={`fas ${isCreatingLand ? 'fa-spinner fa-spin' : 'fa-plus'} text-[10px]`}></i>
                              </button>
                            </form>
                            {appConfig.lands?.map(land => (
                              <button
                                key={land.id}
                                onClick={() => handleSelectLand(land.id)}
                                className={`w-full text-left px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-between group ${
                                  land.id === activeLand?.id
                                  ? 'bg-amber-500 text-white shadow-md'
                                  : 'text-gray-600 hover:bg-amber-50 hover:text-amber-600'
                                }`}
                              >
                                <span className="truncate">{land.name}</span>
                                {land.id === activeLand?.id && <i className="fas fa-check text-[10px]"></i>}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
      
                <UserDropdown
                  user={user}
                  onLogout={logout}
                  isOpen={isUserDropdownOpen}
                  onOpenChange={(nextOpen) => {
                    if (nextOpen) closeFloatingPanels('user');
                    setIsUserDropdownOpen(nextOpen);
                  }}
                  onEditUserInfo={() => {
                    closeFloatingPanels();
                    setIsUserProfileModalOpen(true);
                  }}
                  onOpenSettings={() => {
                    closeFloatingPanels();
                    setIsEditDrawerOpen(true);
                  }}
                   loading={authLoading}
                   isMobile={isMobile}
                />
            </div>
      
            <UserProfileModal 
              isOpen={isUserProfileModalOpen} 
              onClose={() => setIsUserProfileModalOpen(false)} 
            />
      
            {/* Music Adjustment Modal */}
            <AnimatePresence>
              {isVolumeModalOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="fixed top-20 right-6 z-[70] bg-white/90 backdrop-blur-xl p-4 rounded-md shadow-2xl border border-pink-100 flex flex-col items-center gap-4 w-12"
                >
                   <label className="text-[8px] font-black text-pink-500 uppercase tracking-tighter w-full text-center mb-2">VOL</label>
                   <div className="h-32 w-1.5 bg-gray-100 rounded-full relative overflow-hidden group">
                      <input 
                         type="range"
                         min="0"
                         max="1"
                         step="0.01"
                         value={isMusicMuted ? 0 : musicVolume}
                         onChange={(e) => {
                           setMusicVolume(parseFloat(e.target.value));
                           setIsMusicMuted(false);
                         }}
                         className="absolute inset-0 w-32 h-1.5 appearance-none bg-transparent cursor-pointer -rotate-90 origin-left translate-y-[128px] translate-x-[-1px] z-10"
                         style={{ width: '128px' }}
                      />
                      <div 
                         className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-pink-500 to-rose-400 transition-all duration-150"
                         style={{ height: `${(isMusicMuted ? 0 : musicVolume) * 100}%` }}
                      />
                   </div>
                   <button 
                     onClick={() => setIsMusicMuted(!isMusicMuted)}
                     className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isMusicMuted ? 'bg-gray-100 text-gray-400' : 'bg-pink-100 text-pink-500'}`}
                   >
                     <i className={`fas ${isMusicMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-[10px]`}></i>
                   </button>
                </motion.div>
              )}
            </AnimatePresence>
    </>
  );
};
