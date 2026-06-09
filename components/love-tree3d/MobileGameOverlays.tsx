"use client";

import React from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Shop, { ShopItem } from '../Shop';
import { PurchasedItem } from '../../types';
import { MovementInput } from '../game-engine-3d';

type GardenQuest = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  icon: string;
};

type MobileGameOverlaysProps = {
  isEditMode: boolean;
  setIsEditMode?: (val: boolean) => void;
  cameraMode: 'orbit' | 'explore';
  setCameraMode: React.Dispatch<React.SetStateAction<'orbit' | 'explore'>>;
  points: number;
  landName?: string;
  toggleBuildMode: () => void;
  canGrowLeaf: boolean;
  onAddLeaf: () => void;
  onOpenWorldMap?: () => void;
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  gardenQuests: GardenQuest[];
  pressMovement: (key: keyof MovementInput, pressed: boolean) => void;
  selectedItem: PurchasedItem | null;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
  rotateSelectedItem: (delta: number) => void;
  isShopPopoverOpen: boolean;
  toggleShopPopover: () => void;
  onPurchase?: (item: ShopItem) => Promise<void>;
  activeLandId?: string;
  showQRCode: boolean;
  openQRUpload: () => void;
  isQRUploadOpen: boolean;
  setIsQRUploadOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedAlbumId: string;
  setSelectedAlbumId: React.Dispatch<React.SetStateAction<string>>;
  albums: Array<{ id: string; name: string }>;
};

const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;

const actionButtonBase =
  "grid h-14 w-14 place-items-center rounded-full border border-[#fff8ec]/80 bg-[#fff8ec]/88 text-stone-800 shadow-[0_12px_28px_rgba(63,47,31,0.22)] backdrop-blur-xl transition active:scale-95";

const stopMovement = (pressMovement: MobileGameOverlaysProps['pressMovement']) => {
  pressMovement('forward', false);
  pressMovement('back', false);
  pressMovement('left', false);
  pressMovement('right', false);
};

const moveHandlers = (
  key: keyof MovementInput,
  pressMovement: MobileGameOverlaysProps['pressMovement']
) => ({
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pressMovement(key, true);
  },
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    pressMovement(key, false);
  },
  onPointerCancel: () => pressMovement(key, false),
  onPointerLeave: () => pressMovement(key, false),
});

