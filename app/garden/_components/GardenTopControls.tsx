"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import UserDropdown from '../../../components/UserDropdown';
import UserProfileModal from '../../../components/UserProfileModal';
import { circlesAPI, landsAPI } from '../../../services/api';
import { getErrorMessage } from '../../../lib/errors';
import { useGardenPageContext } from './context';

export const GardenTopControls: React.FC = () => {
  const {
    user,
    logout,
    authLoading,
    circles,
    activeCircleId,
    setActiveCircle,
    refreshUser,
    setIsEditDrawerOpen,
    isUserProfileModalOpen,
    setIsUserProfileModalOpen,
    isMusicMuted,
    appConfig,
    setAppConfig,
    setCircleMembers,
    isLandDropdownOpen,
    setIsLandDropdownOpen,
    isCircleDropdownOpen,
    setIsCircleDropdownOpen,
    isUserDropdownOpen,
    setIsUserDropdownOpen,
    setConfigLoaded,
    closeFloatingPanels,
    toggleVolumePanel,
    toggleCircleDropdown,
    toggleLandDropdown,
    handleSelectLand,
    showToast,
    isMobile,
    activeTab,
  } = useGardenPageContext();

  const activeLand = appConfig.lands?.find((land: { isActive?: boolean }) => land.isActive) ?? appConfig.lands?.[0];
  const [newWorldName, setNewWorldName] = React.useState('');
  const [newLandName, setNewLandName] = React.useState('');
  const [isCreatingWorld, setIsCreatingWorld] = React.useState(false);
  const [isCreatingLand, setIsCreatingLand] = React.useState(false);

  const handleCreateWorld = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newWorldName.trim();
    if (!name || isCreatingWorld) return;

    setIsCreatingWorld(true);
    try {
      const result = await circlesAPI.create({ name });
      const circleId = result.circleId || result.id;
      if (!circleId) throw new Error('The new world did not return an ID.');

      const defaultLand = result.defaultLand
        ? { ...result.defaultLand, isActive: true, items: result.defaultLand.items || [] }
        : null;

      setConfigLoaded(false);
      setAppConfig((previous: Record<string, unknown>) => ({
        ...previous,
        ...(result.config || {}),
        appName: name,
        gallery: [],
        timeline: [],
        coupons: [],
        albums: [],
        lands: defaultLand ? [defaultLand] : [],
      }));
      setCircleMembers(user?.sub ? [{
        id: user.sub,
        userId: user.sub,
        name: user.name || 'You',
        avatar: user.picture || '',
        role: result.role || 'member',
      }] : []);

      setNewWorldName('');
      setIsCircleDropdownOpen(false);
      await setActiveCircle(circleId, {
        name: result.name || name,
        description: typeof result.description === 'string' ? result.description : name,
        role: result.role || 'member',
      });
      await refreshUser?.();
      showToast?.(`Created world “${name}”`);
    } catch (error) {
      showToast?.(`Could not create world: ${getErrorMessage(error)}`);
    } finally {
      setIsCreatingWorld(false);
    }
  };

  const handleCreateLand = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newLandName.trim();
    if (!name || isCreatingLand || !activeCircleId) return;

    setIsCreatingLand(true);
    try {
      const createdLand = await landsAPI.create(name);
      const activeCreatedLand = createdLand.isActive ? createdLand : await landsAPI.setActive(createdLand.id);
      const normalizedCreatedLand = { ...activeCreatedLand, isActive: true, items: activeCreatedLand.items || [] };

      setAppConfig((previous: { lands?: Array<{ id: string; isActive?: boolean }> } & Record<string, unknown>) => ({
        ...previous,
        lands: [
          ...(previous.lands || [])
            .filter((land) => land.id !== normalizedCreatedLand.id)
            .map((land) => ({ ...land, isActive: false })),
          normalizedCreatedLand,
        ],
      }));

      setNewLandName('');
      setIsLandDropdownOpen(false);
      showToast?.(`Created land “${name}”`);
    } catch (error) {
      showToast?.(`Could not create land: ${getErrorMessage(error)}`);
    } finally {
      setIsCreatingLand(false);
    }
  };

  const selectLand = async (landId: string) => {
    setIsLandDropdownOpen(false);
    try {
      await handleSelectLand(landId);
    } catch (error) {
      showToast?.(`Could not switch land: ${getErrorMessage(error)}`);
    }
  };

  const userForMenu = user
    ? { name: user.name || 'My Account', email: user.email || '', picture: user.picture || '' }
    : null;

  return (
    <>
      <div className={`fixed right-3 z-[70] flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 sm:gap-2 md:right-5 ${activeTab === 'home' ? 'top-[calc(5.4rem+env(safe-area-inset-top))]' : 'top-[calc(0.9rem+env(safe-area-inset-top))]'}`}>
        <button
          type="button"
          onClick={toggleVolumePanel}
          className={`cozy-float flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors hover:bg-[#f2ebdf] ${isMusicMuted ? 'text-[#88796b]' : 'text-[#446e55]'}`}
          aria-label={isMusicMuted ? 'Open sound controls' : 'Open music controls'}
        >
          <i className={`fas ${isMusicMuted ? 'fa-volume-mute' : 'fa-music'} text-xs`} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={toggleCircleDropdown}
            className="cozy-float flex h-11 min-w-0 items-center gap-2 rounded-2xl px-3 text-[#51483d] transition-colors hover:bg-[#f2ebdf] sm:px-4"
            aria-expanded={isCircleDropdownOpen}
          >
            <i className="fas fa-globe-asia text-xs text-[#54785c]" />
            <span className="max-w-[68px] truncate text-xs font-semibold sm:max-w-[100px] md:max-w-[140px]">
              {circles.find((circle: { id: string }) => circle.id === activeCircleId)?.name || 'Select World'}
            </span>
            <i className={`fas fa-chevron-down text-[10px] opacity-40 transition-transform ${isCircleDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isCircleDropdownOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCircleDropdownOpen(false)}
                  className="fixed inset-0 z-[75] bg-[#322c24]/35 backdrop-blur-sm md:hidden"
                />
                <motion.div
                  initial={isMobile ? { y: '100%' } : { opacity: 0, y: -10, scale: 0.95 }}
                  animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={isMobile ? { y: '100%' } : { opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="cozy-surface fixed bottom-0 z-[80] w-full overflow-hidden rounded-t-[2rem] md:absolute md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-64 md:rounded-2xl"
                >
                  <div className="flex justify-center pb-2 pt-4 md:hidden"><div className="h-1.5 w-12 rounded-full bg-gray-200" /></div>
                  <div className="p-6 md:p-1.5">
                    <p className="mb-4 ml-4 text-[10px] font-black uppercase tracking-widest text-pink-500 md:hidden">Switch World</p>
                    <div className="mb-2 hidden items-center justify-between px-2 md:flex">
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-pink-400">Create World</span>
                      <i className="fas fa-circle-plus text-[10px] text-pink-300" />
                    </div>
                    <form onSubmit={handleCreateWorld} className="mb-3 flex items-center gap-2 rounded-xl border border-[#e1d4c1] bg-[#f9f1e6] p-1.5 md:mb-2">
                      <input
                        value={newWorldName}
                        onChange={(event) => setNewWorldName(event.target.value)}
                        maxLength={40}
                        placeholder="New world"
                        aria-label="New world name"
                        disabled={isCreatingWorld}
                        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-bold text-gray-700 outline-none placeholder:text-pink-300 md:text-xs"
                      />
                      <button
                        type="submit"
                        disabled={!newWorldName.trim() || isCreatingWorld}
                        className="cozy-button-primary h-9 w-9 shrink-0 rounded-xl transition-colors"
                        aria-label="Create world"
                      >
                        <i className={`fas ${isCreatingWorld ? 'fa-spinner fa-spin' : 'fa-plus'} text-[11px]`} />
                      </button>
                    </form>
                    <div className="max-h-64 space-y-1 overflow-y-auto md:space-y-0.5">
                      {circles.map((circle: { id: string; name: string }) => (
                        <button
                          type="button"
                          key={circle.id}
                          onClick={async () => {
                            setIsCircleDropdownOpen(false);
                            await setActiveCircle(circle.id, circle);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors md:py-2.5 md:text-xs ${circle.id === activeCircleId ? 'bg-[#54725b] text-white' : 'text-[#665c50] hover:bg-[#eff1e7] hover:text-[#476b55]'}`}
                        >
                          <span className="truncate">{circle.name}</span>
                          {circle.id === activeCircleId && <i className="fas fa-check text-[10px]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-8 md:hidden" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={toggleLandDropdown}
            className="cozy-float flex h-11 min-w-0 items-center gap-2 rounded-2xl px-3 text-[#51483d] transition-colors hover:bg-[#f2ebdf] sm:px-4"
            aria-expanded={isLandDropdownOpen}
          >
            <i className="fas fa-map-marked-alt text-xs text-[#8f7952]" />
            <span className="max-w-[68px] truncate text-xs font-semibold sm:max-w-[100px] md:max-w-[140px]">{activeLand?.name || 'Select Land'}</span>
            <i className={`fas fa-chevron-down text-[10px] opacity-40 transition-transform ${isLandDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isLandDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="cozy-surface absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl p-2"
              >
                <div className="mb-2 flex items-center justify-between px-2 pt-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-500">Create Land</span>
                  <i className="fas fa-circle-plus text-[10px] text-amber-300" />
                </div>
                <form onSubmit={handleCreateLand} className="mb-2 flex items-center gap-2 rounded-xl border border-[#e1d4c1] bg-[#f9f1e6] p-1.5">
                  <input
                    value={newLandName}
                    onChange={(event) => setNewLandName(event.target.value)}
                    maxLength={40}
                    placeholder={activeCircleId ? 'New land' : 'Select world first'}
                    aria-label="New land name"
                    disabled={!activeCircleId || isCreatingLand}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs font-bold text-gray-700 outline-none placeholder:text-amber-300"
                  />
                  <button
                    type="submit"
                    disabled={!activeCircleId || !newLandName.trim() || isCreatingLand}
                    className="cozy-button-primary h-9 w-9 shrink-0 rounded-xl transition-colors"
                    aria-label="Create land"
                  >
                    <i className={`fas ${isCreatingLand ? 'fa-spinner fa-spin' : 'fa-plus'} text-[10px]`} />
                  </button>
                </form>
                <div className="max-h-52 overflow-y-auto">
                  {(appConfig.lands || []).map((land: { id: string; name: string }) => (
                    <button
                      type="button"
                      key={land.id}
                      onClick={() => selectLand(land.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-xs font-semibold transition-colors ${land.id === activeLand?.id ? 'bg-[#54725b] text-white' : 'text-[#665c50] hover:bg-[#eff1e7] hover:text-[#476b55]'}`}
                    >
                      <span className="truncate">{land.name}</span>
                      {land.id === activeLand?.id && <i className="fas fa-check text-[10px]" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <UserDropdown
          user={userForMenu}
          onLogout={logout}
          isOpen={isUserDropdownOpen}
          onOpenChange={(open) => {
            if (open) closeFloatingPanels('user');
            setIsUserDropdownOpen(open);
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
        />
      </div>

      <UserProfileModal isOpen={isUserProfileModalOpen} onClose={() => setIsUserProfileModalOpen(false)} />
    </>
  );
};
