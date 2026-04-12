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
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setAvatar(user.picture || '');
      setAttributes(user.attributes || {});
      setError(null);
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const success = await updateProfile({ name, avatar, attributes });
      if (success) {
        await refreshUser();
        onClose();
      } else {
        setError('TRANSMISSION FAILURE');
      }
    } catch (err) {
      setError('SYSTEM ERROR');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl font-geist">
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 10 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 10 }}
           className="bg-white rounded-clay shadow-2xl w-full max-w-lg overflow-hidden border border-black/5"
        >
          <div className="p-8 border-b border-black/5 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em]">IDENTITY</p>
              <h2 className="text-xl font-black text-black uppercase tracking-tight">PROFILE UPDATE</h2>
            </div>
            <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-all">
              <i className="fas fa-times text-xs text-black/40"></i>
            </button>
          </div>

          <div className="p-10 space-y-10">
            {/* Avatar Preview */}
            <div className="flex items-center gap-8">
              <div className="w-24 h-24 rounded-xl bg-black/5 overflow-hidden flex items-center justify-center grayscale shadow-inner border border-black/5">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-3xl font-black text-black/10">{name.charAt(0).toUpperCase() || 'U'}</div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.2em]">PREVIEW</p>
                <p className="text-xs font-black text-black uppercase tracking-tight">{name || 'SYSTEM USER'}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.4em] ml-1">ASSIGNED NAME</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/5 border border-transparent rounded-xl p-4 font-black text-xs uppercase tracking-tight focus:bg-white focus:border-black outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.4em] ml-1">RESOURCE URL</label>
                <input 
                  type="text" 
                  value={avatar} 
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="HTTPS://..."
                  className="w-full bg-black/5 border border-transparent rounded-xl p-4 font-black text-xs tracking-tight focus:bg-white focus:border-black outline-none transition-all"
                />
              </div>

              <div className="pt-6 border-t border-black/5">
                 <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.4em] ml-1">BIOGRAPHY</label>
                      <textarea 
                        value={attributes.bio || ''} 
                        onChange={(e) => setAttributes({...attributes, bio: e.target.value})}
                        className="w-full bg-black/5 border border-transparent rounded-xl p-4 font-black text-[11px] uppercase tracking-widest leading-relaxed focus:bg-white focus:border-black outline-none transition-all h-24 resize-none shadow-inner"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.4em] ml-1">COORDINATES</label>
                         <input 
                           type="text" 
                           value={attributes.location || ''} 
                           onChange={(e) => setAttributes({...attributes, location: e.target.value})}
                           className="w-full bg-black/5 border border-transparent rounded-xl p-4 font-black text-[10px] uppercase tracking-widest focus:bg-white focus:border-black outline-none transition-all"
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.4em] ml-1">TIMESTAMP</label>
                         <input 
                           type="text" 
                           value={attributes.birthday || ''} 
                           onChange={(e) => setAttributes({...attributes, birthday: e.target.value})}
                           placeholder="YYYY-MM-DD"
                           className="w-full bg-black/5 border border-transparent rounded-xl p-4 font-black text-[10px] uppercase tracking-widest focus:bg-white focus:border-black outline-none transition-all"
                         />
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            {error && (
              <p className="text-[10px] font-black text-black text-center bg-black/5 p-4 rounded-xl border border-black/5 tracking-widest">
                {error}
              </p>
            )}
          </div>

          <div className="p-8 bg-black/5 flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-5 rounded-pill font-black text-[10px] text-black/30 hover:text-black uppercase tracking-[0.3em] transition-all"
            >
              CANCEL
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-5 rounded-pill bg-black text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl hover:bg-black/80 transition-all disabled:opacity-20"
            >
              {isSaving ? 'UPLOADING...' : 'COMMIT CHANGES'}
            </button>
          </div>
        </motion.div>
    </div>
  );
};

export default UserProfileModal;
