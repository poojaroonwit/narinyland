"use client";

import React from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Shop, { ShopItem } from '../Shop';
import { ItemTransformUpdate, PurchasedItem } from '../../types';
import { MovementInput } from './SceneHelpers';

type GardenQuest = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  icon: string;
};

type LoveTreeOverlaysProps = {
  isEditMode: boolean;
  setIsEditMode?: (val: boolean) => void;
  cameraMode: 'orbit' | 'explore';
  setCameraMode: React.Dispatch<React.SetStateAction<'orbit' | 'explore'>>;
  points: number;
  toggleBuildMode: () => void;
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

export const LoveTreeOverlays: React.FC<LoveTreeOverlaysProps> = ({
  isEditMode,
  setIsEditMode,
  cameraMode,
  setCameraMode,
  points,
  toggleBuildMode,
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
}) => createPortal(
          <>
        <div className="fixed top-20 left-4 md:left-6 z-[70] w-[min(92vw,360px)] overflow-hidden rounded-md border border-white/60 bg-[#fffaf1]/90 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-amber-100/80 px-4 py-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-600">Land Controls</p>
              <h3 className="text-sm font-black text-stone-800">{isEditMode ? 'Build Mode' : cameraMode === 'explore' ? 'Explore Mode' : 'Orbit View'}</h3>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
              <i className="fas fa-coins text-[10px]"></i>
              {points.toLocaleString()}
            </div>
          </div>
  
          <div className="grid grid-cols-3 gap-1.5 p-2">
            <button
              type="button"
              onClick={() => {
                setIsEditMode?.(false);
                setCameraMode('explore');
              }}
              disabled={isEditMode}
              className={`h-12 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                cameraMode === 'explore' && !isEditMode
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : isEditMode
                    ? 'cursor-not-allowed bg-stone-100 text-stone-300'
                    : 'bg-white/70 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
              title="Walk around the land"
            >
              <i className="fas fa-shoe-prints mb-1 block"></i>
              Explore
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditMode?.(false);
                setCameraMode('orbit');
              }}
              className={`h-12 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                cameraMode === 'orbit' && !isEditMode
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'bg-white/70 text-stone-600 hover:bg-stone-100'
              }`}
              title="Look around the land"
            >
              <i className="fas fa-street-view mb-1 block"></i>
              Orbit
            </button>
            <button
              type="button"
              onClick={toggleBuildMode}
              className={`h-12 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                isEditMode
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white/70 text-stone-600 hover:bg-pink-50 hover:text-pink-600'
              }`}
              title={isEditMode ? 'Leave Build Mode' : 'Enter Build Mode'}
            >
              <i className={`fas ${isEditMode ? 'fa-hammer' : 'fa-seedling'} mb-1 block`}></i>
              Build
            </button>
          </div>
  
          <AnimatePresence>
            {isEditMode && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="border-t border-amber-100/80 px-3 pb-3 pt-2"
              >
                <div className="flex items-center justify-between gap-2 rounded-md bg-white/70 px-3 py-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Placement</span>
                  <button
                    type="button"
                    onClick={() => setSnapToGrid(prev => !prev)}
                    className={`h-8 rounded-md px-3 text-[10px] font-black uppercase tracking-wider transition-all ${
                      snapToGrid
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                    title="Snap to grid"
                  >
                    <i className="fas fa-border-all mr-2"></i>
                    Snap {snapToGrid ? 'On' : 'Off'}
                  </button>
                </div>
                <p className="mt-2 text-[10px] font-bold leading-relaxed text-stone-500">
                  Drag objects on the land, rotate selected pieces, and open the catalog to place keepsakes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
  
        <AnimatePresence>
          {!isEditMode && (
            <motion.div
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              className="fixed top-[15.5rem] left-4 md:left-6 z-[65] w-[min(92vw,300px)] rounded-md border border-white/60 bg-white/75 p-3 shadow-xl backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-pink-500">Garden Quests</p>
                <span className="text-[10px] font-black text-stone-400">{gardenQuests.filter(quest => quest.done).length}/{gardenQuests.length}</span>
              </div>
              <div className="space-y-1.5">
                {gardenQuests.map(quest => (
                  <div key={quest.id} className="flex items-center gap-2 rounded-md bg-white/70 px-2.5 py-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      quest.done ? 'bg-emerald-100 text-emerald-600' : 'bg-pink-100 text-pink-500'
                    }`}>
                      <i className={`fas ${quest.done ? 'fa-check' : quest.icon} text-[10px]`}></i>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black text-stone-700">{quest.label}</p>
                      <p className="truncate text-[9px] font-bold text-stone-400">{quest.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
  
        <AnimatePresence>
          {cameraMode === 'explore' && !isEditMode && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="fixed bottom-8 right-4 md:right-6 z-[70] grid grid-cols-3 gap-2 rounded-md border border-white/60 bg-white/75 p-2 shadow-2xl backdrop-blur-xl"
            >
              <span />
              <button
                type="button"
                onPointerDown={() => pressMovement('forward', true)}
                onPointerUp={() => pressMovement('forward', false)}
                onPointerLeave={() => pressMovement('forward', false)}
                className="h-12 w-12 rounded-md bg-white/90 text-stone-700 shadow-sm transition hover:bg-emerald-50 active:scale-95"
                title="Move forward"
              >
                <i className="fas fa-chevron-up"></i>
              </button>
              <span />
              <button
                type="button"
                onPointerDown={() => pressMovement('left', true)}
                onPointerUp={() => pressMovement('left', false)}
                onPointerLeave={() => pressMovement('left', false)}
                className="h-12 w-12 rounded-md bg-white/90 text-stone-700 shadow-sm transition hover:bg-emerald-50 active:scale-95"
                title="Move left"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button
                type="button"
                onPointerDown={() => pressMovement('back', true)}
                onPointerUp={() => pressMovement('back', false)}
                onPointerLeave={() => pressMovement('back', false)}
                className="h-12 w-12 rounded-md bg-white/90 text-stone-700 shadow-sm transition hover:bg-emerald-50 active:scale-95"
                title="Move back"
              >
                <i className="fas fa-chevron-down"></i>
              </button>
              <button
                type="button"
                onPointerDown={() => pressMovement('right', true)}
                onPointerUp={() => pressMovement('right', false)}
                onPointerLeave={() => pressMovement('right', false)}
                className="h-12 w-12 rounded-md bg-white/90 text-stone-700 shadow-sm transition hover:bg-emerald-50 active:scale-95"
                title="Move right"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
  
        <AnimatePresence>
          {isEditMode && selectedItem && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.96 }}
              className="fixed bottom-24 right-4 md:right-6 z-[80] w-[min(92vw,320px)] rounded-md border border-white/60 bg-white/90 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black uppercase tracking-widest text-pink-500">Placed Piece</p>
                  <h3 className="truncate text-base font-black capitalize text-stone-800">{selectedItem.type.replace(/_/g, ' ')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItemId(null)}
                  className="h-9 w-9 shrink-0 rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                  title="Clear selection"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => rotateSelectedItem(-Math.PI / 12)}
                  className="h-11 rounded-md bg-stone-800 text-sm font-black text-white shadow-sm transition hover:bg-stone-700 active:scale-[0.98]"
                  title="Rotate left"
                >
                  <i className="fas fa-undo mr-2"></i>
                  Turn Left
                </button>
                <button
                  type="button"
                  onClick={() => rotateSelectedItem(Math.PI / 12)}
                  className="h-11 rounded-md bg-stone-800 text-sm font-black text-white shadow-sm transition hover:bg-stone-700 active:scale-[0.98]"
                  title="Rotate right"
                >
                  <i className="fas fa-redo mr-2"></i>
                  Turn Right
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
  
  
          <AnimatePresence>
            {isEditMode && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleShopPopover}
                className={`fixed bottom-24 left-6 z-[80] h-14 rounded-full px-5 shadow-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider transition-all border-2 ${
                  isShopPopoverOpen
                    ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/40'
                    : 'bg-white/80 backdrop-blur-md text-amber-600 border-white/50 hover:bg-white'
                }`}
                title="Open build catalog"
              >
                <i className="fas fa-store"></i>
                Catalog
              </motion.button>
            )}
          </AnimatePresence>
        
  
  
  
        {/* Floating Shop Popover */}
        <AnimatePresence>
          {isShopPopoverOpen && isEditMode && onPurchase && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className="fixed bottom-24 left-6 z-[80] w-80 max-h-[60vh] bg-white/95 backdrop-blur-xl rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/50 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-amber-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-black text-amber-700 flex items-center gap-2">
                    <i className="fas fa-store"></i> Build Catalog
                  </h3>
                  <p className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest">Choose a piece for this land</p>
                </div>
                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md flex items-center gap-1.5 text-sm shadow-sm border border-amber-200">
                  <i className="fas fa-coins text-amber-500 text-xs"></i>
                  <span className="font-black">{points}</span>
                </div>
              </div>
              <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar">
                <Shop
                  points={points}
                  activeLandId={activeLandId}
                  onPurchase={onPurchase}
                  compact={true}
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
              className="fixed bottom-6 left-6 z-[70] hidden md:flex flex-col items-center gap-2 group"
            >
               <div 
                  className="bg-white/80 backdrop-blur-xl p-3 rounded-md shadow-2xl border border-white/50 cursor-pointer hover:scale-105 transition-transform relative overflow-hidden active:scale-95"
                  onClick={openQRUpload}
                >
                   <Image 
                     src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/upload${selectedAlbumId ? `?albumId=${selectedAlbumId}` : ''}` : 'https://example.com/upload')}&color=ec4899`} 
                     alt="Upload QR" 
                     width={96}
                     height={96}
                     unoptimized
                     className="w-24 h-24 rounded-md"
                   />
                   <div className="absolute inset-0 bg-pink-500/0 group-hover:bg-pink-500/5 transition-colors flex items-center justify-center">
                      <i className="fas fa-expand text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                   </div>
                </div>
                <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-pink-100 flex items-center gap-2">
                   <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                   </span>
                   <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest leading-none">Scan to Upload 📱</p>
                </div>
            </motion.div>
          )}
  
          {isQRUploadOpen && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
               onClick={() => setIsQRUploadOpen(false)}
             >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                   <div className="p-8 text-center space-y-4">
                      <div className="w-20 h-20 bg-pink-100 rounded-md flex items-center justify-center text-pink-500 text-3xl mx-auto mb-2">
                         <i className="fas fa-qrcode"></i>
                      </div>
                      <h2 className="text-2xl font-black text-gray-800 tracking-tight">Upload via Phone</h2>
                      <p className="text-sm text-gray-400 font-medium pb-2">Scan this QR code with your phone camera to open the uploader.</p>
                      
                      <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/upload${selectedAlbumId ? `?albumId=${selectedAlbumId}` : ''}` : 'https://example.com/upload')}&color=ec4899`} 
                        alt="Large Upload QR" 
                        width={192}
                        height={192}
                        unoptimized
                        className="w-48 h-48 mx-auto rounded-md shadow-sm border border-pink-50"
                      />
  
                      {albums.length > 0 && (
                        <div className="text-left bg-pink-50 rounded-md p-4 mt-6">
                          <label className="block text-[10px] uppercase font-black text-pink-500 tracking-widest mb-2 ml-1">Destination Album</label>
                          <select
                            value={selectedAlbumId}
                            onChange={(e) => setSelectedAlbumId(e.target.value)}
                            className="w-full bg-white border border-pink-100 rounded-md p-3 text-sm font-bold text-gray-700 outline-none cursor-pointer hover:border-pink-300 transition-colors"
                          >
                            <option value="">No Album (Global Gallery)</option>
                            {albums.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
  
                      <button 
                        onClick={() => setIsQRUploadOpen(false)}
                        className="w-full bg-gray-100 text-gray-500 font-black py-4 rounded-md mt-4 hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
                      >
                         Close
                      </button>
                   </div>
                   <div className="bg-pink-500 p-1"></div>
                </motion.div>
             </motion.div>
          )}
        </AnimatePresence>
      </>,
  document.body
);
