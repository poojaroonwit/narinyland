"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile } from '@/lib/auth';
import { useAuth } from './AuthProvider';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setAvatar(user.picture || '');
      setError(null);
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const success = await updateProfile({ name, avatar });
      if (success) {
        await refreshUser();
        onClose();
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
           initial={{ opacity: 0, scale: 0.9, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.9, y: 20 }}
           className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <i className="fas fa-times text-gray-400"></i>
            </button>
          </div>

          <div className="p-8 space-y-6">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full border-4 border-pink-100 p-1 bg-white shadow-inner overflow-hidden flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-pink-50 flex items-center justify-center text-3xl font-bold text-pink-300">
                    {name.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile Preview</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-pink-200 outline-none transition-all font-bold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Avatar URL</label>
                <input 
                  type="text" 
                  value={avatar} 
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full border-2 border-gray-50 rounded-2xl p-4 focus:border-pink-200 outline-none transition-all font-bold text-gray-700 text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">
                {error}
              </p>
            )}
          </div>

          <div className="p-6 bg-gray-50 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all border border-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all shadow-lg shadow-pink-200 ${isSaving ? 'bg-pink-300' : 'bg-pink-500 hover:bg-pink-600 scale-[1.02] active:scale-[0.98]'}`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserProfileModal;
