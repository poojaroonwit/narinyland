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
  const { user, logout, authLoading, circles, activeCircleId, setActiveCircle, hasAcceptedProposal, setHasAcceptedProposal, isLetterOpen, setIsLetterOpen, isEditDrawerOpen, setIsEditDrawerOpen, isSpreadsheetOpen, setIsSpreadsheetOpen, isStatsGuideOpen, setIsStatsGuideOpen, isVolumeModalOpen, setIsVolumeModalOpen, musicVolume, setMusicVolume, isMusicPlaying, setIsMusicPlaying, isMusicMuted, setIsMusicMuted, isMobile, deferredPrompt, setDeferredPrompt, isUserProfileModalOpen, setIsUserProfileModalOpen, showInstallPrompt, setShowInstallPrompt, toast, setToast, showToast, petEmotion, setPetEmotion, petMessage, setPetMessage, loveStats, setLoveStats, loveLetters, setLoveLetters, appConfig, setAppConfig, handleSetAppConfig, circleMembers, setCircleMembers, activePartners, galleryViewMode, setGalleryViewMode, activeTab, setActiveTab, worldMode, setWorldMode, isLandDropdownOpen, setIsLandDropdownOpen, isCircleDropdownOpen, setIsCircleDropdownOpen, isUserDropdownOpen, setIsUserDropdownOpen, selectedFlagItem, setSelectedFlagItem, isEditMode, setIsEditMode, configLoaded, setConfigLoaded, closeFloatingPanels, toggleVolumePanel, toggleCircleDropdown, toggleLandDropdown, switchTab, handleSelectLand, handleInstallApp, addXP, handleAddLeaf, handleProposalStepChange, handleProposalAccepted, handleRedeemCoupon, handleAddCoupon, handleDeleteCoupon, handleSendMessage, handleUpdateMessage, handleUpdateTimeline, handleAddTimeline, handleDeleteTimeline, handleMassTimelineUpdate, combinedInteractions, handleTimelineConfigUpdate, daysTogether, flowerCount } = useGardenPageContext();

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
