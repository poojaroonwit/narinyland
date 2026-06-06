"use client";

import React from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Coupon } from './types';

export const CouponCard: React.FC<{ 
  coupon: Coupon; 
  idx: number; 
  isRedeemed: boolean; 
  onCardClick: (id: string, currentlyRedeemed: boolean) => void;
  isAnimating?: boolean;
}> = ({ coupon, idx, isRedeemed, onCardClick, isAnimating }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-100, 100], [15, -15]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-15, 15]), { stiffness: 300, damping: 30 });
  const shineX = useTransform(x, [-100, 100], [-200, 200]);
  const shineOpacity = useTransform(x, [-100, 100], [0.2, 0.5]);
  const foilOpacity = useTransform(x, [-100, 100], [0.1, 0.3]);
  const foilBackground = useTransform(
    x,
    [-100, 100],
    [
      "linear-gradient(135deg, rgba(255,0,0,0.1) 0%, rgba(0,255,255,0.1) 50%, rgba(255,0,255,0.1) 100%)",
      "linear-gradient(135deg, rgba(255,0,255,0.1) 0%, rgba(255,255,0,0.1) 50%, rgba(0,255,255,0.1) 100%)"
    ]
  );

  const stampScale = useSpring(isAnimating ? 0.9 : 1, { stiffness: 400, damping: 15 });
  const stampRotate = useSpring(isAnimating ? -5 : 0, { stiffness: 400, damping: 15 });

  function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    x.set(mouseX - centerX);
    y.set(mouseY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: isAnimating ? [1, 0.95, 1.05, 1] : 1,
        rotate: isAnimating ? [0, -2, 2, 0] : 0
      }}
      transition={{ duration: 0.4 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1000 }}
      className={`relative group select-none ${isRedeemed ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <motion.div 
        style={{ 
          rotateX: isRedeemed ? 0 : rotateX, 
          rotateY: isRedeemed ? 0 : rotateY,
          scale: stampScale,
          rotateZ: stampRotate,
          transformStyle: "preserve-3d"
        }}
        onClick={(e) => {
          e.stopPropagation();
          onCardClick(coupon.id, isRedeemed);
        }}
        className={`
          relative flex h-32 w-full overflow-hidden rounded-md shadow-2xl 
          transition-all duration-500 glass-morphism border-2 border-white/40
          ${isRedeemed ? 'opacity-50 grayscale-[0.6] border-gray-200 shadow-none' : 'hover:border-pink-200/50'}
        `}
      >
        {/* Scalloped Edges (Left) */}
        <div className="absolute -top-3 -bottom-3 -left-3 w-6 flex flex-col justify-between z-20 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-6 h-6 bg-[#fdf2f8] rounded-full border border-gray-100 shadow-inner" />
          ))}
        </div>
        {/* Scalloped Edges (Right) */}
        <div className="absolute -top-3 -bottom-3 -right-3 w-6 flex flex-col justify-between z-20 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-6 h-6 bg-[#fdf2f8] rounded-full border border-gray-100 shadow-inner" />
          ))}
        </div>

        {!isRedeemed && (
          <div className="absolute inset-x-0 -bottom-1 h-2 bg-black/10 blur-[1px] rounded-full pointer-events-none" />
        )}

        {/* Left Stub */}
        <div className={`
          w-24 md:w-28 flex items-center justify-center text-4xl md:text-5xl bg-gradient-to-br border-r-2 border-dashed border-gray-200/50 relative overflow-hidden
          ${coupon.color} 
        `}>
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          
          <span 
            style={{ transform: "translateZ(50px)" }}
            className="drop-shadow-[0_12px_12px_rgba(0,0,0,0.3)] group-hover:scale-110 transition-transform duration-500 z-10"
          >
            {coupon.emoji}
          </span>
        </div>

        {/* Right Content */}
        <div 
          style={{ transform: "translateZ(30px)" }}
          className="flex-1 flex flex-col justify-center px-8 md:px-12 py-6 relative bg-white/40 transform-gpu"
        >
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-black text-gray-800 text-base md:text-xl tracking-tight leading-none drop-shadow-sm">{coupon.title}</h3>
            {coupon.points && coupon.points > 0 && (
               <div className="bg-yellow-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                 +{coupon.points?.toLocaleString()} PTS
               </div>
            )}
          </div>
          <p className="text-[10px] md:text-xs text-gray-600 font-bold leading-tight line-clamp-2 mb-2">{coupon.desc}</p>
          
          <div className="flex items-center gap-2 mt-auto pb-4">
             {coupon.expiry ? (
               <span className="text-[8px] md:text-[9px] text-rose-500 font-black uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                 EXP: {coupon.expiry}
               </span>
             ) : (
               <span className="text-[8px] md:text-[9px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                 PERMANENT
               </span>
             )}
             <span className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-widest ml-auto opacity-40">
                NLY-STAMP-{(idx + 101).toString(16).toUpperCase()}
             </span>
          </div>
          
           {/* Redeemed Stamp */}
          {isRedeemed && (
            <motion.div 
               initial={{ scale: 2, opacity: 0, rotate: -20 }}
               animate={{ scale: 1, opacity: 1, rotate: -15 }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            >
               <div className="border-4 border-red-500/60 w-32 h-32 rounded-full rotate-[-15deg] flex flex-col items-center justify-center bg-transparent mix-blend-multiply">
                  <span className="text-red-500/60 font-black text-xl uppercase tracking-[0.2em] font-mono leading-none">REDEEMED</span>
               </div>
            </motion.div>
          )}

          {/* Holographic Overlays */}
          {!isRedeemed && (
            <>
              {/* Magic Shimmer */}
              <motion.div 
                style={{
                  translateX: shineX,
                  opacity: shineOpacity
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-30deg] pointer-events-none z-10"
              />
              {/* Holographic Rainbow Foil */}
              <motion.div
                style={{
                  opacity: foilOpacity,
                  background: foilBackground
                }}
                className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-none"
              />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AddButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[90] px-8 py-3 rounded-full bg-white/50 backdrop-blur-md text-pink-500 shadow-lg flex items-center gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs border-none"
    >
      <i className="fas fa-plus"></i>
      Add New Coupon
    </motion.button>
  );
};

const isAvatarImageSrc = (avatar: string) => (
  avatar.startsWith('http://') ||
  avatar.startsWith('https://') ||
  avatar.startsWith('/') ||
  avatar.startsWith('data:image/')
);

export const PartnerAvatar: React.FC<{ avatar: string; name: string }> = ({ avatar, name }) => {
  if (isAvatarImageSrc(avatar)) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={20}
        height={20}
        unoptimized
        className="w-5 h-5 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="w-5 h-5 rounded-full bg-white/40 flex items-center justify-center text-xs leading-none">
      {avatar}
    </span>
  );
};
