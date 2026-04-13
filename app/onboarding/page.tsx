"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { getAccessToken } from '@/lib/auth';

type Mode = 'select' | 'create' | 'join';

export default function OnboardingPage() {
  const { user, refreshUser, setActiveCircle } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('select');
  const [worldName, setWorldName] = useState('');
  const [worldCode, setWorldCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!worldName.trim()) { setError('FIELD REQUIRED'); return; }
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: worldName.trim(),
          description: `${worldName.trim()} — NARINYLAND ARCHIVE`,
          userId: user?.sub,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'ALLOCATION FAILURE');
      }

      const circle = await res.json();
      await fetch('/api/circles/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ circleId: circle.id, userId: user?.sub }),
      }).catch(() => {});

      await setActiveCircle(circle.id);
      await refreshUser();
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'SYSTEM ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = worldCode.trim();
    if (!code) { setError('ACCESS CODE REQUIRED'); return; }
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      const res = await fetch('/api/circles/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ circleId: code, userId: user?.sub }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'ACCESS DENIED: INVALID CODE');
      }

      await setActiveCircle(code);
      await refreshUser();
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'SYSTEM ERROR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7f5f2] font-geist px-4 relative overflow-hidden">
      {/* Background minimalist patterns */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10"
      >
        <div className="flex flex-col items-center mb-24 space-y-12">
          <div className="grayscale opacity-100 scale-150">
             <Logo size={80} title="" />
          </div>
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-black text-black uppercase tracking-extratight leading-none">SYSTEM_INITIALIZATION</h1>
            <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.6em] flex items-center justify-center gap-4">
               <span className="w-8 h-[1px] bg-black/10"></span>
               Establish Secure Archive Link
               <span className="w-8 h-[1px] bg-black/10"></span>
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <button
                onClick={() => setMode('create')}
                className="group flex flex-col items-center gap-8 p-12 bg-white border border-black/5 hover:border-black shadow-[0_30px_60px_rgba(0,0,0,0.03)] transition-all duration-700 relative"
              >
                <div className="w-24 h-24 bg-black/[0.02] border border-black/5 flex items-center justify-center text-4xl grayscale group-hover:grayscale-0 group-hover:bg-black group-hover:text-white transition-all">
                  ✦
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[12px] font-black text-black uppercase tracking-[0.3em]">NEW ARCHIVE</p>
                  <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.4em]">DEPLOY_SYSTEM</p>
                </div>
              </button>
 
              <button
                onClick={() => setMode('join')}
                className="group flex flex-col items-center gap-8 p-12 bg-white border border-black/5 hover:border-black shadow-[0_30px_60px_rgba(0,0,0,0.03)] transition-all duration-700 relative"
              >
                <div className="w-24 h-24 bg-black/[0.02] border border-black/5 flex items-center justify-center text-4xl grayscale group-hover:grayscale-0 group-hover:bg-black group-hover:text-white transition-all">
                  ⚙
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[12px] font-black text-black uppercase tracking-[0.3em]">SYNC ACCESS</p>
                  <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.4em]">CONNECT_NODE</p>
                </div>
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white border border-black/5 p-12 space-y-12 shadow-2xl relative"
            >
              <div className="flex items-center gap-8">
                <button
                  onClick={() => { setMode('select'); setError(''); }}
                  className="w-14 h-14 flex items-center justify-center bg-black/5 hover:bg-black text-black hover:text-white transition-all border border-black/5"
                >
                  <i className="fas fa-arrow-left text-xs"></i>
                </button>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.4em]">INITIALIZE_NODE</p>
                   <h2 className="text-sm font-black text-black uppercase tracking-[0.2em]">ALLOCATE_NEW_ARCHIVE</h2>
                </div>
              </div>
 
              <div className="space-y-6">
                <label className="text-[9px] font-black text-black opacity-20 uppercase tracking-[0.6em]">ARCHIVE_DESIGNATION</label>
                <input
                  type="text"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="ENTER_DESIGNATION..."
                  className="w-full bg-black/[0.02] border border-black/5 p-6 font-black text-sm uppercase tracking-tight focus:bg-white focus:border-black outline-none transition-all shadow-inner"
                  autoFocus
                />
              </div>
 
              {error && <p className="text-[10px] font-black text-black text-center bg-black/5 p-6 tracking-[0.3em] uppercase">{error}</p>}
 
              <button
                onClick={handleCreate}
                disabled={loading || !worldName.trim()}
                className="w-full py-8 bg-black text-white font-black text-[12px] uppercase tracking-[0.6em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-neutral-800 transition-all disabled:opacity-20"
              >
                {loading ? 'PROCESSING_ALLOCATION…' : 'AUTHORIZE_DEPLOYMENT'}
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white border border-black/5 p-12 space-y-12 shadow-2xl relative"
            >
              <div className="flex items-center gap-8">
                <button
                  onClick={() => { setMode('select'); setError(''); }}
                  className="w-14 h-14 flex items-center justify-center bg-black/5 hover:bg-black text-black hover:text-white transition-all border border-black/5"
                >
                  <i className="fas fa-arrow-left text-xs"></i>
                </button>
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-black/20 uppercase tracking-[0.4em]">ESTABLISH_LINK</p>
                   <h2 className="text-sm font-black text-black uppercase tracking-[0.2em]">SYNC_WITH_ARCHIVE</h2>
                </div>
              </div>
 
              <div className="space-y-6">
                <label className="text-[9px] font-black text-black opacity-20 uppercase tracking-[0.6em]">ACCESS_CODE_SEQ</label>
                <input
                  type="text"
                  value={worldCode}
                  onChange={(e) => setWorldCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="INPUT_SEQUENCE..."
                  className="w-full bg-black/[0.02] border border-black/5 p-6 font-black text-sm tracking-widest focus:bg-white focus:border-black outline-none transition-all shadow-inner"
                  autoFocus
                />
              </div>
 
              {error && <p className="text-[10px] font-black text-black text-center bg-black/5 p-6 tracking-[0.3em] uppercase">{error}</p>}
 
              <button
                onClick={handleJoin}
                disabled={loading || !worldCode.trim()}
                className="w-full py-8 bg-black text-white font-black text-[12px] uppercase tracking-[0.6em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-neutral-800 transition-all disabled:opacity-20"
              >
                {loading ? 'SYNCHRONIZING_NODE…' : 'AUTHORIZE_ACCESS'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
