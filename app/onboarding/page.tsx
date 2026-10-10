"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { getAccessToken } from '@/lib/auth';

type Mode = 'select' | 'create' | 'join';

type ApiErrorBody = {
  error?: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

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
          description: `${worldName.trim()} - a Narinyland world`,
          userId: user?.sub,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiErrorBody;
        throw new Error(data.error || 'Failed to create world');
      }

      const circle = await res.json();
      const circleId = circle.circleId || circle.id;
      if (!circleId) throw new Error('AppKit did not return a world ID.');
      
      // Add the user to the circle in AppKit
      await fetch('/api/circles/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ circleId, userId: user?.sub }),
      }).catch(() => {});

      // Set as active and persist to attributes
      await setActiveCircle(circleId, {
        name: worldName.trim(),
        description: `${worldName.trim()} - a Narinyland world`,
        role: 'member',
      });
      
      await refreshUser();
      router.replace('/garden');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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
        const data = (await res.json().catch(() => ({}))) as ApiErrorBody;
        throw new Error(data.error || 'Failed to join world. Check the code and try again.');
      }

      // Set as active and persist to attributes
      await setActiveCircle(code);
      
      await refreshUser();
      router.replace('/garden');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f8f2e8] px-4 py-[calc(2rem+env(safe-area-inset-bottom))] text-[#463d35]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Logo size={80} title="Narinyland" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#463d35]">Welcome to Narinyland</h1>
          <p className="mt-2 max-w-xs text-center text-sm leading-6 text-[#766b5e]">
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
              className="grid grid-cols-2 gap-3"
            >
              {/* Create World */}
              <button
                onClick={() => setMode('create')}
                type="button"
                className="cozy-surface group flex min-h-[11rem] flex-col items-center justify-center gap-3 rounded-[1.4rem] p-4 text-center transition-transform hover:-translate-y-0.5 hover:border-[#86a78b]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5e3dc] text-2xl">
                  🌸
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-sm">Create World</p>
                  <p className="mt-1 text-xs text-[#766b5e]">Start a new story</p>
                </div>
              </button>

              {/* Join World */}
              <button
                onClick={() => setMode('join')}
                type="button"
                className="cozy-surface group flex min-h-[11rem] flex-col items-center justify-center gap-3 rounded-[1.4rem] p-4 text-center transition-transform hover:-translate-y-0.5 hover:border-[#86a78b]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f0e3] text-2xl">
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
              className="cozy-surface flex flex-col gap-4 rounded-[1.6rem] p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Back to world options"
                  onClick={() => { setMode('select'); setError(''); }}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[#766b5e] transition-colors hover:bg-[#eee6d9]"
                >
                  ←
                </button>
                <h2 className="text-lg font-semibold text-[#463d35]">Create Your World</h2>
              </div>

              <div>
                <label htmlFor="new-world-name" className="mb-1 block text-sm font-medium text-[#5f5345]">World name</label>
                <input
                  id="new-world-name"
                  type="text"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleCreate(); } }}
                  placeholder="e.g. Our Love Story"
                  maxLength={50}
                  className="cozy-field min-h-12 w-full rounded-xl px-4 py-3 text-sm"
                  autoFocus
                />
              </div>

              {error && <p role="alert" className="text-xs font-medium text-[#9b4e44]">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={loading || !worldName.trim()}
                className="cozy-button-primary min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
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
              className="cozy-surface flex flex-col gap-4 rounded-[1.6rem] p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Back to world options"
                  onClick={() => { setMode('select'); setError(''); }}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[#766b5e] transition-colors hover:bg-[#eee6d9]"
                >
                  ←
                </button>
                <h2 className="text-lg font-semibold text-[#463d35]">Join a World</h2>
              </div>

              <div>
                <label htmlFor="join-world-code" className="mb-1 block text-sm font-medium text-[#5f5345]">World code</label>
                <input
                  id="join-world-code"
                  type="text"
                  value={worldCode}
                  onChange={(e) => setWorldCode(e.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleJoin(); } }}
                  placeholder="Paste the world code here"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="cozy-field min-h-12 w-full rounded-xl px-4 py-3 font-mono text-sm"
                  autoFocus
                />
                <p className="mt-2 text-xs text-[#766b5e]">Ask your partner for their world code</p>
              </div>

              {error && <p role="alert" className="text-xs font-medium text-[#9b4e44]">{error}</p>}

              <button
                onClick={handleJoin}
                disabled={loading || !worldCode.trim()}
                className="cozy-button-primary min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
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

