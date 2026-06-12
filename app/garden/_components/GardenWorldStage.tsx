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
import WorldMMO3D from '../../../components/mmo-world/WorldMMO3D';
import { purchasedItemsAPI } from '../../../services/api';
import { useGardenPageContext } from './context';

export const GardenWorldStage: React.FC = () => {
  const { user, logout, authLoading, circles, activeCircleId, setActiveCircle, hasAcceptedProposal, setHasAcceptedProposal, isLetterOpen, setIsLetterOpen, isEditDrawerOpen, setIsEditDrawerOpen, isSpreadsheetOpen, setIsSpreadsheetOpen, isStatsGuideOpen, setIsStatsGuideOpen, isVolumeModalOpen, setIsVolumeModalOpen, musicVolume, setMusicVolume, isMusicPlaying, setIsMusicPlaying, isMusicMuted, setIsMusicMuted, isMobile, deferredPrompt, setDeferredPrompt, isUserProfileModalOpen, setIsUserProfileModalOpen, showInstallPrompt, setShowInstallPrompt, toast, setToast, showToast, petEmotion, setPetEmotion, petMessage, setPetMessage, loveStats, setLoveStats, loveLetters, setLoveLetters, appConfig, setAppConfig, handleSetAppConfig, circleMembers, setCircleMembers, activePartners, galleryViewMode, setGalleryViewMode, activeTab, setActiveTab, worldMode, setWorldMode, isLandDropdownOpen, setIsLandDropdownOpen, isCircleDropdownOpen, setIsCircleDropdownOpen, isUserDropdownOpen, setIsUserDropdownOpen, selectedFlagItem, setSelectedFlagItem, isEditMode, setIsEditMode, configLoaded, setConfigLoaded, closeFloatingPanels, toggleVolumePanel, toggleCircleDropdown, toggleLandDropdown, switchTab, handleSelectLand, handleInstallApp, addXP, handleAddLeaf, handleProposalStepChange, handleProposalAccepted, handleRedeemCoupon, handleAddCoupon, handleDeleteCoupon, handleSendMessage, handleUpdateMessage, handleUpdateTimeline, handleAddTimeline, handleDeleteTimeline, handleMassTimelineUpdate, combinedInteractions, handleTimelineConfigUpdate, daysTogether, flowerCount } = useGardenPageContext();
  const activeLand = appConfig.lands?.find(l => l.isActive) ?? appConfig.lands?.[0];

  return (
    <>
              {/* Fullscreen Background & Tree/Globe */}
              <div className="fixed inset-0 z-0">
                 {worldMode === 'tree' ? (
                   <>
                     <LoveTree3D
                       anniversaryDate={appConfig.anniversaryDate}
                       treeStyle={appConfig.treeStyle}
                       petEmotion={petEmotion}
                       petMessage={petMessage}
                       level={loveStats.level}
                       daysPerTree={appConfig.daysPerTree}
                       daysPerFlower={appConfig.daysPerFlower}
                       flowerType={appConfig.flowerType}
                       mixedFlowers={appConfig.mixedFlowers}
                       leaves={loveStats.leaves}
                       points={loveStats.points}
                       skyMode={appConfig.skyMode}
                       showQRCode={appConfig.showQRCode}
                       petType={appConfig.petType}
                       pets={appConfig.pets}
                       albums={appConfig.albums}
                       graphicsQuality={appConfig.graphicsQuality}
                       isEditMode={isEditMode}
                       setIsEditMode={setIsEditMode}
                       onAddLeaf={handleAddLeaf}
                       purchasedItems={activeLand?.items}
                        onUpdateItemPosition={async (itemId, update) => {
                          const { x, y, z, rotation } = update;
                          const landId = activeLand?.id;
                          if (!landId) return;

                          try {
                             if (itemId === 'main_tree') {
                                const newItem = await purchasedItemsAPI.create({
                                  type: 'main_tree',
                                  landId,
                                  x,
                                  y,
                                  z,
                                  ...(rotation !== undefined ? { rotation } : {}),
                                });
                                setAppConfig(prev => ({
                                  ...prev,
                                  lands: prev.lands?.map(l => l.id === landId ? { ...l, items: [...(l.items || []), newItem] } : l)
                                }));
                                return;
                             }

                             setAppConfig(prev => {
                                if (!prev.lands) return prev;
                                const newLands = prev.lands.map(l => {
                                   if (l.id !== activeLand?.id) return l;
                                   return {
                                       ...l,
                                       items: l.items?.map(it => it.id === itemId ? {
                                         ...it,
                                         x,
                                         y,
                                         z,
                                         ...(rotation !== undefined ? { rotation } : {}),
                                       } : it)
                                   };
                                });
                                return { ...prev, lands: newLands };
                             });
      
                             await purchasedItemsAPI.update(itemId, { x, y, z, ...(rotation !== undefined ? { rotation } : {}) });
                          } catch (e) {
                             console.error("Failed to update item position", e);
                          }
                       }}
                       activeLandId={activeLand?.id}
                       onPurchase={async (item) => {
                          try {
                            const landId = activeLand?.id;
                            if (!landId) return;
                            setLoveStats(prev => ({ ...prev, points: prev.points - item.price }));
                            const newItem = await purchasedItemsAPI.create({ type: item.type, landId, modelUrl: item.modelUrl });
                            setAppConfig(prev => ({
                              ...prev,
                              lands: prev.lands?.map(l => l.id === landId ? { ...l, items: [...(l.items || []), newItem] } : l)
                            }));
                            showToast(`You bought a ${item.name}! 🛍️`);
                          } catch (err) {
                            console.error("Purchase error", err);
                            setLoveStats(prev => ({ ...prev, points: prev.points + item.price }));
                            showToast("Purchase failed. Please try again.");
                          }
                       }}
                     />
      
                   </>
                 ) : (
                   <>
                     <WorldMMO3D
                        user={user}
                        activeCircleId={activeCircleId}
                        circleName={circles.find(circle => circle.id === activeCircleId)?.name || appConfig.appName}
                        activeLandId={activeLand?.id}
                        activeLandName={activeLand?.name}
                        circleMembers={circleMembers}
                        landObjects={activeLand?.items || []}
                        quality={appConfig.graphicsQuality}
                        timeline={appConfig.timeline}
                        memories={appConfig.gallery}
                        coupons={appConfig.coupons}
                        loveLetters={loveLetters}
                        onFlagClick={(item) => setSelectedFlagItem(item)}
                     />
                  </>
                 )}
              </div>
              
              {/* Selected Flag Modal */}
      
              <AnimatePresence>
                {selectedFlagItem && (
                   <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                      onClick={() => setSelectedFlagItem(null)}
                   >
                      <motion.div 
                         className="bg-white rounded-md p-6 max-w-sm w-full shadow-2xl overflow-hidden"
                         onClick={(e) => e.stopPropagation()}
                         initial={{ scale: 0.9, y: 20 }}
                         animate={{ scale: 1, y: 0 }}
                         exit={{ scale: 0.9, y: 20 }}
                      >
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <h3 className="font-pacifico text-2xl text-pink-500">Memory</h3>
                               <p className="text-xs font-bold text-gray-400">{new Date(selectedFlagItem.timestamp).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setSelectedFlagItem(null)} className="text-gray-400 hover:text-gray-600">
                               <i className="fas fa-times text-xl"></i>
                            </button>
                         </div>
                         
                         {selectedFlagItem.mediaItems?.[0] && selectedFlagItem.mediaItems[0].type === 'image' && (
                           <div className="relative rounded-md overflow-hidden mb-4 shadow-sm border-2 border-pink-50 h-48">
                              <Image
                                src={selectedFlagItem.mediaItems[0].url}
                                alt="Memory media"
                                fill
                                unoptimized
                                sizes="(min-width: 640px) 384px, calc(100vw - 2rem)"
                                className="object-cover"
                              />
                           </div>
                         )}
                         
                         <p className="text-gray-700 font-medium mb-4">{selectedFlagItem.text}</p>
                         
                         {selectedFlagItem.location && (
                           <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-500 bg-purple-50 px-3 py-2 rounded-md">
                              <i className="fas fa-map-marker-alt"></i>
                              <span>{selectedFlagItem.location}</span>
                           </div>
                         )}
                         
                         <button 
                           onClick={() => {
                             setSelectedFlagItem(null);
                             if (worldMode === 'tree') switchTab('timeline');
                           }} 
                           className="mt-6 w-full py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-md shadow-md hover:shadow-lg transition-all"
                         >
                            {worldMode === 'tree' ? 'View on Timeline' : 'Back to World'}
                         </button>
                      </motion.div>
                   </motion.div>
                )}
              </AnimatePresence>
      
            
            <AnimatePresence>
              {configLoaded && appConfig.showProposal && !hasAcceptedProposal && (
                <ProposalScreen 
                  onAccept={handleProposalAccepted} 
                  onStepChange={handleProposalStepChange}
                  questions={appConfig.proposal} 
                  appName={appConfig.appName} 
                />
              )}
            </AnimatePresence>
    </>
  );
};
