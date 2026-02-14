"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
// Added Variants to imports for proper typing
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
      <div className="absolute inset-0" style={{ backgroundColor: color, transform: `translateZ(${halfD}px)`, filter: 'brightness(1.1)' }} />
      <div className="absolute inset-0" style={{ backgroundColor: color, transform: `rotateY(180deg) translateZ(${halfD}px)`, filter: 'brightness(0.7)' }} />
      <div className="absolute inset-0" style={{ width: depth, left: halfW - halfD, backgroundColor: color, transform: `rotateY(-90deg) translateZ(${halfW}px)`, filter: 'brightness(0.8)' }} />
      <div className="absolute inset-0" style={{ width: depth, left: halfW - halfD, backgroundColor: color, transform: `rotateY(90deg) translateZ(${halfW}px)`, filter: 'brightness(0.9)' }} />
      <div className="absolute inset-0" style={{ height: depth, top: halfH - halfD, backgroundColor: color, transform: `rotateX(90deg) translateZ(${halfH}px)`, filter: 'brightness(1.2)' }} />
      <div className="absolute inset-0" style={{ height: depth, top: halfH - halfD, backgroundColor: color, transform: `rotateX(-90deg) translateZ(${halfH}px)`, filter: 'brightness(0.6)' }} />
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
        rotateX: [0, 60, -60, 0],
        y: [0, -10, 0]
      } : isExcited ? {
        y: [0, -5, 0],
        scaleY: [1, 0.8, 1.2, 1]
      } : { rotateX: 0, y: 0 }}
      transition={{ 
        duration: isRunning ? 0.35 : 0.2, 
        repeat: Infinity, 
        delay, 
        ease: "easeInOut" 
      }}
    >
      <Box3D width={12} height={22} depth={12} color={color} />
      {/* Changed translateZ to transform: 'translateZ' to fix CSSProperties error */}
      <Box3D width={14} height={6} depth={14} color="#334155" className="top-[18px] left-[-1px]" style={{ transform: 'translateZ(2px)' }} />
    </motion.div>
  );
};

