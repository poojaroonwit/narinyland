import React, { useState, useEffect, useRef } from 'react';
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
  loading?: boolean;
  isMobile?: boolean;
}

export default function UserDropdown({ user, onLogout, onEditUserInfo, onOpenSettings, loading }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const displayUser = user || { name: 'My Account', email: '', picture: '' };
  
  const menuItems = [
    {
      label: 'Edit Profile',
      icon: 'fas fa-user-edit',
      onClick: onEditUserInfo,
      color: 'text-gray-700 hover:text-pink-600 hover:bg-pink-50'
    },
    {
      label: 'App Settings',
      icon: 'fas fa-cog',
      onClick: onOpenSettings,
      color: 'text-gray-700 hover:text-pink-600 hover:bg-pink-50'
    },
    {
      label: 'Log Out',
      icon: 'fas fa-sign-out-alt',
      onClick: onLogout,
      color: 'text-red-600 hover:bg-red-50'
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        aria-label={isOpen ? 'Close account menu' : 'Open account menu'}
        aria-expanded={isOpen}
        className={`w-10 h-10 rounded-full shadow-lg overflow-hidden border-2 border-white/50 hover:border-pink-300 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-400 ${loading ? 'animate-pulse bg-gray-200' : ''}`}
      >
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fas fa-circle-notch animate-spin text-pink-300"></i>
          </div>
        ) : displayUser.picture ? (
          <Image src={displayUser.picture} alt={displayUser.name} width={40} height={40} unoptimized className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
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
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[75] md:hidden"
            />
            
            <motion.div
              initial={typeof window !== 'undefined' && window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, y: -10, scale: 0.95 }}
              animate={typeof window !== 'undefined' && window.innerWidth < 768 ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={typeof window !== 'undefined' && window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.2 }}
              className={`fixed md:absolute bottom-0 md:bottom-auto md:top-full md:right-0 md:mt-3 w-full md:w-48 bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] md:rounded-md shadow-2xl border-t md:border border-pink-100 overflow-hidden z-[80]`}
            >
              {/* Drawer Handle (Mobile) */}
              <div className="flex justify-center pt-4 pb-2 md:hidden">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
              </div>

              <div className="p-6 md:p-4 border-b border-pink-50 text-center md:text-left">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 md:hidden overflow-hidden border-2 border-pink-100">
                  {displayUser.picture ? (
                    <Image src={displayUser.picture} alt={displayUser.name} width={64} height={64} unoptimized className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-pink-100 flex items-center justify-center text-pink-500 text-2xl font-black">
                      {displayUser.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-lg md:text-sm font-black text-gray-800 truncate">{displayUser.name}</p>
                <p className="text-sm md:text-xs text-gray-500 truncate">{displayUser.email}</p>
              </div>
              
              <div className="p-3 md:p-1">
                {menuItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsOpen(false);
                      if (item.onClick) item.onClick();
                    }}
                    className={`w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm rounded-md transition-colors flex items-center gap-3 md:gap-2 ${item.color}`}
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

