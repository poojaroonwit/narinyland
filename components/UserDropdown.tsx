import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserDropdownProps {
  user: {
    name: string;
    email: string;
    picture: string;
  } | null;
  onLogout: () => void;
  onEditUserInfo?: () => void;
  loading?: boolean;
}

export default function UserDropdown({ user, onLogout, onEditUserInfo, loading }: UserDropdownProps) {
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

  const displayUser = user || { name: 'User', email: 'guest@narinyland.com', picture: '' };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`w-10 h-10 rounded-full shadow-lg overflow-hidden border-2 border-white/50 hover:border-pink-300 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-400 ${loading ? 'animate-pulse bg-gray-200' : ''}`}
      >
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fas fa-circle-notch animate-spin text-pink-300"></i>
          </div>
        ) : displayUser.picture ? (
          <img src={displayUser.picture} alt={displayUser.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
            {displayUser.name ? displayUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-100 overflow-hidden z-[80]"
          >
            <div className="p-4 border-b border-pink-50">
              <p className="text-sm font-bold text-gray-800 truncate">{displayUser.name}</p>
              <p className="text-xs text-gray-500 truncate">{displayUser.email}</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onEditUserInfo) onEditUserInfo();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 rounded-xl transition-colors flex items-center gap-2"
              >
                <i className="fas fa-user-edit w-4 text-center"></i>
                Edit Profile
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 mt-1"
              >
                <i className="fas fa-sign-out-alt w-4 text-center"></i>
                Log Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
