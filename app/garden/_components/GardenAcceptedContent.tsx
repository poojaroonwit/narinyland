"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../../components/AuthProvider';
import { motion } from 'framer-motion';
import Timeline from '../../../components/Timeline';
import { CoupleWorldAdventure } from '../../../components/couple-world/CoupleWorldAdventure';
import LoveCoupons from '../../../components/LoveCoupons';
import LoveLetter from '../../../components/LoveLetter';
import Shop from '../../../components/Shop';
import { purchasedItemsAPI, statsAPI } from '../../../services/api';
import { useGardenPageContext } from './context';

export const GardenAcceptedContent: React.FC = () => {
  const { activeCircleId } = useAuth();
  const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);
  React.useEffect(() => {
    if (!mobileMoreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileMoreOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMoreOpen]);
  const {
    hasAcceptedProposal,
    configLoaded,
    activeTab,
    appConfig,
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

  if (!configLoaded || !hasAcceptedProposal) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-none relative z-10 flex h-full w-full flex-col">
      <div className={`flex-1 overflow-x-hidden overflow-y-auto pb-28 ${activeTab === 'home' ? 'pointer-events-none' : 'pointer-events-auto'}`}>
        {activeTab === 'quests' && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full justify-center px-2 pt-20 sm:px-5 md:pt-24"
          >
            <CoupleWorldAdventure key={activeCircleId || 'no-world'} />
          </motion.div>
        )}

        {activeTab === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex w-full justify-center px-3 pt-20 md:pt-24"
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
            className="flex w-full justify-center overflow-y-auto px-4 pt-20 md:pt-24"
          >
            <Shop
              points={loveStats.points}
              activeLandId={activeLand?.id}
              onPurchase={async (item) => {
                const landId = activeLand?.id;
                if (!landId) {
                  throw new Error('Choose a Land before purchasing.');
                }
                let newItem;
                try {
                  newItem = await purchasedItemsAPI.create({ type: item.type, landId, modelUrl: item.modelUrl, requestId: item.requestId });
                } catch (error) {
                  showToast('Purchase was not confirmed. Retrying the same item is safe.');
                  throw error;
                }
                // The server transaction is authoritative. A failed stats refresh
                // must not turn a committed purchase into a false purchase failure.
                setAppConfig((previous: typeof appConfig) => ({
                  ...previous,
                  lands: previous.lands?.map((land: { id: string; items?: unknown[] }) => (
                    land.id === landId
                      ? { ...land, items: (land.items || []).some((existing: any) => existing.id === newItem.id)
                        ? land.items
                        : [...(land.items || []), newItem] }
                      : land
                  )),
                }));
                showToast(`You bought a ${item.name}! 🛍️`);
                void statsAPI.get()
                  .then((latest) => setLoveStats((previous: typeof loveStats) => ({ ...previous, ...latest })))
                  .catch((error) => console.warn('Purchase completed; stats refresh pending:', error));
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
        className="cozy-nav pointer-events-auto fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-[70] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-[1.35rem] p-1.5 sm:gap-2 sm:p-2 md:bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
        aria-label="Garden navigation"
      >
        <button type="button" onClick={() => switchTab('home')} data-active={activeTab === 'home'} aria-current={activeTab === 'home' ? 'page' : undefined}
          className="cozy-nav-item flex min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2 sm:min-w-[76px]">
          <i className="fas fa-house-chimney text-lg" aria-hidden="true" />
          <span className="text-[10px] font-semibold sm:text-xs">Home</span>
        </button>
        <Link href="/world" aria-label="Explore Narinyland Commons" className="cozy-nav-item flex min-w-[48px] flex-1 flex-col items-center gap-1 px-1 py-2 sm:min-w-[76px]">
          <i className="fas fa-tree text-lg" aria-hidden="true" />
          <span className="text-[10px] font-semibold sm:text-xs">Explore</span>
        </Link>
        <button type="button" onClick={() => switchTab('quests')} data-active={activeTab === 'quests'} aria-current={activeTab === 'quests' ? 'page' : undefined}
          className="cozy-nav-item flex min-w-[62px] flex-1 flex-col items-center gap-1 px-1.5 py-2 sm:min-w-[84px]">
          <i className="fas fa-map-signs text-lg" aria-hidden="true" />
          <span className="text-[10px] font-semibold sm:text-xs">Adventures</span>
        </button>
        <button type="button" onClick={() => switchTab('timeline')} data-active={activeTab === 'timeline'} aria-current={activeTab === 'timeline' ? 'page' : undefined}
          className="cozy-nav-item hidden min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2 sm:flex sm:min-w-[76px]">
          <i className="fas fa-book-open text-lg" aria-hidden="true" />
          <span className="text-[10px] font-semibold sm:text-xs">Timeline</span>
        </button>
        <button type="button" onClick={() => switchTab('coupons')} data-active={activeTab === 'coupons'} aria-current={activeTab === 'coupons' ? 'page' : undefined}
          className="cozy-nav-item hidden min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2 sm:flex sm:min-w-[76px]">
          <i className="fas fa-gift text-lg" aria-hidden="true" />
          <span className="text-[10px] font-semibold sm:text-xs">Coupons</span>
        </button>
        <button type="button" onClick={() => switchTab('letters')} data-active={activeTab === 'letters'} aria-current={activeTab === 'letters' ? 'page' : undefined}
          className="cozy-nav-item relative hidden min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2 sm:flex sm:min-w-[76px]">
          <i className="fas fa-envelope-open-text text-lg" aria-hidden="true" />
          <span className="text-[10px] font-semibold sm:text-xs">Letters</span>
          {loveLetters.filter((letter: { isRead?: boolean }) => !letter.isRead).length > 0 && (
            <span className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#aa6659] px-1 text-[10px] font-semibold text-white"
              aria-label={loveLetters.filter((letter: { isRead?: boolean }) => !letter.isRead).length + ' unread letters'}>
              {loveLetters.filter((letter: { isRead?: boolean }) => !letter.isRead).length}
            </span>
          )}
        </button>
        <button type="button" onClick={() => switchTab('shop')} data-active={activeTab === 'shop'} aria-current={activeTab === 'shop' ? 'page' : undefined}
          className="cozy-nav-item hidden min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2 sm:flex sm:min-w-[76px]">
          <i className="fas fa-store text-lg" aria-hidden="true" />
          <span className="text-[10px] font-semibold sm:text-xs">Shop</span>
        </button>
        <button type="button" onClick={() => setMobileMoreOpen((open) => !open)} aria-expanded={mobileMoreOpen} aria-controls="garden-mobile-more"
          className="cozy-nav-item flex min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2 sm:hidden">
          <i className="fas fa-ellipsis text-lg" aria-hidden="true" />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </nav>
      {mobileMoreOpen && (
        <>
          <button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close more navigation" className="pointer-events-auto fixed inset-0 z-[72] bg-stone-900/30 sm:hidden" />
          <section id="garden-mobile-more" role="dialog" aria-modal="true" aria-label="More garden pages"
            className="cozy-surface pointer-events-auto fixed bottom-[calc(6.1rem+env(safe-area-inset-bottom))] left-3 right-3 z-[75] grid grid-cols-2 gap-2 rounded-2xl p-4 shadow-xl sm:hidden">
            {([
              { id: 'timeline', label: 'Timeline', icon: 'fa-book-open' },
              { id: 'coupons', label: 'Coupons', icon: 'fa-gift' },
              { id: 'letters', label: 'Letters', icon: 'fa-envelope-open-text' },
              { id: 'shop', label: 'World Shop', icon: 'fa-store' },
            ] as const).map((destination) => (
              <button key={destination.id} type="button" onClick={() => { setMobileMoreOpen(false); switchTab(destination.id); }}
                className="min-h-[48px] rounded-xl bg-[#f5efe4] px-3 text-sm font-semibold text-[#584c41]">
                <i className={`fas ${destination.icon} mr-2`} aria-hidden="true" />{destination.label}
              </button>
            ))}
            <button type="button" onClick={() => setMobileMoreOpen(false)} className="col-span-2 min-h-[44px] text-xs font-semibold text-stone-500">Close</button>
          </section>
        </>
      )}
    </motion.div>
  );
};
