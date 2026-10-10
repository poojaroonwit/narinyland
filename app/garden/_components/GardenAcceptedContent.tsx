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
import { purchasedItemsAPI } from '../../../services/api';
import { useGardenPageContext } from './context';

export const GardenAcceptedContent: React.FC = () => {
  const { activeCircleId } = useAuth();
  const {
    hasAcceptedProposal,
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
  const [moreOpen, setMoreOpen] = React.useState(false);
  const unreadLetters = loveLetters.filter((letter: { isRead?: boolean }) => !letter.isRead).length;
  const moreIsActive = ['timeline', 'coupons', 'letters', 'shop'].includes(activeTab);

  React.useEffect(() => { setMoreOpen(false); }, [activeTab]);
  React.useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  const navigate = (tab: 'home' | 'quests' | 'timeline' | 'coupons' | 'letters' | 'shop') => {
    setMoreOpen(false);
    switchTab(tab);
  };

  if (!hasAcceptedProposal) return null;

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

      {/* Mobile navigation stays visible without horizontal scrolling. */}
      <div className="fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[70] sm:hidden">
        {moreOpen && (
          <>
            <button
              type="button"
              aria-label="Close more destinations"
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-0 bg-[#30291f]/30 backdrop-blur-[2px]"
            />
            <div
              id="garden-more-destinations"
              role="dialog"
              aria-label="More destinations"
              className="cozy-surface absolute bottom-[calc(100%+0.65rem)] left-1/2 z-10 grid w-[min(94vw,26rem)] -translate-x-1/2 grid-cols-2 gap-2 rounded-[1.4rem] p-3 shadow-xl"
            >
              <button type="button" onClick={() => navigate('timeline')} aria-current={activeTab === 'timeline' ? 'page' : undefined} className="cozy-nav-item min-h-14 rounded-xl bg-[#f7f0e5] p-3 text-left text-sm font-semibold" data-active={activeTab === 'timeline'}>📖 Timeline</button>
              <button type="button" onClick={() => navigate('coupons')} aria-current={activeTab === 'coupons' ? 'page' : undefined} className="cozy-nav-item min-h-14 rounded-xl bg-[#f7f0e5] p-3 text-left text-sm font-semibold" data-active={activeTab === 'coupons'}>🎁 Coupons</button>
              <button type="button" onClick={() => navigate('letters')} aria-current={activeTab === 'letters' ? 'page' : undefined} className="cozy-nav-item min-h-14 rounded-xl bg-[#f7f0e5] p-3 text-left text-sm font-semibold" data-active={activeTab === 'letters'}>
                💌 Letters {unreadLetters > 0 && <span className="ml-1 rounded-full bg-[#aa6659] px-1.5 py-0.5 text-xs text-white">{unreadLetters}</span>}
              </button>
              <button type="button" onClick={() => navigate('shop')} aria-current={activeTab === 'shop' ? 'page' : undefined} className="cozy-nav-item min-h-14 rounded-xl bg-[#f7f0e5] p-3 text-left text-sm font-semibold" data-active={activeTab === 'shop'}>🛍️ Shop</button>
            </div>
          </>
        )}
        <nav className="cozy-nav relative z-20 mx-auto grid w-[min(94vw,26rem)] grid-cols-4 gap-1 rounded-[1.4rem] p-1.5" aria-label="Garden navigation">
          <button type="button" onClick={() => navigate('home')} data-active={activeTab === 'home'} aria-current={activeTab === 'home' ? 'page' : undefined} className="cozy-nav-item flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold">
            <i className="fas fa-house-chimney text-lg" aria-hidden="true" />Home
          </button>
          <Link href="/world" aria-label="Explore Narinyland Commons" className="cozy-nav-item flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold">
            <i className="fas fa-tree text-lg" aria-hidden="true" />Explore
          </Link>
          <button type="button" onClick={() => navigate('quests')} data-active={activeTab === 'quests'} aria-current={activeTab === 'quests' ? 'page' : undefined} className="cozy-nav-item flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold">
            <i className="fas fa-map-signs text-lg" aria-hidden="true" />Adventure
          </button>
          <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-controls="garden-more-destinations" data-active={moreIsActive || moreOpen} className="cozy-nav-item relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold">
            <i className="fas fa-ellipsis text-lg" aria-hidden="true" />More
            {unreadLetters > 0 && <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[#aa6659]" aria-label={unreadLetters + ' unread letters'} />}
          </button>
        </nav>
      </div>

      <nav
        className="cozy-nav pointer-events-auto fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-[70] hidden max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[1.35rem] p-2 sm:flex"
        aria-label="Garden navigation"
      >
        <button type="button" onClick={() => navigate('home')} data-active={activeTab === 'home'} aria-current={activeTab === 'home' ? 'page' : undefined} className="cozy-nav-item flex min-w-[68px] flex-col items-center gap-1 px-2 py-2">
          <i className="fas fa-house-chimney text-lg" aria-hidden="true" /><span className="text-xs font-semibold">Home</span>
        </button>
        <Link href="/world" aria-label="Explore Narinyland Commons" className="cozy-nav-item flex min-w-[68px] flex-col items-center gap-1 px-2 py-2">
          <i className="fas fa-tree text-lg" aria-hidden="true" /><span className="text-xs font-semibold">Explore</span>
        </Link>
        <button type="button" onClick={() => navigate('quests')} data-active={activeTab === 'quests'} aria-current={activeTab === 'quests' ? 'page' : undefined} className="cozy-nav-item flex min-w-[80px] flex-col items-center gap-1 px-2 py-2">
          <i className="fas fa-map-signs text-lg" aria-hidden="true" /><span className="text-xs font-semibold">Adventures</span>
        </button>
        <button type="button" onClick={() => navigate('timeline')} data-active={activeTab === 'timeline'} aria-current={activeTab === 'timeline' ? 'page' : undefined} className="cozy-nav-item flex min-w-[68px] flex-col items-center gap-1 px-2 py-2">
          <i className="fas fa-book-open text-lg" aria-hidden="true" /><span className="text-xs font-semibold">Timeline</span>
        </button>
        <button type="button" onClick={() => navigate('coupons')} data-active={activeTab === 'coupons'} aria-current={activeTab === 'coupons' ? 'page' : undefined} className="cozy-nav-item flex min-w-[68px] flex-col items-center gap-1 px-2 py-2">
          <i className="fas fa-gift text-lg" aria-hidden="true" /><span className="text-xs font-semibold">Coupons</span>
        </button>
        <button type="button" onClick={() => navigate('letters')} data-active={activeTab === 'letters'} aria-current={activeTab === 'letters' ? 'page' : undefined} className="cozy-nav-item relative flex min-w-[68px] flex-col items-center gap-1 px-2 py-2">
          <i className="fas fa-envelope-open-text text-lg" aria-hidden="true" /><span className="text-xs font-semibold">Letters</span>
          {unreadLetters > 0 && <span className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#aa6659] px-1 text-[10px] font-semibold text-white" aria-label={unreadLetters + ' unread letters'}>{unreadLetters}</span>}
        </button>
        <button type="button" onClick={() => navigate('shop')} data-active={activeTab === 'shop'} aria-current={activeTab === 'shop' ? 'page' : undefined} className="cozy-nav-item flex min-w-[68px] flex-col items-center gap-1 px-2 py-2">
          <i className="fas fa-bag-shopping text-lg" aria-hidden="true" /><span className="text-xs font-semibold">Shop</span>
        </button>
      </nav>
    </motion.div>
  );
};
