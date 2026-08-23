'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  appkit_sso_denied: 'AppKit sign-in was cancelled.',
  appkit_sso_invalid_state: 'That AppKit sign-in session expired. Please try again.',
  appkit_sso_not_configured: 'AppKit SSO is not configured for this application.',
  appkit_sso_exchange_failed: 'AppKit could not complete sign-in. Please try again.',
  appkit_sso_identity_invalid: 'AppKit returned an identity that could not be verified.',
  appkit_sso_unavailable: 'AppKit SSO is temporarily unavailable.',
};

export function AppKitSsoEntry() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('auth_error') || '';
  const message = ERROR_MESSAGES[errorCode] || '';

  return (
    <div className="fixed inset-x-4 top-4 z-[90] sm:left-auto sm:right-6 sm:w-[340px]">
      <div className="rounded-2xl border border-white/80 bg-white/85 p-3 shadow-lg shadow-stone-900/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-sm font-black text-white">A</div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">Single sign-on</p>
            <p className="truncate text-sm font-bold text-stone-700">Already signed in with AppKit?</p>
          </div>
          <a
            href="/api/auth/sso/appkit/start"
            className="shrink-0 rounded-xl bg-stone-900 px-3.5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/20"
          >
            Continue with AppKit
          </a>
        </div>
        {message && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{message}</p>}
      </div>
    </div>
  );
}
