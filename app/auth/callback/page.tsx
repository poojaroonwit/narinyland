"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { handleCallback } from '@/lib/auth';

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          throw new Error(searchParams.get('error_description') || errorParam);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter.');
        }

        await handleCallback(code, state);
        router.replace('/');
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
        setProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #fbcfe8 60%, #f9a8d4 100%)',
      }}
    >
      <div
        className="max-w-md w-full rounded-3xl p-8 text-center shadow-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
        }}
      >
        {processing && !error ? (
          <div className="flex flex-col items-center gap-5">
            {/* Animated heart loader */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">💖</div>
            </div>
            <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Signing you in...
            </h2>
            <p className="text-gray-500 text-sm">Just a moment while we connect your account.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="text-5xl">😢</div>
            <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Oops! Something went wrong
            </h2>
            <p className="text-red-500 text-sm bg-red-50 rounded-xl p-3 w-full">
              {error}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-6 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #db2777)',
                fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
