"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Emotion } from '../types';

interface PetVisualProps {
  emotion: Emotion;
  message: string;
  level?: number;
  className?: string;
  onPetClick?: () => void;
}

const Box3D: React.FC<{ 
  width: number; 
  height: number; 
  depth: number; 
  color: string; 
  className?: string;
  style?: React.CSSProperties;
}> = ({ width, height, depth, color, className = "", style = {} }) => {
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  return (
    <div 
      className={`absolute ${className}`} 
      style={{ 
        width, height, 
        transformStyle: 'preserve-3d',
        ...style 
      }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: color, transform: `translateZ(${halfD}px)`, filter: 'brightness(1.05)' }} />
      <div className="absolute inset-0" style={{ backgroundColor: color, transform: `rotateY(180deg) translateZ(${halfD}px)`, filter: 'brightness(0.85)' }} />
      <div className="absolute inset-0" style={{ width: depth, left: halfW - halfD, backgroundColor: color, transform: `rotateY(-90deg) translateZ(${halfW}px)`, filter: 'brightness(0.9)' }} />
      <div className="absolute inset-0" style={{ width: depth, left: halfW - halfD, backgroundColor: color, transform: `rotateY(90deg) translateZ(${halfW}px)`, filter: 'brightness(0.95)' }} />
      <div className="absolute inset-0" style={{ height: depth, top: halfH - halfD, backgroundColor: color, transform: `rotateX(90deg) translateZ(${halfH}px)`, filter: 'brightness(1.1)' }} />
      <div className="absolute inset-0" style={{ height: depth, top: halfH - halfD, backgroundColor: color, transform: `rotateX(-90deg) translateZ(${halfH}px)`, filter: 'brightness(0.7)' }} />
    </div>
  );
};

const PuppyLeg: React.FC<{ 
  x: number; 
  z: number; 
  color: string; 
  delay?: number; 
  isRunning: boolean;
  isExcited: boolean;
}> = ({ x, z, color, delay = 0, isRunning, isExcited }) => {
  return (
    <motion.div
      style={{ transformStyle: 'preserve-3d', position: 'absolute', left: x, top: 20, translateZ: z }}
      animate={isRunning ? { 
        rotateX: [0, 45, -45, 0],
        y: [0, -8, 0]
      } : isExcited ? {
        y: [0, -5, 0],
        scaleY: [1, 0.9, 1.1, 1]
      } : { rotateX: 0, y: 0 }}
      transition={{ 
        duration: isRunning ? 0.4 : 0.3, 
        repeat: Infinity, 
        delay, 
        ease: "easeInOut" 
      }}
    >
      <Box3D width={10} height={20} depth={10} color={color} />
      <Box3D width={12} height={4} depth={12} color="#000" className="top-[18px] left-[-1px]" style={{ transform: 'translateZ(1px)' }} />
    </motion.div>
  );
};

