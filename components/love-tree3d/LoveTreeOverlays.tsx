"use client";

import React from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Shop, { ShopItem } from '../Shop';
import { PurchasedItem } from '../../types';
import { MovementInput } from '../game-engine-3d';

type LoveTreeOverlaysProps = {
  isEditMode: boolean;
  setIsEditMode?: (val: boolean) => void;
  cameraMode: 'orbit' | 'explore';
  setCameraMode: React.Dispatch<React.SetStateAction<'orbit' | 'explore'>>;
  points: number;
  toggleBuildMode: () => void;
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
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

export const LoveTreeOverlays: React.FC<LoveTreeOverlaysProps> = ({
  isEditMode,
  setIsEditMode,
  cameraMode,
  setCameraMode,
  points,
  toggleBuildMode,
  snapToGrid,
  setSnapToGrid,
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
  // The March 2026 garden used a single orbit-style 3D garden with an edit FAB.
  // Keep the newer movement/selection internals dormant so older saved land data
  // remains compatible without exposing Explore/Orbit game modes in the UI.
  void setIsEditMode;
  void cameraMode;
  void setCameraMode;
  void snapToGrid;
  void setSnapToGrid;
  void pressMovement;
  void selectedItem;
  void setSelectedItemId;
  void rotateSelectedItem;

  return createPortal(
    <>
      {/* Classic edit controls from the pre-game-mode garden. */}
      <div className="fixed bottom-24 left-6 z-[70] flex flex-col items-start gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleBuildMode}
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-xl shadow-2xl transition-all ${
            isEditMode
              ? 'border-pink-400 bg-pink-500 text-white shadow-pink-500/40'
              : 'border-white/50 bg-white/80 text-gray-600 backdrop-blur-md hover:bg-white'
          }`}
          title={isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          aria-label={isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
        >
          <i className={`fas ${isEditMode ? 'fa-times' : 'fa-pencil-alt'}`} />
        </motion.button>

        <AnimatePresence>
          {isEditMode && (
            <motion.button
              type="button"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleShopPopover}
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-xl shadow-2xl transition-all ${
                isShopPopoverOpen
                  ? 'border-amber-400 bg-amber-500 text-white shadow-amber-500/40'
                  : 'border-white/50 bg-white/80 text-amber-600 backdrop-blur-md hover:bg-white'
              }`}
              title="Open Shop"
              aria-label="Open Shop"
            >
              <i className="fas fa-store" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-pink-500/90 px-6 py-2 text-white shadow-lg backdrop-blur-md"
          >
            <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span className="text-xs font-black uppercase tracking-widest">Edit Mode</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShopPopoverOpen && isEditMode && onPurchase && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="fixed bottom-24 left-24 z-[80] flex max-h-[60vh] w-80 flex-col overflow-hidden rounded-3xl border border-white/50 bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-amber-100 p-4">
              <div>
                <h3 className="flex items-center gap-2 font-black text-amber-700">
                  <i className="fas fa-store" /> Shop
                </h3>
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500/80">Add pieces to your garden</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-100 px-3 py-1 text-sm text-amber-700 shadow-sm">
                <i className="fas fa-coins text-xs text-amber-500" />
                <span className="font-black">{points}</span>
              </div>
            </div>
            <div className="custom-scrollbar space-y-2 overflow-y-auto p-3">
              <Shop
                points={points}
                activeLandId={activeLandId}
                onPurchase={onPurchase}
                compact
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQRCode && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="group fixed bottom-6 left-6 z-[70] hidden flex-col items-center gap-2 md:flex"
          >
            <div
              className="relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/50 bg-white/80 p-3 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105 active:scale-95"
              onClick={openQRUpload}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') openQRUpload();
              }}
            >
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/upload${selectedAlbumId ? `?albumId=${selectedAlbumId}` : ''}` : 'https://example.com/upload')}&color=ec4899`}
                alt="Upload QR"
                width={96}
                height={96}
                unoptimized
                className="h-24 w-24 rounded-2xl"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-pink-500/0 transition-colors group-hover:bg-pink-500/5">
                <i className="fas fa-expand text-pink-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-pink-100 bg-white/90 px-3 py-1 shadow-lg backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
              </span>
              <p className="text-[9px] font-black uppercase leading-none tracking-widest text-pink-500">Scan to Upload 📱</p>
            </div>
          </motion.div>
        )}

        {isQRUploadOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
            onClick={() => setIsQRUploadOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-[3rem] bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-4 p-8 text-center">
                <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-pink-100 text-3xl text-pink-500">
                  <i className="fas fa-qrcode" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-gray-800">Upload via Phone</h2>
                <p className="pb-2 text-sm font-medium text-gray-400">Scan this QR code with your phone camera to open the uploader.</p>

                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/upload${selectedAlbumId ? `?albumId=${selectedAlbumId}` : ''}` : 'https://example.com/upload')}&color=ec4899`}
                  alt="Large Upload QR"
                  width={192}
                  height={192}
                  unoptimized
                  className="mx-auto h-48 w-48 rounded-3xl border border-pink-50 shadow-sm"
                />

                {albums.length > 0 && (
                  <div className="mt-6 rounded-2xl bg-pink-50 p-4 text-left">
                    <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-pink-500">Destination Album</label>
                    <select
                      value={selectedAlbumId}
                      onChange={(event) => setSelectedAlbumId(event.target.value)}
                      className="w-full cursor-pointer rounded-xl border border-pink-100 bg-white p-3 text-sm font-bold text-gray-700 outline-none transition-colors hover:border-pink-300"
                    >
                      <option value="">No Album (Global Gallery)</option>
                      {albums.map((album) => (
                        <option key={album.id} value={album.id}>{album.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsQRUploadOpen(false)}
                  className="mt-4 w-full rounded-3xl bg-gray-100 py-4 text-xs font-black uppercase tracking-widest text-gray-500 transition-all hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
              <div className="bg-pink-500 p-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};
