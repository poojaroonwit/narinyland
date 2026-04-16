
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
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size * 0.6 }}
    >
      <svg
        viewBox="0 0 400 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* Main Heart Background */}
        <motion.path
          d="M200 160C140 130 100 90 100 55C100 30 120 10 145 10C165 10 185 25 200 45C215 25 235 10 255 10C280 10 300 30 300 55C300 90 260 130 200 160Z"
          fill="url(#heartGradient)"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        
        {/* Cute Puppy Ears */}
        <path
          d="M165 40Q150 10 140 35Q130 60 155 55"
          fill="#FFF"
          stroke="#FCE7F3"
          strokeWidth="2"
        />
        <path
          d="M235 40Q250 10 260 35Q270 60 245 55"
          fill="#FFF"
          stroke="#FCE7F3"
          strokeWidth="2"
        />

        {/* Puppy Face */}
        <circle cx="200" cy="55" r="28" fill="white" />
        <circle cx="190" cy="50" r="3" fill="#333" />
        <circle cx="210" cy="50" r="3" fill="#333" />
        <path d="M195 62Q200 68 205 62" stroke="#333" strokeWidth="2" fill="none" />
        <circle cx="200" cy="58" r="4" fill="#FF85A2" />

        {/* Sparkles */}
        <motion.circle
          cx="120" cy="30" r="3" fill="#FDE047"
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
        />
        <motion.circle
          cx="280" cy="80" r="4" fill="#FDE047"
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
        />

        {/* Integrated Text */}
        <text
          x="200"
          y="185"
          textAnchor="middle"
          className="font-pacifico"
          style={{ 
            fontSize: title.length > 10 ? '40px' : '52px', 
            fill: '#EF4444', 
            fontFamily: 'Pacifico, cursive',
            filter: 'drop-shadow(2px 2px 2px rgba(255,255,255,0.8))'
          }}
        >
          {title}
        </text>

        <defs>
          <linearGradient id="heartGradient" x1="100" y1="10" x2="300" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F87171" />
            <stop offset="1" stopColor="#F472B6" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
};

export default Logo;