const BoxPuppy: React.FC<{ emotion: Emotion; isClicked: boolean; level: number }> = ({ emotion, isClicked, level }) => {
  // Use a premium minimalist charcoal/white/grey palette
  const primary = "#ffffff"; // Pure White
  const secondary = "#e5e7eb"; // Light Grey
  const accent = "#000000"; // Deep Black
  const darkCharcoal = "#1f2937";
  
  const isRunning = emotion === 'playing';
  const isExcited = emotion === 'excited' || isClicked;

  const bodyVariants: Variants = {
    playing: {
      y: [0, -12, 0],
      rotateZ: [0, -3, 3, 0],
      transition: { duration: 0.2, repeat: Infinity, ease: "linear" }
    },
    excited: {
      y: [0, -40, 0],
      scaleX: [1, 1.05, 0.95, 1],
      transition: { duration: 0.5, repeat: Infinity, ease: "anticipate" }
    },
    sleeping: {
      scale: [0.98, 1, 0.98],
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
    },
    neutral: {
      y: [0, -4, 0],
      scale: [1, 1.02, 1],
      transition: { 
        duration: 4, 
        repeat: Infinity, 
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      variants={bodyVariants}
      animate={isExcited ? 'excited' : emotion}
      style={{ transformStyle: 'preserve-3d', position: 'relative' }}
    >
      <Box3D width={70} height={45} depth={90} color={primary} className="left-[-35px] top-[-22px]" />
      <Box3D width={50} height={12} depth={70} color={secondary} className="left-[-25px] top-[18px]" style={{ transform: 'translateZ(5px)' }} />

      {/* Ears */}
      <div style={{ transformStyle: 'preserve-3d' }}>
         <motion.div 
           style={{ position: 'absolute', top: -10, left: -45, translateZ: 0, transformStyle: 'preserve-3d', transformOrigin: 'right' }}
           animate={{ rotateY: isExcited ? [0, -60, 0] : [0, -15, 0] }}
           transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
         >
           <Box3D width={35} height={4} depth={25} color={darkCharcoal} style={{ transform: 'rotateX(-15deg)' }} />
         </motion.div>
         <motion.div 
           style={{ position: 'absolute', top: -10, left: 10, translateZ: 0, transformStyle: 'preserve-3d', transformOrigin: 'left' }}
           animate={{ rotateY: isExcited ? [0, 60, 0] : [0, 15, 0] }}
           transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
         >
           <Box3D width={35} height={4} depth={25} color={darkCharcoal} style={{ transform: 'rotateX(-15deg)' }} />
         </motion.div>
      </div>

      {/* Head */}
      <motion.div 
        style={{ transformStyle: 'preserve-3d', position: 'absolute', top: -45, left: -30, translateZ: 50 }}
        animate={isExcited ? { rotateX: [-5, 5, -5] } : { rotateX: [0, 8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Box3D width={60} height={50} depth={50} color={primary} />
        <Box3D width={25} height={18} depth={20} color={secondary} className="left-[17px] top-[26px]" style={{ transform: 'translateZ(28px)' }} />
        <Box3D width={10} height={6} depth={4} color={accent} className="left-[25px] top-[28px]" style={{ transform: 'translateZ(38px)' }} />
        
        {/* Eyes */}
        <div className="absolute left-[12px] top-[18px] w-3 h-3 bg-black rounded-full" style={{ transform: 'translateZ(26px)' }}>
          <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-40" />
        </div>
        <div className="absolute right-[12px] top-[18px] w-3 h-3 bg-black rounded-full" style={{ transform: 'translateZ(26px)' }}>
          <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-40" />
        </div>
      </motion.div>

      {/* Tail */}
      <motion.div 
        style={{ transformStyle: 'preserve-3d', position: 'absolute', top: -15, left: -8, translateZ: -50 }}
        animate={isExcited ? { rotateY: [0, 80, -80, 0] } : { rotateY: [0, 20, -20, 0] }}
        transition={{ duration: isExcited ? 0.15 : 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Box3D width={16} height={16} depth={40} color={darkCharcoal} />
      </motion.div>

      <PuppyLeg x={-30} z={30} color={primary} isRunning={isRunning} isExcited={isExcited} delay={0} />
      <PuppyLeg x={20} z={30} color={primary} isRunning={isRunning} isExcited={isExcited} delay={0.1} />
      <PuppyLeg x={-30} z={-30} color={primary} isRunning={isRunning} isExcited={isExcited} delay={0.1} />
      <PuppyLeg x={20} z={-30} color={primary} isRunning={isRunning} isExcited={isExcited} delay={0} />
    </motion.div>
  );
};

const PetVisual: React.FC<PetVisualProps> = ({ emotion, message, level = 1, className = "", onPetClick }) => {
  const isPlaying = emotion === 'playing';
  const [isClicked, setIsClicked] = useState(false);

  const handlePetClick = () => {
    setIsClicked(true);
    if (onPetClick) onPetClick();
    setTimeout(() => setIsClicked(false), 800);
  };

  return (
    <div className={`relative flex flex-col items-center justify-center perspective-[1200px] font-geist ${className}`}>
      <motion.div
        style={{ transformStyle: 'preserve-3d', width: 400, height: 200, position: 'relative' }}
        className="flex items-center justify-center"
      >
        <motion.div 
           className="absolute w-80 h-20 bg-black/5 rounded-[100%] blur-[40px]"
           style={{ transform: 'rotateX(90deg) translateY(60px)' }}
           animate={{ scale: isClicked ? 1.2 : 1, opacity: isClicked ? 0.1 : 0.2 }}
        />

        <motion.div 
          onClick={handlePetClick}
          className="cursor-pointer"
          style={{ transformStyle: 'preserve-3d', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          animate={{
            y: isClicked ? -40 : 0,
            scale: isClicked ? 1.1 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <BoxPuppy emotion={emotion} isClicked={isClicked} level={level} />

          {(isPlaying || emotion === 'excited' || isClicked) && [...Array(10)].map((_, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, scale: 0 }}
               animate={{ 
                 x: [(Math.random() - 0.5) * 400], 
                 y: [(Math.random() - 0.5) * -300],
                 opacity: [0, 0.4, 0],
                 scale: [0.5, 1.5, 0]
               }}
               transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
               className="absolute text-black/10 text-xl font-black"
             >
               ✦
             </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Hover message bubble refactored to minimalist tag */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-8 bg-black text-white px-6 py-3 rounded-pill text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl border border-white/10"
          >
            {message.toUpperCase()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PetVisual;
