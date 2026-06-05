"use client";

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile } from '@/lib/auth';
import { useAuth } from './AuthProvider';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileAttributes = Record<string, string | undefined>;

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<ProfileAttributes>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setAvatar(user.picture || '');
      setAvatarPreview(user.picture || '');
      setAvatarFile(null);
      setAttributes((user.attributes || {}) as ProfileAttributes);
      setError(null);
    }
  }, [isOpen, user]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarSelect = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Please choose an image smaller than 5 MB.');
      return;
    }

    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
    setError(null);
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'avatars');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error || 'Failed to upload avatar.');
    }

    const data = await res.json() as { url?: string };
    if (!data.url) throw new Error('Avatar upload did not return a URL.');
    return data.url;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const savedAvatar = avatarFile ? await uploadAvatar(avatarFile) : avatar;
      const success = await updateProfile({ name, avatar: savedAvatar, attributes });
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
           className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
            <button onClick={onClose} aria-label="Close profile editor" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <i className="fas fa-times text-gray-400"></i>
            </button>
          </div>

          <div className="p-8 space-y-6">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full border-4 border-pink-100 p-1 bg-white shadow-inner overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar" width={96} height={96} unoptimized className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-pink-50 flex items-center justify-center text-3xl font-bold text-pink-300">
                    {name.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-md bg-pink-500 text-white text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-pink-600 transition-colors"
                >
                  <i className="fas fa-camera mr-2"></i>
                  Choose Photo
                </button>
                {(avatarPreview || avatarFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
                      setAvatar('');
                      setAvatarPreview('');
                      setAvatarFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2 rounded-md bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none transition-all font-bold text-gray-700"
                />
              </div>

              {/* Attributes Section */}
              <div className="pt-4 border-t border-gray-50">
                 <h3 className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-tags"></i> Attributes & Bio
                 </h3>
                 <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-0.5">Bio</label>
                      <textarea 
                        value={attributes.bio || ''} 
                        onChange={(e) => setAttributes({...attributes, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                        className="w-full border-2 border-gray-50 rounded-md p-4 focus:border-pink-200 outline-none transition-all font-bold text-gray-700 text-xs h-20 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-0.5">Location</label>
                         <input 
                           type="text" 
                           value={attributes.location || ''} 
                           onChange={(e) => setAttributes({...attributes, location: e.target.value})}
                           placeholder="Digital World"
                           className="w-full border-2 border-gray-50 rounded-md p-3 focus:border-pink-200 outline-none transition-all font-bold text-gray-700 text-xs"
                         />
                       </div>
                       <div>
                         <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest ml-0.5">Birthday</label>
                         <input 
                           type="text" 
                           value={attributes.birthday || ''} 
                           onChange={(e) => setAttributes({...attributes, birthday: e.target.value})}
                           placeholder="YYYY-MM-DD"
                           className="w-full border-2 border-gray-50 rounded-md p-3 focus:border-pink-200 outline-none transition-all font-bold text-gray-700 text-xs"
                         />
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-md border border-red-100">
                {error}
              </p>
            )}
          </div>

          <div className="p-6 bg-gray-50 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-md font-bold text-gray-500 hover:bg-gray-100 transition-all border border-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 py-4 rounded-md font-bold text-white transition-all shadow-lg shadow-pink-200 ${isSaving ? 'bg-pink-300' : 'bg-pink-500 hover:bg-pink-600 scale-[1.02] active:scale-[0.98]'}`}
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

