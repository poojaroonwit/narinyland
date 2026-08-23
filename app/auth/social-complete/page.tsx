"use client";

import React from 'react';
import Link from 'next/link';

const CONTINUATION_STORAGE_KEY = 'narinyland_auth_continuation';
const CONTINUATION_STATUSES = new Set([
  'mfa_required',
  'email_verification_required',
  'mfa_enrollment_required',
  'password_reset_required',
  'recovery_codes',
  'complete',
]);

type SocialContinuation = {
  status?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

function messageFrom(data: SocialContinuation, fallback: string) {
  return data.message || data.error || fallback;
}

export default function SocialCompletePage() {
  const startedRef = React.useRef(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const complete = async () => {
      try {
        const url = new URL(window.location.href);
        const resumeCode = url.searchParams.get('appkit_sso_code');
        const providerError = url.searchParams.get('error');
        url.searchParams.delete('appkit_sso_code');
        url.searchParams.delete('error');
        url.searchParams.delete('error_description');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

        if (providerError) throw new Error('Social sign-in was not completed. Please try again.');
        if (!resumeCode) throw new Error('Missing social sign-in continuation. Please start again.');

        const response = await fetch('/api/auth/credentials', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'social-continue', resumeCode }),
        });
        const data = await response.json().catch(() => ({})) as SocialContinuation;
        if (!response.ok) throw new Error(messageFrom(data, 'Social sign-in could not be completed.'));

        if (data.status === 'authenticated') {
          window.location.assign('/garden');
          return;
        }

        if (!data.status || !CONTINUATION_STATUSES.has(data.status)) {
          throw new Error(messageFrom(data, 'Social sign-in returned an unsupported continuation.'));
        }

        window.sessionStorage.setItem(CONTINUATION_STORAGE_KEY, JSON.stringify(data));
        window.location.assign('/login?sso=continue');
      } catch (completeError) {
        setError(completeError instanceof Error ? completeError.message : 'Social sign-in could not be completed.');
      }
    };

    void complete();
  }, []);

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#edf6e9] px-5 text-stone-900">
      <section className="w-full max-w-md rounded-[2rem] bg-white/80 p-8 text-center shadow-2xl backdrop-blur-2xl">
        {error ? (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <i className="fas fa-triangle-exclamation" />
            </span>
            <h1 className="mt-5 text-2xl font-black tracking-tight">Couldn’t finish sign in.</h1>
            <p role="alert" className="mt-3 text-sm font-semibold leading-relaxed text-stone-600">{error}</p>
            <Link href="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <i className="fas fa-spinner fa-spin" />
            </span>
            <h1 className="mt-5 text-2xl font-black tracking-tight">Returning to your world…</h1>
            <p className="mt-3 text-sm font-semibold text-stone-600">Completing secure sign-in with AppKit.</p>
          </>
        )}
      </section>
    </main>
  );
}
