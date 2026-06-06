// @ts-nocheck
"use client";

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditDrawerContext } from './context';

export const EditDrawerShell: React.FC = () => {
  const {
    isOpen,
    isMobile,
    onClose,
    hasChanges,
    activeTab,
    expandedAccordion,
    previewItem,
    TAB_ICONS,
    EDIT_TABS,
    renderTabContent,
    handleSave,
    setActiveTab,
    setExpandedAccordion,
    setPreviewItem,
    getPreviewUrl,
  } = useEditDrawerContext();

  return (
          <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
              onClick={onClose}
            >
              <motion.div
                initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0, y: 20 }}
                animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`bg-white w-full max-w-4xl rounded-t-[2.5rem] md:rounded-md shadow-[0_20px_70px_rgba(0,0,0,0.3)] flex flex-col md:flex-row overflow-hidden ${isMobile ? 'h-[95vh] mt-auto' : 'h-[85vh]'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header (Mobile Only) */}
                {isMobile && (
                  <div className="flex flex-col items-center shrink-0 pt-4 pb-2 border-b border-gray-100 bg-white sticky top-0 z-20">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-4"></div>
                    <div className="w-full px-6 flex justify-between items-center">
                      <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        System Settings
                      </h2>
                      <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                        <i className="fas fa-times text-gray-400"></i>
                      </button>
                    </div>
                  </div>
                )}
    
                {/* Vertical Tabs Sidebar (Desktop Only) */}
                {!isMobile && (
                  <div className="w-56 bg-gray-50 border-r border-gray-100 flex flex-col shrink-0">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100">
                      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        ⚙️ Settings
                        {hasChanges && <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />}
                      </h2>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Customize Narinyland</p>
                    </div>
    
                    {/* Tab Buttons */}
                    <div className="flex-1 overflow-y-auto py-2">
                      {EDIT_TABS.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`w-full text-left px-5 py-3 flex items-center gap-3 text-sm font-bold capitalize transition-all ${
                            activeTab === tab 
                              ? 'bg-pink-50 text-pink-600 border-l-4 border-pink-500' 
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border-l-4 border-transparent'
                          }`}
                        >
                          <i className={`fas ${TAB_ICONS[tab] || 'fa-circle'} text-xs w-4`}></i>
                          {tab}
                        </button>
                      ))}
                    </div>
    
                    {/* Save Button in Sidebar */}
                    <div className="p-4 border-t border-gray-100">
                      <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={`w-full py-3 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                          hasChanges
                            ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-lg shadow-pink-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {hasChanges ? 'Save Changes' : 'No Changes'}
                      </button>
                    </div>
                  </div>
                )}
    
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Top Bar with Title (Desktop Only) */}
                  {!isMobile && (
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white">
                      <h3 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
                        <i className={`fas ${TAB_ICONS[activeTab] || 'fa-circle'} text-pink-400`}></i>
                        {activeTab}
                      </h3>
                      <button onClick={onClose} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-md flex items-center justify-center transition-colors">
                        <i className="fas fa-times text-gray-500"></i>
                      </button>
                    </div>
                  )}
    
                  {/* Scrollable Content Area */}
                  <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-0 px-4' : 'p-6'} bg-gray-50/50 space-y-4 md:space-y-8 pb-32 custom-scrollbar`}>
                    {isMobile ? (
                      /* Mobile Accordion Layout */
                      <div className="space-y-3 mt-4">
                        {EDIT_TABS.map((tab) => (
                          <div key={tab} className="bg-white rounded-md border border-gray-100 overflow-hidden shadow-sm">
                            <button
                              onClick={() => setExpandedAccordion(expandedAccordion === tab ? null : tab)}
                              className={`w-full px-5 py-4 flex items-center justify-between text-sm font-black uppercase tracking-widest ${expandedAccordion === tab ? 'bg-pink-50 text-pink-600' : 'text-gray-600'}`}
                            >
                              <div className="flex items-center gap-3">
                                <i className={`fas ${TAB_ICONS[tab] || 'fa-circle'} text-xs`}></i>
                                {tab}
                              </div>
                              <i className={`fas fa-chevron-down text-[10px] transition-transform ${expandedAccordion === tab ? 'rotate-180' : ''}`}></i>
                            </button>
                            <AnimatePresence>
                              {expandedAccordion === tab && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-gray-50"
                                >
                                   {renderTabContent(tab)}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Desktop Direct Layout */
                      renderTabContent(activeTab)
                    )}
                  </div>
                  
                  {/* Sticky Footer Save Button (Mobile Only) */}
                  {isMobile && (
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-30">
                      <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={`w-full py-4 rounded-full text-sm font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                          hasChanges
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xl shadow-pink-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        }`}
                      >
                        {hasChanges ? (
                          <>
                            <i className="fas fa-check-circle"></i>
                            Save All Changes
                          </>
                        ) : 'Up to Date'}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
    
          {/* FULLSCREEN PREVIEW OVERLAY */}
          <AnimatePresence>
            {previewItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
                onClick={() => setPreviewItem(null)}
              >
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-2xl transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewItem(null);
                  }}
                >
                  <i className="fas fa-times"></i>
                </motion.button>
    
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative max-w-full max-h-full flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                   {previewItem.type === 'image' && (
                     <Image 
                       src={getPreviewUrl(previewItem.url)} 
                       width={1200}
                       height={900}
                       unoptimized
                       className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
                       alt="Preview"
                     />
                   )}
                   {previewItem.type === 'video' && (
                     <video 
                       src={previewItem.url} 
                       className="max-w-full max-h-[85vh] rounded-md shadow-2xl"
                       controls
                       autoPlay
                     />
                   )}
                   {previewItem.type === 'audio' && (
                     <div className="bg-white p-8 rounded-md shadow-2xl flex flex-col items-center gap-6 min-w-[300px]">
                        <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-4xl">
                          <i className="fas fa-microphone"></i>
                        </div>
                        <audio src={previewItem.url} controls className="w-full" />
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Audio Memory</p>
                     </div>
                   )}
                   
                   <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
                      <a 
                        href={previewItem.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-external-link-alt"></i> Open Original
                      </a>
                   </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          </AnimatePresence>
  );
};
