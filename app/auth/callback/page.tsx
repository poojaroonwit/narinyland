"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { handleCallback } from '@/lib/auth';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
}

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const retryingRef = useRef(false);
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

        console.log('[AuthCallback] Starting token exchange...');
        await handleCallback();
        console.log('[AuthCallback] Token exchange completed.');

        // Verify that the exchange actually produced a valid session (cookie-based)
        const { isAuthenticated } = await import('@/lib/auth');
        const authenticated = isAuthenticated();

        console.log('[AuthCallback] Session status:', { authenticated });

        if (!authenticated) {
          throw new Error('Token exchange completed but no session was established. Check server logs.');
        }

        // Navigate to home; AuthProvider will re-check auth on the route
        // change and decide whether to stay on / or redirect to /onboarding
        // based on the user's circle membership.
        router.replace('/');
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        const message = getErrorMessage(err);

        // Auto-retry once for transient server errors
        if (message.includes('temporarily unavailable') && !retryingRef.current) {
          retryingRef.current = true;
          setTimeout(() => router.replace('/'), 3000);
          setError('Authentication server is starting up, redirecting you back to the home page...');
          setProcessing(false);
          return;
        }

        setError(message);
        setProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#EAE6E1]">
      <div className="archive-panel max-w-md w-full p-8 text-center bg-white border border-black/10">
        {processing && !error ? (
          <div className="flex flex-col items-center gap-6">
            <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-none animate-spin" />
            <div className="space-y-2">
              <h2 className="text-xl font-geist font-bold tracking-tight text-black uppercase">
                Authenticating
              </h2>
              <p className="text-black/50 text-xs font-mono uppercase tracking-widest">
                Establishing secure session...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-geist font-bold text-xl">
              !
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-geist font-bold tracking-tight text-black uppercase">
                Connection Failed
              </h2>
              <p className="text-black/60 text-xs bg-black/5 p-3 font-mono">
                {error}
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-6 bg-black text-white font-geist font-bold text-sm tracking-widest uppercase hover:bg-zinc-800 transition-colors"
            >
              Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
