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

export const GardenGlobalModals: React.FC = () => {
  const { user, logout, authLoading, circles, activeCircleId, setActiveCircle, hasAcceptedProposal, setHasAcceptedProposal, isLetterOpen, setIsLetterOpen, isEditDrawerOpen, setIsEditDrawerOpen, isSpreadsheetOpen, setIsSpreadsheetOpen, isStatsGuideOpen, setIsStatsGuideOpen, isVolumeModalOpen, setIsVolumeModalOpen, musicVolume, setMusicVolume, isMusicPlaying, setIsMusicPlaying, isMusicMuted, setIsMusicMuted, isMobile, deferredPrompt, setDeferredPrompt, isUserProfileModalOpen, setIsUserProfileModalOpen, showInstallPrompt, setShowInstallPrompt, toast, setToast, showToast, confirmPrompt, answerConfirmPrompt, petEmotion, setPetEmotion, petMessage, setPetMessage, loveStats, setLoveStats, loveLetters, setLoveLetters, appConfig, setAppConfig, handleSetAppConfig, circleMembers, setCircleMembers, activePartners, galleryViewMode, setGalleryViewMode, activeTab, setActiveTab, worldMode, setWorldMode, isLandDropdownOpen, setIsLandDropdownOpen, isCircleDropdownOpen, setIsCircleDropdownOpen, isUserDropdownOpen, setIsUserDropdownOpen, selectedFlagItem, setSelectedFlagItem, isEditMode, setIsEditMode, configLoaded, setConfigLoaded, closeFloatingPanels, toggleVolumePanel, toggleCircleDropdown, toggleLandDropdown, switchTab, handleSelectLand, handleInstallApp, addXP, handleAddLeaf, handleProposalStepChange, handleProposalAccepted, handleRedeemCoupon, handleAddCoupon, handleDeleteCoupon, handleSendMessage, handleUpdateMessage, handleUpdateTimeline, handleAddTimeline, handleDeleteTimeline, handleMassTimelineUpdate, combinedInteractions, handleTimelineConfigUpdate, daysTogether, flowerCount } = useGardenPageContext();

  return (
    <>
      {hasAcceptedProposal && (
        <>
                <LoveLetter 
                  isOpen={isLetterOpen} 
                  onClose={() => setIsLetterOpen(false)} 
                  messages={loveLetters}
                  onSendMessage={handleSendMessage}
                  onUpdateMessage={handleUpdateMessage}
                  partners={activePartners}
                  folders={appConfig.mailFolders}
                />
      
                <EditDrawer 
                  isOpen={isEditDrawerOpen} 
                  onClose={() => setIsEditDrawerOpen(false)} 
                  config={appConfig} 
                  partners={activePartners}
                  setConfig={handleSetAppConfig} 
                  onSave={() => showToast("Settings saved successfully! ✨")}
                />
                <Toast 
                  message={toast.message} 
                  isVisible={toast.isVisible} 
                  onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
                />

                <AnimatePresence>
                  {confirmPrompt && (
                    <motion.div
                      className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/35 px-4 py-6 backdrop-blur-[2px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onMouseDown={() => answerConfirmPrompt(false)}
                      role="presentation"
                    >
                      <motion.div
                        className="w-full max-w-sm overflow-hidden rounded-[22px] border border-rose-100 bg-[#fffaf5] shadow-[0_28px_80px_rgba(92,38,38,0.28)]"
                        initial={{ opacity: 0, y: 18, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                        onMouseDown={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="garden-confirm-title"
                      >
                        <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-rose-500 shadow-sm">
                              <i className={confirmPrompt.tone === 'danger' ? 'fas fa-trash-can text-sm' : 'fas fa-seedling text-sm'} />
                            </div>
                            <div className="min-w-0">
                              <h2 id="garden-confirm-title" className="text-base font-black text-stone-800">
                                {confirmPrompt.title}
                              </h2>
                              <p className="mt-0.5 text-xs font-semibold text-stone-500">Shared world action</p>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 py-4">
                          <p className="text-sm leading-6 text-stone-600">{confirmPrompt.message}</p>
                          <div className="mt-5 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => answerConfirmPrompt(false)}
                              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-600 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
                            >
                              {confirmPrompt.cancelLabel || 'Cancel'}
                            </button>
                            <button
                              type="button"
                              onClick={() => answerConfirmPrompt(true)}
                              className={`rounded-full px-4 py-2 text-sm font-black text-white shadow-sm transition ${
                                confirmPrompt.tone === 'danger'
                                  ? 'bg-rose-500 hover:bg-rose-600'
                                  : 'bg-emerald-500 hover:bg-emerald-600'
                              }`}
                            >
                              {confirmPrompt.confirmLabel || 'Confirm'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <SimplePlayer 
                  playlist={appConfig.musicPlaylist || ["https://www.youtube.com/watch?v=igx8-BdblEI"]} 
                  volume={musicVolume}
                  setVolume={setMusicVolume}
                  playing={isMusicPlaying}
                  setPlaying={setIsMusicPlaying}
                  muted={isMusicMuted}
                  setMuted={setIsMusicMuted}
                />
                
                <TimelineSpreadsheet 
                  isOpen={isSpreadsheetOpen}
                  onClose={() => setIsSpreadsheetOpen(false)}
                  interactions={appConfig.timeline}
                  onSave={handleMassTimelineUpdate}
                  onDelete={handleDeleteTimeline}
                />
        </>
      )}
    </>
  );
};
