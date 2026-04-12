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
    <div className="min-h-screen flex items-center justify-center bg-white font-geist px-4 relative overflow-hidden">
      {/* Background minimalist patterns */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-black rounded-full blur-[200px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-black rounded-full blur-[200px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10"
      >
        <div className="flex flex-col items-center mb-16 space-y-8">
          <div className="grayscale opacity-80 scale-125">
             <Logo size={100} title="" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-black uppercase tracking-tight">SYSTEM INITIALIZATION</h1>
            <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.4em]">Establish Secure Archive Connection</p>
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
                className="group flex flex-col items-center gap-6 p-10 bg-white rounded-clay border border-black/5 hover:border-black/20 hover:shadow-2xl transition-all duration-700"
              >
                <div className="w-20 h-20 bg-black/5 rounded-2xl flex items-center justify-center text-3xl grayscale group-hover:grayscale-0 group-hover:bg-black/10 transition-all">
                  ✦
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[11px] font-black text-black uppercase tracking-[0.2em]">NEW ARCHIVE</p>
                  <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">Create World</p>
                </div>
              </button>

              <button
                onClick={() => setMode('join')}
                className="group flex flex-col items-center gap-6 p-10 bg-white rounded-clay border border-black/5 hover:border-black/20 hover:shadow-2xl transition-all duration-700"
              >
                <div className="w-20 h-20 bg-black/5 rounded-2xl flex items-center justify-center text-3xl grayscale group-hover:grayscale-0 group-hover:bg-black/10 transition-all">
                  ⚙
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[11px] font-black text-black uppercase tracking-[0.2em]">SYNC ACCESS</p>
                  <p className="text-[9px] font-black text-black/20 uppercase tracking-widest">Join World</p>
                </div>
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-clay border border-black/5 p-10 space-y-10 shadow-2xl"
            >
              <div className="flex items-center gap-6">
                <button
                  onClick={() => { setMode('select'); setError(''); }}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-all"
                >
                  <i className="fas fa-arrow-left text-xs text-black/40"></i>
                </button>
                <h2 className="text-xs font-black text-black uppercase tracking-tight">ALLOCATE NEW ARCHIVE</h2>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-black opacity-20 uppercase tracking-[0.4em] ml-1">ARCHIVE DESIGNATION</label>
                <input
                  type="text"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="E.G. OUR SHARED HISTORY"
                  className="w-full bg-black/5 border border-transparent rounded-xl p-5 font-black text-xs uppercase tracking-tight focus:bg-white focus:border-black outline-none transition-all shadow-inner"
                  autoFocus
                />
              </div>

              {error && <p className="text-[9px] font-black text-black text-center bg-black/5 p-4 rounded-xl tracking-widest">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={loading || !worldName.trim()}
                className="w-full py-6 bg-black text-white rounded-pill font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:bg-black/80 transition-all disabled:opacity-20"
              >
                {loading ? 'PROCESSING…' : 'AUTHORIZE ALLOCATION'}
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-clay border border-black/5 p-10 space-y-10 shadow-2xl"
            >
              <div className="flex items-center gap-6">
                <button
                  onClick={() => { setMode('select'); setError(''); }}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-all"
                >
                  <i className="fas fa-arrow-left text-xs text-black/40"></i>
                </button>
                <h2 className="text-xs font-black text-black uppercase tracking-tight">SYNC WITH ARCHIVE</h2>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-black opacity-20 uppercase tracking-[0.4em] ml-1">ACCESS CODE</label>
                <input
                  type="text"
                  value={worldCode}
                  onChange={(e) => setWorldCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="INPUT ACCESS SEQUENCE"
                  className="w-full bg-black/5 border border-transparent rounded-xl p-5 font-black text-xs tracking-widest focus:bg-white focus:border-black outline-none transition-all shadow-inner"
                  autoFocus
                />
              </div>

              {error && <p className="text-[9px] font-black text-black text-center bg-black/5 p-4 rounded-xl tracking-widest">{error}</p>}

              <button
                onClick={handleJoin}
                disabled={loading || !worldCode.trim()}
                className="w-full py-6 bg-black text-white rounded-pill font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:bg-black/80 transition-all disabled:opacity-20"
              >
                {loading ? 'SYNCHRONIZING…' : 'AUTHORIZE ACCESS'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
