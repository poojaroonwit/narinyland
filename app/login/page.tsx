"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated } from '@/lib/auth';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated()) {
      router.replace('/');
    }
  }, [router]);

  const handleSignIn = async () => {
    await login();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 25%, #fbcfe8 50%, #f9a8d4 75%, #f472b6 100%)',
      }}
    >
      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-pink-300/30 select-none"
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              scale: 0.5 + Math.random() * 1,
              rotate: Math.random() * 360,
            }}
            animate={{
              y: [null, '-20px', '20px', '-10px'],
              rotate: [null, 10, -10, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              repeatType: 'mirror',
              delay: Math.random() * 3,
            }}
            style={{ fontSize: `${20 + Math.random() * 30}px` }}
          >
            {['🌸', '💕', '✨', '🌷', '💖', '🦋'][i % 6]}
          </motion.div>
        ))}
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-md w-full rounded-3xl p-8 md:p-10 text-center shadow-2xl relative z-10"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
        }}
      >
        {/* Logo / Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <div
            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #ec4899, #f472b6, #f9a8d4)',
              boxShadow: '0 8px 30px rgba(236, 72, 153, 0.3)',
            }}
          >
            <span className="text-5xl">🌳</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold mb-2"
          style={{
            fontFamily: "'Pacifico', cursive",
            background: 'linear-gradient(135deg, #ec4899, #be185d)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Narinyland
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 mb-8 text-sm"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Welcome to our love garden 🌷<br />
          Sign in to nurture your memories together.
        </motion.p>

        {/* Sign In Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(236, 72, 153, 0.5)' }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSignIn}
          className="w-full py-4 px-8 rounded-2xl font-semibold text-white text-lg transition-all duration-300 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)',
            fontFamily: "'Outfit', sans-serif",
            boxShadow: '0 4px 20px rgba(236, 72, 153, 0.4)',
          }}
        >
          <span className="flex items-center justify-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Sign In / Sign Up
          </span>
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400" style={{ fontFamily: "'Outfit', sans-serif" }}>
            powered by
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* AppKit Branding */}
        <div 
          className="flex items-center justify-center gap-2 text-gray-400 text-xs cursor-help p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => {
            const config = {
              'SDK_DOMAIN': process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'MISSING',
              'SDK_CLIENT_ID': process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || 'MISSING',
              'NEXT_API_URL': process.env.NEXT_PUBLIC_API_URL || 'DEFAULT (/api)',
              'NODE_ENV': process.env.NODE_ENV
            };
            console.table(config);
            alert(
              `🔍 AppKit Diagnostic Console\n\n` +
              `Domain: ${config.SDK_DOMAIN}\n` +
              `Client ID: ${config.SDK_CLIENT_ID}\n\n` +
              `Status: ${config.SDK_CLIENT_ID === 'MISSING' ? '❌ CONFIG ERROR' : '✅ CONFIGURED'}\n\n` +
              `If MISSING, ensure variables are added to Railway UI and redeployed.`
            );
          }}
        >
          <span style={{ fontFamily: "'Outfit', sans-serif" }}>AlphaYard AppKit Support</span>
          <span>🔒</span>
        </div>
      </motion.div>
    </div>
  );
}
