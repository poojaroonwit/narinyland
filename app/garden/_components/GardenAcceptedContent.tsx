"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Timeline from '../../../components/Timeline';
import MemoryFrame from '../../../components/MemoryFrame';
import LoveCoupons from '../../../components/LoveCoupons';
import LoveLetter from '../../../components/LoveLetter';
import Shop from '../../../components/Shop';
import { purchasedItemsAPI } from '../../../services/api';
import { useGardenPageContext } from './context';

export const GardenAcceptedContent: React.FC = () => {
  const {
    hasAcceptedProposal,
    worldMode,
    activeTab,
    appConfig,
    galleryViewMode,
    setGalleryViewMode,
    combinedInteractions,
    handleUpdateTimeline,
    handleDeleteTimeline,
    handleAddTimeline,
    setIsSpreadsheetOpen,
    closeFloatingPanels,
    handleTimelineConfigUpdate,
    handleRedeemCoupon,
    handleDeleteCoupon,
    handleAddCoupon,
    activePartners,
    switchTab,
    loveLetters,
    handleSendMessage,
    loveStats,
    setLoveStats,
    setAppConfig,
    showToast,
  } = useGardenPageContext();

  const activeLand = appConfig.lands?.find((land: { isActive?: boolean }) => land.isActive) ?? appConfig.lands?.[0];
  const shouldRenderLegacyTabs = hasAcceptedProposal && worldMode === 'tree';

  if (!shouldRenderLegacyTabs) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 flex h-full w-full flex-col">
      <div className="flex-1 overflow-x-hidden overflow-y-auto pb-28">
        {activeTab === 'home' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex min-h-full w-full flex-col items-center pt-20"
          >
            <MemoryFrame
              isVisible
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
            <div className="h-24" />
          </motion.div>
        )}

        {activeTab === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex w-full justify-center pt-12 md:pt-24"
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
            className="flex w-full justify-center pt-12 md:pt-24"
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
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full justify-center overflow-y-auto px-4 pt-12 md:pt-24"
          >
            <Shop
              points={loveStats.points}
              activeLandId={activeLand?.id}
              onPurchase={async (item) => {
                const landId = activeLand?.id;
                if (!landId) return;

                setLoveStats((previous: typeof loveStats) => ({ ...previous, points: previous.points - item.price }));
                try {
                  const newItem = await purchasedItemsAPI.create({ type: item.type, landId, modelUrl: item.modelUrl });
                  setAppConfig((previous: typeof appConfig) => ({
                    ...previous,
                    lands: previous.lands?.map((land: { id: string; items?: unknown[] }) => (
                      land.id === landId ? { ...land, items: [...(land.items || []), newItem] } : land
                    )),
                  }));
                  showToast(`You bought a ${item.name}! 🛍️`);
                } catch {
                  setLoveStats((previous: typeof loveStats) => ({ ...previous, points: previous.points + item.price }));
                  showToast('Purchase failed. Please try again.');
                }
              }}
            />
          </motion.div>
        )}

        {activeTab === 'letters' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex h-[calc(100vh-180px)] w-full justify-center px-0 pt-10 md:px-4 md:pt-20"
          >
            <LoveLetter
              isOpen
              isInline
              onClose={() => switchTab('home')}
              messages={loveLetters}
              onSendMessage={handleSendMessage}
              partners={activePartners}
            />
          </motion.div>
        )}
      </div>

      <nav
        className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-6 rounded-full border border-white/50 bg-white/80 px-5 py-3 shadow-2xl backdrop-blur-md md:gap-8 md:px-6"
        aria-label="Garden navigation"
      >
        <button
          type="button"
          onClick={() => switchTab('home')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'home' ? 'scale-110 text-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <i className="fas fa-home text-xl" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Home</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('timeline')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'timeline' ? 'scale-110 text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <i className="fas fa-calendar-alt text-xl" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Timeline</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('coupons')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'coupons' ? 'scale-110 text-purple-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <i className="fas fa-ticket-alt text-xl" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Coupons</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('letters')}
          className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'letters' ? 'scale-110 text-rose-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <i className="fas fa-envelope text-xl" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Letters</span>
          {loveLetters.filter((letter: { isRead?: boolean }) => !letter.isRead).length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm">
              {loveLetters.filter((letter: { isRead?: boolean }) => !letter.isRead).length}
            </span>
          )}
        </button>
      </nav>
    </motion.div>
  );
};