export const MobileGameOverlays: React.FC<MobileGameOverlaysProps> = ({
  isEditMode,
  setIsEditMode,
  cameraMode,
  setCameraMode,
  points,
  landName,
  toggleBuildMode,
  canGrowLeaf,
  onAddLeaf,
  onOpenWorldMap,
  snapToGrid,
  setSnapToGrid,
  gardenQuests,
  pressMovement,
  selectedItem,
  setSelectedItemId,
  rotateSelectedItem,
  isShopPopoverOpen,
  toggleShopPopover,
  onPurchase,
  activeLandId,
  showQRCode,
  openQRUpload,
  isQRUploadOpen,
  setIsQRUploadOpen,
  selectedAlbumId,
  setSelectedAlbumId,
  albums,
}) => {
  const completedQuests = gardenQuests.filter(quest => quest.done).length;
  const uploadUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/upload${selectedAlbumId ? `?albumId=${selectedAlbumId}` : ''}`
      : 'https://example.com/upload';

  const activateExplore = () => {
    setIsEditMode?.(false);
    setCameraMode('explore');
  };

  const activateOrbit = () => {
    setIsEditMode?.(false);
    setCameraMode('orbit');
    stopMovement(pressMovement);
  };

  return createPortal(
    <>
      <div className="pointer-events-none fixed inset-0 z-[65] bg-[linear-gradient(180deg,rgba(60,42,24,0.18)_0%,rgba(60,42,24,0)_28%,rgba(29,22,14,0)_62%,rgba(29,22,14,0.24)_100%)]" />

      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[75] px-3 sm:px-5"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="pointer-events-auto min-w-0 rounded-[1.35rem] border border-[#fff6df]/80 bg-[#fff8ec]/86 px-3.5 py-3 shadow-[0_18px_38px_rgba(52,39,24,0.22)] backdrop-blur-xl sm:px-4"
          >
            <div className="flex items-center gap-2.5">
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                isEditMode ? 'bg-amber-500 text-white' : cameraMode === 'explore' ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-white'
              }`}>
                <i className={`fas ${isEditMode ? 'fa-hammer' : cameraMode === 'explore' ? 'fa-shoe-prints' : 'fa-street-view'} text-[13px]`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {isEditMode ? 'Build' : cameraMode === 'explore' ? 'Explore' : 'Orbit'}
                </p>
                <p className="truncate text-sm font-black leading-tight text-stone-800 sm:text-base">
                  {isEditMode ? 'Arrange the land' : landName ?? (cameraMode === 'explore' ? 'Garden walk' : 'Look around')}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-full border border-[#fff6df]/80 bg-[#fff8ec]/86 px-3 py-2.5 shadow-[0_18px_38px_rgba(52,39,24,0.18)] backdrop-blur-xl"
          >
            <i className="fas fa-coins text-amber-500" />
            <span className="min-w-10 text-right text-sm font-black text-stone-800">{points.toLocaleString()}</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="pointer-events-auto mx-auto mt-2 flex max-w-5xl gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {gardenQuests.map(quest => (
            <div
              key={quest.id}
              className={`flex h-11 min-w-[9.5rem] items-center gap-2 rounded-full border px-3 shadow-[0_10px_24px_rgba(52,39,24,0.12)] backdrop-blur-xl ${
                quest.done
                  ? 'border-emerald-100 bg-emerald-50/88 text-emerald-800'
                  : 'border-[#fff6df]/80 bg-[#fff8ec]/84 text-stone-700'
              }`}
            >
              <i className={`fas ${quest.done ? 'fa-check' : quest.icon} text-[12px]`} />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black leading-tight">{quest.label}</p>
                <p className="truncate text-[9px] font-bold opacity-70">{quest.detail}</p>
              </div>
            </div>
          ))}
          <div className="flex h-11 min-w-[5rem] items-center justify-center rounded-full border border-[#fff6df]/80 bg-[#fff8ec]/84 text-[11px] font-black text-stone-700 shadow-[0_10px_24px_rgba(52,39,24,0.12)] backdrop-blur-xl">
            {completedQuests}/{gardenQuests.length}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={spring}
        className="fixed right-3 z-[78] flex flex-col gap-3 sm:right-5"
        style={{ bottom: 'max(7rem, calc(env(safe-area-inset-bottom) + 6.5rem))' }}
      >
        {onOpenWorldMap && (
          <button
            type="button"
            onClick={() => {
              stopMovement(pressMovement);
              onOpenWorldMap();
            }}
            className={actionButtonBase}
            title="Open world map"
          >
            <i className="fas fa-globe-americas text-lg" />
          </button>
        )}

        <button
          type="button"
          onClick={cameraMode === 'explore' && !isEditMode ? activateOrbit : activateExplore}
          className={`${actionButtonBase} ${cameraMode === 'explore' && !isEditMode ? 'bg-emerald-700 text-white' : ''}`}
          title={cameraMode === 'explore' && !isEditMode ? 'Switch to orbit' : 'Switch to explore'}
        >
          <i className={`fas ${cameraMode === 'explore' && !isEditMode ? 'fa-street-view' : 'fa-shoe-prints'} text-lg`} />
        </button>

        <AnimatePresence>
          {canGrowLeaf && !isEditMode && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.82 }}
              transition={spring}
              onClick={onAddLeaf}
              className={`${actionButtonBase} bg-emerald-600 text-white shadow-[0_14px_30px_rgba(21,128,61,0.32)]`}
              title="Grow a leaf"
            >
              <i className="fas fa-leaf text-lg" />
            </motion.button>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={toggleBuildMode}
          className={`${actionButtonBase} ${isEditMode ? 'bg-amber-500 text-white' : ''}`}
          title={isEditMode ? 'Close build mode' : 'Open build mode'}
        >
          <i className={`fas ${isEditMode ? 'fa-check' : 'fa-hammer'} text-lg`} />
        </button>

        <AnimatePresence>
          {isEditMode && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.82 }}
              transition={spring}
              onClick={toggleShopPopover}
              className={`${actionButtonBase} ${isShopPopoverOpen ? 'bg-stone-800 text-white' : ''}`}
              title="Open catalog"
            >
              <i className="fas fa-store text-lg" />
            </motion.button>
          )}
        </AnimatePresence>

        {showQRCode && (
          <button
            type="button"
            onClick={openQRUpload}
            className={actionButtonBase}
            title="Open upload QR"
          >
            <i className="fas fa-qrcode text-lg" />
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {cameraMode === 'explore' && !isEditMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={spring}
            className="fixed left-4 z-[78] h-[8.75rem] w-[8.75rem] rounded-full border border-[#fff6df]/70 bg-[#fff8ec]/50 p-3 shadow-[0_18px_42px_rgba(52,39,24,0.22)] backdrop-blur-xl sm:left-6"
            style={{ bottom: 'max(5.75rem, calc(env(safe-area-inset-bottom) + 5rem))' }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="relative h-full w-full rounded-full border border-amber-100/70 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.88),rgba(244,220,177,0.42))]">
              <button type="button" {...moveHandlers('forward', pressMovement)} className="absolute left-1/2 top-1 h-11 w-11 -translate-x-1/2 rounded-full text-stone-700 transition active:bg-amber-100" title="Move forward">
                <i className="fas fa-chevron-up" />
              </button>
              <button type="button" {...moveHandlers('left', pressMovement)} className="absolute left-1 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full text-stone-700 transition active:bg-amber-100" title="Move left">
                <i className="fas fa-chevron-left" />
              </button>
              <button type="button" {...moveHandlers('right', pressMovement)} className="absolute right-1 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full text-stone-700 transition active:bg-amber-100" title="Move right">
                <i className="fas fa-chevron-right" />
              </button>
              <button type="button" {...moveHandlers('back', pressMovement)} className="absolute bottom-1 left-1/2 h-11 w-11 -translate-x-1/2 rounded-full text-stone-700 transition active:bg-amber-100" title="Move back">
                <i className="fas fa-chevron-down" />
              </button>
              <div className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-emerald-700 text-white shadow-[0_10px_22px_rgba(20,83,45,0.32)]">
                <i className="fas fa-shoe-prints text-base" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 34 }}
            transition={spring}
            className="fixed inset-x-3 z-[80] mx-auto max-w-4xl rounded-[1.6rem] border border-[#fff6df]/80 bg-[#fff8ec]/92 p-3 shadow-[0_22px_60px_rgba(52,39,24,0.3)] backdrop-blur-2xl sm:inset-x-5"
            style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setSnapToGrid(prev => !prev)}
                className={`flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-wider shadow-sm transition active:scale-95 ${
                  snapToGrid ? 'bg-amber-500 text-white' : 'bg-white/84 text-stone-700'
                }`}
                title="Toggle snap"
              >
                <i className="fas fa-border-all" />
                Snap
              </button>

              <button
                type="button"
                onClick={toggleShopPopover}
                className={`flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-wider shadow-sm transition active:scale-95 ${
                  isShopPopoverOpen ? 'bg-stone-800 text-white' : 'bg-white/84 text-stone-700'
                }`}
                title="Open catalog"
              >
                <i className="fas fa-store" />
                Catalog
              </button>

              {selectedItem ? (
                <>
                  <div className="flex h-12 min-w-[11rem] items-center gap-2 rounded-full bg-white/84 px-4 text-stone-800 shadow-sm">
                    <i className="fas fa-location-dot text-amber-600" />
                    <span className="truncate text-xs font-black capitalize">{selectedItem.type.replace(/_/g, ' ')}</span>
                  </div>
                  <button type="button" onClick={() => rotateSelectedItem(-Math.PI / 12)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-stone-800 text-white shadow-sm transition active:scale-95" title="Rotate left">
                    <i className="fas fa-undo" />
                  </button>
                  <button type="button" onClick={() => rotateSelectedItem(Math.PI / 12)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-stone-800 text-white shadow-sm transition active:scale-95" title="Rotate right">
                    <i className="fas fa-redo" />
                  </button>
                  <button type="button" onClick={() => setSelectedItemId(null)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/84 text-stone-700 shadow-sm transition active:scale-95" title="Clear selection">
                    <i className="fas fa-xmark" />
                  </button>
                </>
              ) : (
                <div className="flex h-12 min-w-[13rem] items-center gap-2 rounded-full bg-white/70 px-4 text-stone-500 shadow-sm">
                  <i className="fas fa-hand-pointer text-amber-600" />
                  <span className="truncate text-xs font-black">Select a piece</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShopPopoverOpen && isEditMode && onPurchase && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={spring}
            className="fixed inset-x-2 z-[85] mx-auto max-h-[72vh] max-w-2xl overflow-hidden rounded-t-[1.9rem] border border-[#fff6df]/80 bg-[#fff8ec]/96 shadow-[0_-18px_55px_rgba(52,39,24,0.32)] backdrop-blur-2xl sm:inset-x-5 sm:rounded-[1.9rem]"
            style={{ bottom: 'max(5.8rem, calc(env(safe-area-inset-bottom) + 5.2rem))' }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-amber-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Catalog</p>
                <h3 className="truncate text-base font-black text-stone-800">Place a keepsake</h3>
              </div>
              <button type="button" onClick={toggleShopPopover} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-stone-700 shadow-sm transition active:scale-95" title="Close catalog">
                <i className="fas fa-xmark" />
              </button>
            </div>
            <div className="max-h-[calc(72vh-4.5rem)] overflow-y-auto p-3">
              <Shop points={points} activeLandId={activeLandId} onPurchase={onPurchase} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQRUploadOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-stone-950/45 p-4 backdrop-blur-sm"
            onClick={() => setIsQRUploadOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              transition={spring}
              className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-[#fff8ec] shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-pink-100 text-pink-600">
                  <i className="fas fa-qrcode text-xl" />
                </div>
                <h2 className="text-xl font-black text-stone-800">Phone upload</h2>
                <div className="mx-auto my-5 w-fit rounded-[1.2rem] border border-pink-100 bg-white p-3 shadow-sm">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(uploadUrl)}&color=ec4899`}
                    alt="Upload QR"
                    width={192}
                    height={192}
                    unoptimized
                    className="h-48 w-48 rounded-md"
                  />
                </div>

                {albums.length > 0 && (
                  <div className="mb-4 rounded-[1.1rem] bg-white/80 p-3 text-left">
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-pink-600">Album</label>
                    <select
                      value={selectedAlbumId}
                      onChange={(event) => setSelectedAlbumId(event.target.value)}
                      className="h-11 w-full rounded-xl border border-pink-100 bg-[#fff8ec] px-3 text-sm font-bold text-stone-700 outline-none transition focus:border-pink-300"
                    >
                      <option value="">Global gallery</option>
                      {albums.map(album => (
                        <option key={album.id} value={album.id}>{album.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button type="button" onClick={() => setIsQRUploadOpen(false)} className="h-12 w-full rounded-full bg-stone-800 text-xs font-black uppercase tracking-widest text-white transition active:scale-[0.98]">
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};
