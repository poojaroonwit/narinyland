
"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  size?: number;
  title?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 200, title = "Narinyland" }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size * 0.4, height: size * 0.4 }}
      >
        {/* Geometric Abstract Symbol - Minimalist Clay Shape */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <motion.rect
            x="20" y="20" width="60" height="60" rx="18"
            fill="black"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <motion.circle
            cx="50" cy="50" r="10"
            fill="white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          />
          <motion.path
            d="M50 20C50 20 80 40 80 50C80 60 50 80 50 80"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          />
        </svg>
      </div>

      {/* Modern Typographic Logo */}
      <h1 
        className="text-black font-extrabold tracking-tighter"
        style={{ 
          fontSize: size * 0.15,
          fontFamily: "'Geist', 'Inter', sans-serif"
        }}
      >
        {title.toUpperCase()}
      </h1>
      
      <div className="h-0.5 w-12 bg-black opacity-20 rounded-full" />
    </motion.div>
  );
};

export default Logo;
