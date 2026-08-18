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
    setIsMusicMuted,
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
    handleSelectLand,
    showToast,
  } = useGardenPageContext();

  const activeLand = appConfig.lands?.find((land: { isActive?: boolean }) => land.isActive) ?? appConfig.lands?.[0];
  const [newWorldName, setNewWorldName] = React.useState('');
  const [newLandName, setNewLandName] = React.useState('');
  const [isCreatingWorld, setIsCreatingWorld] = React.useState(false);
  const [isCreatingLand, setIsCreatingLand] = React.useState(false);

  const closePanels = React.useCallback(() => {
    setIsCircleDropdownOpen(false);
    setIsLandDropdownOpen(false);
    setIsUserDropdownOpen(false);
  }, [setIsCircleDropdownOpen, setIsLandDropdownOpen, setIsUserDropdownOpen]);

  const handleCreateWorld = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newWorldName.trim();
    if (!name || isCreatingWorld) return;

    setIsCreatingWorld(true);
    try {
      const result = await circlesAPI.create({ name });
      const circleId = result.circleId || result.id;
      if (!circleId) throw new Error('The new family world did not return an ID.');

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
      showToast?.(`Created family world “${name}” 🌱`);
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
      const normalizedCreatedLand = {
        ...activeCreatedLand,
        isActive: true,
        items: activeCreatedLand.items || [],
      };

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
      showToast?.(`Created garden “${name}” 🥕`);
    } catch (error) {
      showToast?.(`Could not create garden: ${getErrorMessage(error)}`);
    } finally {
      setIsCreatingLand(false);
    }
  };

  const selectLand = async (landId: string) => {
    setIsLandDropdownOpen(false);
    try {
      await handleSelectLand(landId);
    } catch (error) {
      showToast?.(`Could not switch garden: ${getErrorMessage(error)}`);
    }
  };

  const userForMenu = user
    ? {
        name: user.name || 'My Account',
        email: user.email || '',
        picture: user.picture || '',
      }
    : null;

  const renderLandList = () => (
    <div className="max-h-52 space-y-1 overflow-y-auto">
      {(appConfig.lands || []).map((land: { id: string; name: string }) => (
        <button
          type="button"
          key={land.id}
          onClick={() => selectLand(land.id)}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-black transition ${
            land.id === activeLand?.id
              ? 'bg-amber-500 text-white'
              : 'text-stone-600 hover:bg-amber-50 hover:text-amber-700'
          }`}
        >
          <span className="truncate">{land.name}</span>
          {land.id === activeLand?.id && <span aria-label="Selected">✓</span>}
        </button>
      ))}
    </div>
  );

  const renderCreateLandForm = () => (
    <form onSubmit={handleCreateLand} className="mb-2 flex gap-2 rounded-2xl bg-amber-50 p-1.5">
      <input
        value={newLandName}
        onChange={(event) => setNewLandName(event.target.value)}
        maxLength={40}
        placeholder={activeCircleId ? 'New garden' : 'Choose world first'}
        aria-label="New garden name"
        disabled={!activeCircleId || isCreatingLand}
        className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs font-bold text-stone-700 outline-none placeholder:text-amber-300"
      />
      <button
        type="submit"
        disabled={!activeCircleId || !newLandName.trim() || isCreatingLand}
        className="rounded-xl bg-amber-500 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isCreatingLand ? '…' : '+ Add'}
      </button>
    </form>
  );

  return (
    <>
      <div className="fixed right-3 top-3 z-[70] flex items-center gap-2 sm:right-5 sm:top-4">
        <button
          type="button"
          onClick={() => setIsMusicMuted((muted: boolean) => !muted)}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/90 text-sm shadow-lg backdrop-blur-xl transition hover:scale-105 hover:bg-white"
          aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
          title={isMusicMuted ? 'Unmute music' : 'Mute music'}
        >
          <span aria-hidden="true">{isMusicMuted ? '🔇' : '🎵'}</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isCircleDropdownOpen;
              closePanels();
              setIsCircleDropdownOpen(next);
            }}
            className="flex h-10 max-w-[126px] items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 text-[10px] font-black text-stone-700 shadow-lg backdrop-blur-xl transition hover:bg-white sm:max-w-[170px] sm:text-xs"
            aria-expanded={isCircleDropdownOpen}
          >
            <span aria-hidden="true">🏘️</span>
            <span className="truncate">{circles.find((circle: { id: string }) => circle.id === activeCircleId)?.name || 'Family world'}</span>
            <span className="text-[8px] text-stone-400" aria-hidden="true">▾</span>
          </button>

          <AnimatePresence>
            {isCircleDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                className="absolute right-0 mt-2 w-[min(310px,calc(100vw-24px))] rounded-[22px] border border-emerald-100 bg-[#fffdf8]/95 p-2 shadow-2xl backdrop-blur-xl"
              >
                <div className="px-2 pb-2 pt-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-600">Family worlds</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-stone-400">Each world can hold its own family and gardens.</p>
                </div>

                <form onSubmit={handleCreateWorld} className="mb-2 flex gap-2 rounded-2xl bg-emerald-50 p-1.5">
                  <input
                    value={newWorldName}
                    onChange={(event) => setNewWorldName(event.target.value)}
                    maxLength={40}
                    placeholder="New family world"
                    aria-label="New family world name"
                    disabled={isCreatingWorld}
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs font-bold text-stone-700 outline-none placeholder:text-emerald-300"
                  />
                  <button
                    type="submit"
                    disabled={!newWorldName.trim() || isCreatingWorld}
                    className="rounded-xl bg-emerald-600 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCreatingWorld ? '…' : '+ Add'}
                  </button>
                </form>

                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {circles.map((circle: { id: string; name: string }) => (
                    <button
                      type="button"
                      key={circle.id}
                      onClick={async () => {
                        setIsCircleDropdownOpen(false);
                        await setActiveCircle(circle.id, circle);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-black transition ${
                        circle.id === activeCircleId
                          ? 'bg-emerald-600 text-white'
                          : 'text-stone-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <span className="truncate">{circle.name}</span>
                      {circle.id === activeCircleId && <span aria-label="Selected">✓</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => {
              const next = !isLandDropdownOpen;
              closePanels();
              setIsLandDropdownOpen(next);
            }}
            className="flex h-10 max-w-[150px] items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 text-xs font-black text-stone-700 shadow-lg backdrop-blur-xl transition hover:bg-white"
            aria-expanded={isLandDropdownOpen}
          >
            <span aria-hidden="true">🥕</span>
            <span className="truncate">{activeLand?.name || 'Garden'}</span>
            <span className="text-[8px] text-stone-400" aria-hidden="true">▾</span>
          </button>

          <AnimatePresence>
            {isLandDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                className="absolute right-0 mt-2 w-64 rounded-[22px] border border-amber-100 bg-[#fffdf8]/95 p-2 shadow-2xl backdrop-blur-xl"
              >
                <div className="px-2 pb-2 pt-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-600">Gardens</p>
                </div>
                {renderCreateLandForm()}
                {renderLandList()}
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
            closePanels();
            setIsUserProfileModalOpen(true);
          }}
          onOpenSettings={() => {
            closePanels();
            setIsEditDrawerOpen(true);
          }}
          loading={authLoading}
        />
      </div>

      <div className="fixed right-[4.75rem] top-[3.6rem] z-[68] sm:hidden">
        <button
          type="button"
          onClick={() => {
            const next = !isLandDropdownOpen;
            closePanels();
            setIsLandDropdownOpen(next);
          }}
          className="rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-black text-stone-600 shadow-md backdrop-blur-xl"
          aria-expanded={isLandDropdownOpen}
        >
          🥕 {activeLand?.name || 'Garden'} ▾
        </button>
        <AnimatePresence>
          {isLandDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 mt-2 w-[min(280px,calc(100vw-24px))] rounded-[20px] border border-amber-100 bg-white/95 p-2 shadow-xl backdrop-blur-xl"
            >
              {renderCreateLandForm()}
              {renderLandList()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UserProfileModal isOpen={isUserProfileModalOpen} onClose={() => setIsUserProfileModalOpen(false)} />
    </>
  );
};
