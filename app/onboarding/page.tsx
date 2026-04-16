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
    if (!worldName.trim()) { setError('Please enter a world name'); return; }
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
          description: `${worldName.trim()} — a Narinyland world`,
          userId: user?.sub,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create world');
      }

      const circle = await res.json();
      
      // Add the user to the circle in AppKit
      await fetch('/api/circles/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ circleId: circle.id, userId: user?.sub }),
      }).catch(() => {});

      // Set as active and persist to attributes
      await setActiveCircle(circle.id);
      
      await refreshUser();
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = worldCode.trim();
    if (!code) { setError('Please enter a world code'); return; }
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
        throw new Error(data.error || 'Failed to join world. Check the code and try again.');
      }

      // Set as active and persist to attributes
      await setActiveCircle(code);
      
      await refreshUser();
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-emerald-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size={80} title="Narinyland" />
          <h1 className="mt-4 text-2xl font-bold text-pink-700 font-outfit">Welcome to Narinyland</h1>
          <p className="text-pink-500 text-sm mt-1 text-center">
            Create a new world or join an existing one to get started.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Create World */}
              <button
                onClick={() => setMode('create')}
                className="group flex flex-col items-center gap-3 p-6 bg-white rounded-md shadow-md border-2 border-transparent hover:border-pink-300 transition-all duration-200"
              >
                <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🌸
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-sm">Create World</p>
                  <p className="text-gray-400 text-xs mt-1">Start a new story</p>
                </div>
              </button>

              {/* Join World */}
              <button
                onClick={() => setMode('join')}
                className="group flex flex-col items-center gap-3 p-6 bg-white rounded-md shadow-md border-2 border-transparent hover:border-emerald-300 transition-all duration-200"
              >
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🔑
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-sm">Join World</p>
                  <p className="text-gray-400 text-xs mt-1">Enter a world code</p>
                </div>
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-md shadow-md p-6 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setMode('select'); setError(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ←
                </button>
                <h2 className="font-bold text-gray-800">Create Your World</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">World Name</label>
                <input
                  type="text"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. Our Love Story"
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:border-pink-400 text-gray-800 text-sm"
                  autoFocus
                />
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={loading || !worldName.trim()}
                className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-md font-semibold text-sm transition-colors"
              >
                {loading ? 'Creating…' : 'Create World 🌸'}
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-md shadow-md p-6 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setMode('select'); setError(''); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ←
                </button>
                <h2 className="font-bold text-gray-800">Join a World</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">World Code</label>
                <input
                  type="text"
                  value={worldCode}
                  onChange={(e) => setWorldCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="Paste the world code here"
                  className="w-full px-4 py-3 rounded-md border border-gray-200 focus:outline-none focus:border-emerald-400 text-gray-800 text-sm font-mono"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Ask your partner for their world code</p>
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button
                onClick={handleJoin}
                disabled={loading || !worldCode.trim()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-md font-semibold text-sm transition-colors"
              >
                {loading ? 'Joining…' : 'Join World 🔑'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

