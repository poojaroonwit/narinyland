"use client";

import * as React from 'react';
import { motion } from 'framer-motion';
import { Interaction, MediaContent } from '../../types';
import OptimizedImage from '../OptimizedImage';

type TimelineLayoutItem = Interaction & {
  x: number;
  y: number;
  isRightSide: boolean;
  isFuture: boolean;
  rotation: number;
};

type TimelineEventMarkerProps = {
  item: TimelineLayoutItem;
  index: number;
  prevItem?: TimelineLayoutItem;
  windowWidth: number;
  cardScale: number;
  thumbnailHeight: number;
  onEdit: (item: Interaction) => void;
  onImageClick: (imageUrl: string) => void;
};

const getMonthName = (date: Date) => {
  return date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
};

export const TimelineEventMarker: React.FC<TimelineEventMarkerProps> = ({
  item,
  index,
  prevItem,
  windowWidth,
  cardScale,
  thumbnailHeight,
  onEdit,
  onImageClick,
}) => {
  const isAnniversary = item.id.startsWith('anniv-');
  const isQuest = item.type === 'quest';
  const isFirstOfYear = !prevItem || prevItem.timestamp.getFullYear() !== item.timestamp.getFullYear();

  return (
    <React.Fragment>
                              {/* Year Marker */}
                              {isFirstOfYear && (
                                 <motion.div 
                                   initial={{ opacity: 0, scale: 0 }}
                                   whileInView={{ opacity: 1, scale: 1 }}
                                   viewport={{ once: true }}
                                   className="absolute font-black text-pink-500/10 md:text-pink-500/30 select-none font-pacifico z-0"
                                   style={{ 
                                     top: item.y - 60, 
                                     left: item.isRightSide ? item.x - 200 : item.x + 50,
                                     right: 'auto',
                                     transform: 'translateX(-50%)',
                                     fontSize: windowWidth < 640 ? '2.5rem' : '5rem'
                                   }}
                                 >
                                   {item.timestamp.getFullYear()}
                                 </motion.div>
                              )}
      
                             <motion.div
                               initial={{ opacity: 0, scale: 0.8, y: 20 }}
                               whileInView={{ opacity: 1, scale: 1, y: 0 }}
                               viewport={{ once: true, margin: "-50px" }}
                               transition={{ duration: 0.5, delay: index % 5 * 0.1 }}
                               className="absolute z-10"
                               style={{ 
                                 top: item.y, 
                                 left: item.x,
                                 transform: 'translate(-50%, -50%)' 
                               }}
                             >
                               {/* DOT ON LINE */}
                               <div className={`w-4 h-4 rounded-full border-[3px] border-white shadow-md relative z-20 transition-transform hover:scale-150 ${
                                 isAnniversary 
                                   ? 'bg-yellow-400 w-5 h-5 -ml-0.5 -mt-0.5' 
                                   : item.isFuture 
                                     ? 'bg-purple-400' 
                                     : isQuest 
                                       ? 'bg-green-400' 
                                       : 'bg-pink-500'
                               }`}>
                                  {isAnniversary && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm">👑</span>}
                                  {item.isFuture && !isAnniversary && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px]">📌</span>}
                               </div>
      
                               {/* CONTENT CARD */}
                               <div 
                                 className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 w-max max-w-[140px] md:max-w-[200px] group cursor-pointer z-30 ${
                                    item.isRightSide ? 'flex-row left-5 md:left-10' : 'flex-row-reverse right-5 md:right-10'
                                 }`}
                                 onClick={(e) => {
                                 // Check if the click target is an image
                                 const isImageClick = (e.target as HTMLElement).closest('img') || 
                                                   (e.target as HTMLElement).closest('[data-image-container]');
                                 if (isImageClick) {
                                   // Let the image click handler handle this
                                   return;
                                 }
                                 onEdit(item);
                               }}
                               >
                                  {/* Connecting Line */}
                                  <div className={`absolute h-[2px] w-5 md:w-10 top-1/2 -translate-y-1/2 ${item.isFuture ? 'bg-purple-200' : 'bg-pink-200'} ${item.isRightSide ? '-left-5 md:-left-10' : '-right-5 md:-right-10'}`} />
      
                                    <div 
                                      className={`relative group transition-transform ${item.mediaItems && item.mediaItems.filter((mi: MediaContent) => mi.type === 'image').length > 1 ? 'hover:scale-105' : ''}`}
                                      style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                                    >
                                      {/* Background Frames for "Stacked" Effect */}
                                      {(() => {
                                         const imagesCount = item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image').length || 0;
                                         if (imagesCount <= 1) return null;
                                         return (
                                           <>
                                              <div className="absolute inset-0 bg-white border border-gray-100 shadow-sm -rotate-6 -translate-x-1.5 translate-y-1 rounded-sm opacity-60"></div>
                                              <div className="absolute inset-0 bg-white border border-gray-100 shadow-sm rotate-3 translate-x-1 translate-y-0.5 rounded-sm opacity-40"></div>
                                           </>
                                         );
                                      })()}
      
                                      <div 
                                         className="relative bg-white p-1.5 md:p-2 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 hover:shadow-2xl hover:-translate-y-2 hover:rotate-2 transition-all duration-300 text-center self-center"
                                         style={{ 
                                             transform: `scale(${cardScale})`, 
                                             transformOrigin: 'center',
                                             width: (item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image').length || (item.media?.type === 'image' ? 1 : 0)) > 0 
                                                 ? `${thumbnailHeight + (windowWidth < 640 ? 12 : 16)}px`
                                                 : (windowWidth < 640 ? '96px' : '144px') // Fallback to w-24/w-36 equivalent
                                         }}
                                      >
                                      {/* Hero Image Section */}
                                      <div 
                                         className={`w-full aspect-square relative overflow-hidden bg-gray-50 rounded-xs mb-2 ${
                                             (item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image').length || (item.media?.type === 'image' ? 1 : 0)) > 0 ? '' : 'h-0 mb-0'
                                         }`}
                                         style={{ 
                                             height: (item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image').length || (item.media?.type === 'image' ? 1 : 0)) > 0 
                                                 ? `${thumbnailHeight}px` 
                                                 : '0px'
                                         }}
                                      >
                                         {/* IMAGE THUMBNAIL - POLAROID MAIN */}
                                          {(() => {
                                            const images = item.mediaItems?.filter((mi: MediaContent) => mi.type === 'image') || (item.media?.type === 'image' ? [item.media] : []);
                                            if (images.length === 0) return null;
                                            
                                            return (
                                              <div className="w-full h-full group">
                                                 <OptimizedImage 
                                                    src={images[0].url} 
                                                    alt="Timeline memory media" 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer" 
                                                    loading="lazy"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onImageClick(images[0].url);
                                                    }}
                                                 />
                                                 
                                                 {images.length > 1 && (
                                                   <div className="absolute top-1 right-1 bg-black/50 text-white text-[8px] py-0.5 px-1.5 rounded-sm backdrop-blur-sm">
                                                      <i className="fas fa-images mr-1"></i> {images.length}
                                                   </div>
                                                 )}
                                              </div>
                                            );
                                          })()}
                                      </div>
      
                                      {/* Bottom Margin for Caption & Date */}
                                      <div className="flex flex-col items-start px-1 pb-1">
                                         <p className="text-[7.5px] md:text-[10px] font-bold text-gray-800 leading-tight line-clamp-2 text-left w-full h-4 md:h-6">
                                           {item.text}
                                         </p>
                                         
                                         <div className="mt-2 w-full flex justify-between items-center border-t border-gray-50 pt-1.5">
                                            <div className="flex flex-col items-start">
                                               <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tighter ${
                                                   item.isFuture ? 'text-purple-400' : 'text-gray-400'
                                               }`}>
                                                  {getMonthName(item.timestamp)} {item.timestamp.getDate()}
                                               </span>
                                               {item.isFuture && (
                                                  <span className="text-[7px] font-black text-purple-300 uppercase tracking-widest leading-none">PLAN</span>
                                               )}
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5">
                                               {item.location && <i className="fas fa-map-marker-alt text-[8px] text-pink-300"></i>}
                                                {((item.mediaItems?.length || 0) > 0 || !!item.media) && (
                                                   <i className={`fas ${
                                                      ((item.mediaItems?.filter((mi: MediaContent) => mi.type === 'video')?.length || 0) > 0 || item.media?.type === 'video')
                                                        ? 'fa-video text-blue-300' 
                                                        : 'fa-camera text-pink-300'
                                                   } text-[8px]`}></i>
                                                )}
                                            </div>
                                         </div>
                                      </div>
                                 </div>
                             </div>
                           </div>
                           </motion.div>
    </React.Fragment>
  );
};