const BoxPuppy: React.FC<{ emotion: Emotion; isClicked: boolean; level: number }> = ({ emotion, isClicked, level }) => {
  const tan = "#fcd34d"; 
  const white = "#ffffff"; 
  const brown = "#92400e";
  const black = "#1e293b";
  const isRunning = emotion === 'playing';
  const isExcited = emotion === 'excited' || isClicked;

  // Explicitly typing variants as Variants to fix type inference issues with ease strings
  const bodyVariants: Variants = {
    playing: {
      y: [0, -15, 0],
      rotateZ: [0, -4, 4, 0],
      rotateX: [0, 8, -8, 0],
      transition: { duration: 0.175, repeat: Infinity, ease: "linear" }
    },
    excited: {
      y: [0, -60, 0],
      scaleX: [1, 1.1, 0.9, 1],
      scaleY: [1, 0.8, 1.2, 1],
      rotateZ: [0, 5, -5, 0],
      transition: { duration: 0.4, repeat: Infinity, ease: "backOut" }
    },
    sleeping: {
      rotateX: [0, -5, 0],
      scale: [0.95, 1, 0.95],
      transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
    },
    neutral: {
      y: [0, -6, 0],
      scale: [1, 1.03, 1],
      rotateZ: [0, 1, -1, 0],
      transition: { 
        duration: 3, 
        repeat: Infinity, 
        ease: "easeInOut"
      }
    },
    waiting: {
      rotateY: [0, 15, -15, 0],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    },
    thinking: {
      rotateY: [0, 360],
      transition: { duration: 2, repeat: Infinity, ease: "linear" }
    }
  };

  return (
    <motion.div 
      variants={bodyVariants}
      animate={isExcited ? 'excited' : emotion}
      style={{ transformStyle: 'preserve-3d', position: 'relative' }}
    >
      <Box3D width={70} height={45} depth={90} color={tan} className="left-[-35px] top-[-22px]" />
      {/* Changed translateZ to transform: 'translateZ' to fix CSSProperties error */}
      <Box3D width={50} height={15} depth={70} color={white} className="left-[-25px] top-[15px]" style={{ transform: 'translateZ(5px)' }} />

      {level >= 4 && (
        <div style={{ transformStyle: 'preserve-3d' }}>
           <motion.div 
             style={{ position: 'absolute', top: -10, left: -45, translateZ: 0, transformStyle: 'preserve-3d', transformOrigin: 'right' }}
             animate={{ rotateY: isExcited ? [0, -70, 0] : [0, -20, 0] }}
             transition={{ duration: isExcited ? 0.2 : 2, repeat: Infinity, ease: "easeInOut" }}
           >
             <Box3D width={40} height={5} depth={30} color="#fef3c7" style={{ transform: 'rotateX(-20deg)' }} />
           </motion.div>
           <motion.div 
             style={{ position: 'absolute', top: -10, left: 5, translateZ: 0, transformStyle: 'preserve-3d', transformOrigin: 'left' }}
             animate={{ rotateY: isExcited ? [0, 70, 0] : [0, 20, 0] }}
             transition={{ duration: isExcited ? 0.2 : 2, repeat: Infinity, ease: "easeInOut" }}
           >
             <Box3D width={40} height={5} depth={30} color="#fef3c7" style={{ transform: 'rotateX(-20deg)' }} />
           </motion.div>
        </div>
      )}

      <motion.div 
        style={{ transformStyle: 'preserve-3d', position: 'absolute', top: -45, left: -30, translateZ: 55 }}
        animate={
          isRunning ? { rotateY: -25, rotateX: 15 } : 
          emotion === 'sleeping' ? { rotateX: 45, y: 10 } : 
          isExcited ? { rotateX: [-10, 10, -10], y: [-5, 5, -5] } :
          { rotateX: [0, 10, 0], rotateY: [0, 5, -5, 0] }
        }
        transition={{ duration: isExcited ? 0.4 : 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Box3D width={60} height={55} depth={55} color={tan} />
        {level >= 5 && (
          <motion.div 
            style={{ position: 'absolute', top: -30, left: 10, translateZ: 0, transformStyle: 'preserve-3d' }}
            animate={{ rotateY: [0, 360], y: [-5, 5, -5] }}
            transition={{ rotateY: { duration: 4, repeat: Infinity, ease: "linear" }, y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
          >
             <div className="w-10 h-10 border-4 border-yellow-200 rounded-full shadow-[0_0_15px_rgba(253,224,71,0.5)]" style={{ transform: 'rotateX(80deg)' }} />
          </motion.div>
        )}
        {/* Changed translateZ to transform: 'translateZ' to fix CSSProperties error */}
        <Box3D width={30} height={20} depth={25} color={white} className="left-[15px] top-[25px]" style={{ transform: 'translateZ(30px)' }} />
        <Box3D width={12} height={8} depth={5} color={black} className="left-[24px] top-[26px]" style={{ transform: 'translateZ(42px)' }} />
        {isExcited && (
          <motion.div
            animate={{ scaleY: [1, 1.6, 1], rotateZ: [-5, 5, -5] }}
            transition={{ duration: 0.15, repeat: Infinity }}
            style={{ transformStyle: 'preserve-3d', position: 'absolute', left: 24, top: 42, translateZ: 40 }}
          >
            <Box3D width={12} height={15} depth={4} color="#f43f5e" />
          </motion.div>
        )}
        <div className="absolute left-[12px] top-[18px] w-4 h-4 bg-slate-900 rounded-full" style={{ transform: 'translateZ(28px)' }}>
          <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full opacity-60" />
        </div>
        <div className="absolute right-[12px] top-[18px] w-4 h-4 bg-slate-900 rounded-full" style={{ transform: 'translateZ(28px)' }}>
          <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full opacity-60" />
        </div>
        <motion.div 
           style={{ transformStyle: 'preserve-3d' }} 
           animate={
             isExcited ? { rotateX: [-20, 20, -20], rotateZ: [-10, 10, -10] } : 
             emotion === 'neutral' ? { rotateZ: [0, 8, 0, -8, 0], rotateX: [0, 5, 0] } : 
             { rotateX: 0 }
           }
           transition={{ duration: isExcited ? 0.2 : 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Box3D width={15} height={35} depth={8} color={brown} className="left-[-10px] top-[5px]" style={{ transform: 'rotateZ(-10deg)' }} />
          <Box3D width={15} height={35} depth={8} color={brown} className="right-[-10px] top-[5px]" style={{ transform: 'rotateZ(10deg)' }} />
        </motion.div>
      </motion.div>

      <motion.div 
        style={{ transformStyle: 'preserve-3d', position: 'absolute', top: -15, left: -10, translateZ: -55 }}
        animate={isExcited ? { 
          rotateY: [0, 75, -75, 0], 
          rotateZ: [0, 40, -40, 0] 
        } : { rotateY: [0, 25, -25, 0] }}
        transition={{ duration: isExcited ? 0.12 : 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Box3D width={20} height={20} depth={45} color={tan} />
        {/* Changed translateZ to transform: 'translateZ' to fix CSSProperties error */}
        <Box3D width={16} height={16} depth={15} color={white} className="left-[2px] top-[2px]" style={{ transform: 'translateZ(-25px)' }} />
      </motion.div>

      <PuppyLeg x={-30} z={35} color={tan} isRunning={isRunning} isExcited={isExcited} delay={0} />
      <PuppyLeg x={20} z={35} color={tan} isRunning={isRunning} isExcited={isExcited} delay={0.1} />
      <PuppyLeg x={-30} z={-35} color={tan} isRunning={isRunning} isExcited={isExcited} delay={0.1} />
      <PuppyLeg x={20} z={-35} color={tan} isRunning={isRunning} isExcited={isExcited} delay={0} />
    </motion.div>
  );
};

const PetVisual: React.FC<PetVisualProps> = ({ emotion, message, level = 1, className = "", onPetClick }) => {
  const isPlaying = emotion === 'playing';
  const [isClicked, setIsClicked] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handlePetClick = () => {
    setIsClicked(true);
    setClickCount(prev => prev + 1);
    if (onPetClick) onPetClick();
    setTimeout(() => setIsClicked(false), 800);
  };

  // Explicitly typing variants as Variants
  const orbitVariants: Variants = {
    playing: {
      rotateY: [0, 360],
      transition: { duration: 3.5, repeat: Infinity, ease: "linear" }
    },
    idle: {
      rotateY: 0,
      transition: { duration: 1 }
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center perspective-[1200px] ${className}`}>


      <motion.div
        animate={isPlaying ? 'playing' : 'idle'}
        variants={orbitVariants}
        style={{ transformStyle: 'preserve-3d', width: 500, height: 250, position: 'relative' }}
        className="flex items-center justify-center"
      >
        {level >= 5 && (
           <motion.div 
             className="absolute w-64 h-64 bg-yellow-200/20 rounded-full blur-[60px]"
             animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
             transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
           />
        )}

        <motion.div 
          onClick={handlePetClick}
          className="cursor-pointer"
          style={{ transformStyle: 'preserve-3d', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          animate={{
            translateZ: isPlaying ? 260 : 0,
            y: isPlaying ? 70 : isClicked ? -60 : 0,
            rotateY: isPlaying ? -360 : 0, 
            rotateZ: isPlaying ? 8 : 0,
            scale: (isClicked ? 1.15 : 1) * (1 + (level - 1) * 0.05)
          }}
          transition={{ 
            translateZ: { duration: 1.2, ease: "easeOut" },
            y: isClicked ? { duration: 0.2, repeat: 1, repeatType: "reverse" } : { duration: 1.2, ease: "easeOut" },
            rotateY: isPlaying ? { duration: 3.5, repeat: Infinity, ease: "linear" } : { duration: 1.2 },
            rotateZ: { duration: 1.2 }
          }}
        >
          <motion.div
            style={{ 
              position: 'absolute', top: 55, width: 140, height: 60,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 70%)',
              borderRadius: '100%', transform: 'rotateX(90deg)', pointerEvents: 'none', filter: 'blur(10px)', zIndex: -1
            }}
            animate={{
              scale: isClicked ? 0.7 : isPlaying ? 1.3 : emotion === 'sleeping' ? 0.8 : 1,
              opacity: emotion === 'sleeping' ? 0.1 : isClicked ? 0.05 : 0.2,
            }}
            transition={{ duration: 0.3 }}
          />

          {level >= 2 && (
             <motion.div 
               animate={{ y: [-85, -105, -85], rotate: [0, 10, -10, 0] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="absolute top-0 left-1/2 -translate-x-1/2 z-50 text-7xl pointer-events-none drop-shadow-xl"
             >
               👑
             </motion.div>
          )}

          <BoxPuppy emotion={emotion} isClicked={isClicked} level={level} />

          {(isPlaying || emotion === 'excited' || isClicked) && [...Array(isClicked ? 15 : (level >= 3 ? 18 : 10))].map((_, i) => (
             <motion.div
               key={`${clickCount}-${i}`}
               initial={{ opacity: 0 }}
               animate={{ 
                 x: [0, (Math.random() - 0.5) * 600], 
                 y: [0, (Math.random() - 0.3) * -400],
                 opacity: [0, 1, 0],
                 scale: [0, 2.5, 0]
               }}
               transition={{ duration: isClicked ? 0.5 : 0.8, repeat: isClicked ? 0 : Infinity, delay: i * 0.08 }}
               className="absolute text-2xl pointer-events-none"
             >
               {isClicked ? '❤️' : level >= 5 ? '🌟' : level >= 3 ? '✨' : '🐾'}
             </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PetVisual;
