import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface UserDropdownProps {
  user: {
    name: string;
    email: string;
    picture: string;
  } | null;
  onLogout: () => void;
  onEditUserInfo?: () => void;
  onOpenSettings?: () => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  loading?: boolean;
  isMobile?: boolean;
}

export default function UserDropdown({
  user,
  onLogout,
  onEditUserInfo,
  onOpenSettings,
  isOpen: controlledOpen,
  onOpenChange,
  loading,
  isMobile = false,
}: UserDropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOpen = controlledOpen ?? uncontrolledOpen;

  const setDropdownOpen = useCallback((nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [controlledOpen, onOpenChange]);

  // Register dismissal events only while open; Escape works on mobile and desktop.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setDropdownOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setDropdownOpen]);

  const displayUser = user || { name: 'My Account', email: '', picture: '' };
  
  const menuItems = [
    {
      label: 'Edit Profile',
      icon: 'fas fa-user-edit',
      onClick: onEditUserInfo,
      color: 'text-[#594d41] hover:text-[#426850] hover:bg-[#eef1e5]'
    },
    {
      label: 'App Settings',
      icon: 'fas fa-cog',
      onClick: onOpenSettings,
      color: 'text-[#594d41] hover:text-[#426850] hover:bg-[#eef1e5]'
    },
    {
      label: 'Log Out',
      icon: 'fas fa-sign-out-alt',
      onClick: onLogout,
      color: 'text-[#a15b4b] hover:bg-[#fbf0e9]'
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button 
        onClick={() => {
          setDropdownOpen(!isOpen);
        }}
        disabled={loading}
        aria-label={isOpen ? 'Close account menu' : 'Open account menu'}
        aria-expanded={isOpen}
        className={`cozy-float w-11 h-11 rounded-2xl overflow-hidden border-2 border-[#efe4d4] hover:border-[#92a891] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#476b55] ${loading ? 'animate-pulse bg-gray-200' : ''}`}
      >
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fas fa-circle-notch animate-spin text-pink-300"></i>
          </div>
        ) : displayUser.picture ? (
          <Image src={displayUser.picture} alt={displayUser.name} width={40} height={40} unoptimized className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#7b9477] flex items-center justify-center text-white font-bold text-lg">
            {displayUser.name ? displayUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
        )}
      </button>

      {/* Dropdown Menu (Desktop) / Drawer (Mobile) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDropdownOpen(false)}
              className="fixed inset-0 bg-[#342b21]/35 backdrop-blur-sm z-[75] md:hidden"
            />
            
            <motion.div
              initial={isMobile ? { y: "100%" } : { opacity: 0, y: -10, scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={isMobile ? { y: "100%" } : { opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.2 }}
              className={`fixed md:absolute bottom-0 md:bottom-auto md:top-full md:right-0 md:mt-3 w-full md:w-56 cozy-surface rounded-t-[2rem] md:rounded-2xl overflow-hidden z-[80]`}
            >
              {/* Drawer Handle (Mobile) */}
              <div className="flex justify-center pt-4 pb-2 md:hidden">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
              </div>

              <div className="p-6 md:p-4 border-b border-[#ebdfcf] text-center md:text-left">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 md:hidden overflow-hidden border-2 border-[#d5c8b7]">
                  {displayUser.picture ? (
                    <Image src={displayUser.picture} alt={displayUser.name} width={64} height={64} unoptimized className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#e2eddf] flex items-center justify-center text-[#426850] text-2xl font-black">
                      {displayUser.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-lg md:text-sm font-semibold text-[#4d4439] truncate">{displayUser.name}</p>
                <p className="text-sm md:text-xs text-[#786b5c] truncate">{displayUser.email}</p>
              </div>
              
              <div className="p-3 md:p-1">
                {menuItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setDropdownOpen(false);
                      if (item.onClick) item.onClick();
                    }}
                    className={`w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm rounded-xl transition-colors flex items-center gap-3 md:gap-2 ${item.color}`}
                  >
                    <i className={`${item.icon} w-5 md:w-4 text-center opacity-70`}></i>
                    <span className="font-bold md:font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
              
              {/* Extra spacing for mobile safe area */}
              <div className="h-8 md:hidden"></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>

  );
}

