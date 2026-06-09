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
import { purchasedItemsAPI } from '../../../services/api';
import { useGardenPageContext } from './context';

export const GardenAcceptedContent: React.FC = () => {
  const { user, logout, authLoading, circles, activeCircleId, setActiveCircle, hasAcceptedProposal, setHasAcceptedProposal, isLetterOpen, setIsLetterOpen, isEditDrawerOpen, setIsEditDrawerOpen, isSpreadsheetOpen, setIsSpreadsheetOpen, isStatsGuideOpen, setIsStatsGuideOpen, isVolumeModalOpen, setIsVolumeModalOpen, musicVolume, setMusicVolume, isMusicPlaying, setIsMusicPlaying, isMusicMuted, setIsMusicMuted, isMobile, deferredPrompt, setDeferredPrompt, isUserProfileModalOpen, setIsUserProfileModalOpen, showInstallPrompt, setShowInstallPrompt, toast, setToast, showToast, petEmotion, setPetEmotion, petMessage, setPetMessage, loveStats, setLoveStats, loveLetters, setLoveLetters, appConfig, setAppConfig, handleSetAppConfig, circleMembers, setCircleMembers, activePartners, galleryViewMode, setGalleryViewMode, activeTab, setActiveTab, worldMode, setWorldMode, isLandDropdownOpen, setIsLandDropdownOpen, isCircleDropdownOpen, setIsCircleDropdownOpen, isUserDropdownOpen, setIsUserDropdownOpen, selectedFlagItem, setSelectedFlagItem, isEditMode, setIsEditMode, configLoaded, setConfigLoaded, closeFloatingPanels, toggleVolumePanel, toggleCircleDropdown, toggleLandDropdown, switchTab, handleSelectLand, handleInstallApp, addXP, handleAddLeaf, handleProposalStepChange, handleProposalAccepted, handleRedeemCoupon, handleAddCoupon, handleDeleteCoupon, handleSendMessage, handleUpdateMessage, handleUpdateTimeline, handleAddTimeline, handleDeleteTimeline, handleMassTimelineUpdate, combinedInteractions, handleTimelineConfigUpdate, daysTogether, flowerCount } = useGardenPageContext();
  const activeLand = appConfig.lands?.find(l => l.isActive) ?? appConfig.lands?.[0];

  return (
    <>
            {hasAcceptedProposal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col z-10 relative">
      
                {/* Tab Content Rendering */}
                <div className="flex-1 w-full overflow-y-auto overflow-x-hidden pb-24"> {/* Added padding bottom for tab bar */}
                   
                   {activeTab === 'home' && (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       transition={{ duration: 0.3 }}
                       className="flex flex-col items-center w-full min-h-full pt-20"
                     >
                       <MemoryFrame 
                          isVisible={true} 
                          items={appConfig.gallery} 
                          albums={appConfig.albums}
                          style={appConfig.galleryStyle} 
                          source={appConfig.gallerySource}
                          username={appConfig.instagramUsername}
                          viewMode={galleryViewMode}
                          onViewModeChange={setGalleryViewMode}
                          variant="sky"
                          timelineItems={appConfig.timeline}
                          includeTimelineInGallery={appConfig.includeTimelineInGallery}
                       />
                       
                       {/* Spacer for Home view scrolling if needed */}
                       <div className="h-24"></div> 
                     </motion.div>
                   )}
      
                   {activeTab === 'timeline' && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex justify-center pt-12 md:pt-24"
                      >
                        <Timeline 
                          interactions={combinedInteractions} 
                          anniversaryDate={appConfig.anniversaryDate} 
                          defaultRows={appConfig.timelineDefaultRows}
                          onUpdateInteraction={handleUpdateTimeline}
                          onDeleteInteraction={handleDeleteTimeline}
                          onAddInteraction={handleAddTimeline}
                          onOpenSpreadsheet={() => {
                            closeFloatingPanels();
                            setIsSpreadsheetOpen(true);
                          }}
                          cardScale={appConfig.timelineCardScale}
                          layoutMode={appConfig.timelineLayoutMode}
                          zoomLevel={appConfig.timelineZoomLevel}
                          thumbnailHeight={appConfig.timelineThumbnailHeight}
                          onUpdateConfig={handleTimelineConfigUpdate}
                       />
                      </motion.div>
                   )}
      
                   {activeTab === 'coupons' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex justify-center pt-12 md:pt-24"
                      >
                        <LoveCoupons 
                          coupons={appConfig.coupons} 
                          partners={activePartners} 
                          onRedeem={handleRedeemCoupon}
                          onDelete={handleDeleteCoupon}
                          onAdd={handleAddCoupon}
                        />
                      </motion.div>
                   )}
      
                   {activeTab === 'shop' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex justify-center pt-12 md:pt-24 px-4 overflow-y-auto"
                      >
                        <Shop 
                          points={loveStats.points} 
                          activeLandId={activeLand?.id}
                          onPurchase={async (item) => {
                             try {
                               const landId = activeLand?.id;
                               if (!landId) return;
                               
                               // Deduct points locally (temporary until synced)
                               setLoveStats(prev => ({ ...prev, points: prev.points - item.price }));
                               
                               const newItem = await purchasedItemsAPI.create({ type: item.type, landId, modelUrl: item.modelUrl });
                               // Add to local config
                               setAppConfig(prev => ({
                                 ...prev,
                                 lands: prev.lands?.map(l => l.id === landId ? { ...l, items: [...(l.items || []), newItem] } : l)
                               }));
                               
                               showToast(`You bought a ${item.name}! 🛍️`);
                             } catch (err) {
                               console.error("Purchase error", err);
                               setLoveStats(prev => ({ ...prev, points: prev.points + item.price })); // Refund
                               showToast("Purchase failed. Please try again.");
                             }
                          }} 
                        />
                      </motion.div>
                   )}
      
                   {activeTab === 'letters' && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-[calc(100vh-180px)] flex justify-center pt-10 md:pt-20 px-0 md:px-4"
                      >
                        <LoveLetter 
                          isOpen={true} 
                          isInline={true}
                          onClose={() => switchTab('home')} 
                          messages={loveLetters}
                          onSendMessage={handleSendMessage}
                          partners={activePartners}
                        />
                      </motion.div>
                   )}
                </div>
      
                {/* Bottom Navigation Tab Bar */}
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md border border-white/50 shadow-2xl rounded-full px-6 py-3 flex items-center gap-8 z-[70]">
                   <button 
                     onClick={() => switchTab('home')}
                     className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'home' ? 'text-pink-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     <i className="fas fa-home text-xl"></i>
                     <span className="text-[10px] font-bold uppercase tracking-wide">Home</span>
                   </button>
      
                   <button 
                     onClick={() => switchTab('timeline')}
                     className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'timeline' ? 'text-blue-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     <i className="fas fa-calendar-alt text-xl"></i>
                     <span className="text-[10px] font-bold uppercase tracking-wide">Timeline</span>
                   </button>
      
                   <button 
                     onClick={() => switchTab('coupons')}
                     className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'coupons' ? 'text-purple-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     <i className="fas fa-ticket-alt text-xl"></i>
                     <span className="text-[10px] font-bold uppercase tracking-wide">Coupons</span>
                   </button>
      
                   <button 
                     onClick={() => switchTab('letters')}
                     className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${activeTab === 'letters' ? 'text-rose-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     <i className="fas fa-envelope text-xl"></i>
                     <span className="text-[10px] font-bold uppercase tracking-wide">Letters</span>
                     {loveLetters.filter(l => !l.isRead).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm animate-pulse">
                          {loveLetters.filter(l => !l.isRead).length}
                        </span>
                     )}
                   </button>
                </div>
      
              </motion.div>
            )}
    </>
  );
};
