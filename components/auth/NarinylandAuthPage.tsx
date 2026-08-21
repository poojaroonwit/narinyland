"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { HexWorld3D } from '@/components/hex-world/HexWorld3D';
import { createLandingHexWorldSnapshot } from '@/lib/hex-world/landing-world';
import { login as launchAppKitLogin } from '@/lib/auth';

type AuthMode = 'login' | 'signup';
type AuthStep = 'credentials' | 'mfa' | 'verify-email';
type MfaChannel = 'email' | 'sms' | 'totp';

type AuthResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  requiresMfa?: boolean;
  availableChannels?: MfaChannel[];
  challengeToken?: string;
  requiresEmailVerification?: boolean;
  verificationToken?: string;
};

function responseMessage(data: AuthResponse, fallback: string) {
  return data.message || data.error || fallback;
}

async function authRequest(action: string, payload: Record<string, unknown>) {
  const response = await fetch('/api/auth/credentials', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({})) as AuthResponse;
  return { response, data };
}

export function NarinylandAuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const snapshot = React.useMemo(() => createLandingHexWorldSnapshot(), []);
  const [step, setStep] = React.useState<AuthStep>('credentials');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [challengeToken, setChallengeToken] = React.useState('');
  const [verificationToken, setVerificationToken] = React.useState('');
  const [mfaChannels, setMfaChannels] = React.useState<MfaChannel[]>([]);
  const [mfaChannel, setMfaChannel] = React.useState<MfaChannel>('email');
  const [code, setCode] = React.useState('');

  const isSignup = mode === 'signup';

  const finishAuth = () => {
    window.location.assign('/garden');
  };

  const requestMfaCode = async (token: string, channel: MfaChannel) => {
    setStatus(channel === 'totp' ? 'Enter the code from your authenticator app.' : 'Sending a verification code…');
    const { response, data } = await authRequest('mfa-request', { challengeToken: token, channel });
    if (!response.ok) throw new Error(responseMessage(data, 'Could not start verification.'));
    setStatus(data.message || (channel === 'totp' ? 'Enter your authenticator code.' : 'A verification code was sent.'));
  };

  const startMfa = async (data: AuthResponse) => {
    const channels = Array.isArray(data.availableChannels)
      ? data.availableChannels.filter((channel): channel is MfaChannel => ['email', 'sms', 'totp'].includes(channel))
      : [];
    if (!data.challengeToken || channels.length === 0) throw new Error('Verification is required, but no method is available.');
    const preferred: MfaChannel = channels.includes('totp') ? 'totp' : channels.includes('email') ? 'email' : channels[0];
    setChallengeToken(data.challengeToken);
    setMfaChannels(channels);
    setMfaChannel(preferred);
    setCode('');
    setStep('mfa');
    await requestMfaCode(data.challengeToken, preferred);
  };

  const startEmailVerification = (data: AuthResponse) => {
    if (!data.verificationToken) throw new Error('Email verification could not be started.');
    setVerificationToken(data.verificationToken);
    setCode('');
    setStep('verify-email');
    setStatus(data.message || 'We sent a verification code to your email.');
  };

  const submitCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (isSignup) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Enter your first and last name.');
        return;
      }
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        setError('Use 8+ characters with uppercase, lowercase, a number, and a special character.');
        return;
      }
    }

    setLoading(true);
    try {
      const action = isSignup ? 'register' : 'login';
      const payload = isSignup
        ? { email: normalizedEmail, password, firstName: firstName.trim(), lastName: lastName.trim() }
        : { email: normalizedEmail, password, rememberMe };
      const { response, data } = await authRequest(action, payload);

      if (data.requiresMfa) {
        await startMfa(data);
        return;
      }
      if (data.requiresEmailVerification) {
        startEmailVerification(data);
        return;
      }
      if (!response.ok) throw new Error(responseMessage(data, isSignup ? 'Could not create your account.' : 'Could not sign you in.'));
      finishAuth();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setError('Enter your verification code.');
    setLoading(true);
    setError('');
    try {
      const { response, data } = await authRequest('mfa-verify', {
        challengeToken,
        channel: mfaChannel,
        code: code.trim(),
      });
      if (data.requiresEmailVerification) {
        startEmailVerification(data);
        return;
      }
      if (!response.ok) throw new Error(responseMessage(data, 'Verification failed.'));
      finishAuth();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setError('Enter your verification code.');
    setLoading(true);
    setError('');
    try {
      const { response, data } = await authRequest('email-verify', { verificationToken, code: code.trim() });
      if (!response.ok) throw new Error(responseMessage(data, 'Email verification failed.'));
      finishAuth();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Email verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resendEmailCode = async () => {
    setError('');
    setStatus('Sending a new code…');
    try {
      const { response, data } = await authRequest('otp-request', { email: email.trim() });
      if (!response.ok) throw new Error(responseMessage(data, 'Could not resend the code.'));
      setStatus('A new verification code was sent.');
    } catch (resendError) {
      setStatus('');
      setError(resendError instanceof Error ? resendError.message : 'Could not resend the code.');
    }
  };

  const switchMfaChannel = async (channel: MfaChannel) => {
    if (channel === mfaChannel || loading) return;
    setLoading(true);
    setError('');
    try {
      setMfaChannel(channel);
      setCode('');
      await requestMfaCode(challengeToken, channel);
    } catch (channelError) {
      setError(channelError instanceof Error ? channelError.message : 'Could not switch verification method.');
    } finally {
      setLoading(false);
    }
  };

  const resetChallenge = () => {
    setStep('credentials');
    setChallengeToken('');
    setVerificationToken('');
    setCode('');
    setStatus('');
    setError('');
  };

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#edf6e9] text-stone-900">
      <div className="fixed inset-0">
        <HexWorld3D snapshot={snapshot} graphicsQuality="low" />
      </div>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.18),transparent_38%),linear-gradient(90deg,rgba(237,246,233,0.18)_0%,rgba(237,246,233,0.08)_42%,rgba(237,246,233,0.64)_72%,rgba(237,246,233,0.92)_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#edf6e9]/75 to-transparent" />

      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between p-4 md:p-6">
        <Link href="/" className="flex h-10 items-center gap-2 rounded-full bg-white/45 px-3.5 shadow-md backdrop-blur-xl">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-[11px] text-white">♥</span>
          <span className="text-sm font-black tracking-tight">Narinyland</span>
        </Link>
        <Link href="/" className="rounded-full bg-white/38 px-4 py-2 text-xs font-bold text-stone-700 shadow-sm backdrop-blur-xl transition hover:bg-white/60">
          Back to world
        </Link>
      </header>

      <div className="relative z-20 mx-auto grid min-h-[100svh] w-full max-w-[90rem] items-center gap-10 px-4 pb-8 pt-24 md:px-8 lg:grid-cols-[1fr_minmax(25rem,30rem)] lg:px-12">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="hidden max-w-xl self-end pb-20 lg:block"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/38 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800 shadow-sm backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Your shared world
          </div>
          <h1 className="mt-4 text-5xl font-black leading-[1.01] tracking-[-0.05em] text-stone-950 drop-shadow-[0_1px_18px_rgba(255,255,255,0.9)] xl:text-6xl">
            {isSignup ? 'Begin somewhere small. Grow it together.' : 'Your little world is right where you left it.'}
          </h1>
          <p className="mt-5 max-w-lg text-base font-semibold leading-relaxed text-stone-700 drop-shadow-[0_1px_10px_rgba(255,255,255,0.95)]">
            {isSignup
              ? 'Start with a home, then fill it with the dates, letters, promises, and memories that become yours.'
              : 'Come back to your homestead, your memories, and everything the two of you are growing.'}
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="w-full self-center rounded-[2rem] bg-white/[0.72] p-5 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-2xl sm:p-7 md:p-8"
        >
          {step === 'credentials' && (
            <>
              <div className="mb-7">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Narinyland</p>
                <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-stone-950">
                  {isSignup ? 'Create your little world.' : 'Welcome back to your world.'}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-stone-600">
                  {isSignup ? 'Create your account, then invite the person you want to build it with.' : 'Sign in and keep growing what belongs to both of you.'}
                </p>
              </div>

              <form onSubmit={submitCredentials} className="space-y-4">
                {isSignup && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-stone-700">
                      First name
                      <input
                        value={firstName}
                        onChange={event => setFirstName(event.target.value)}
                        autoComplete="given-name"
                        className="mt-1.5 h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-sm font-semibold outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        placeholder="Narin"
                      />
                    </label>
                    <label className="block text-xs font-bold text-stone-700">
                      Last name
                      <input
                        value={lastName}
                        onChange={event => setLastName(event.target.value)}
                        autoComplete="family-name"
                        className="mt-1.5 h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-sm font-semibold outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        placeholder="Together"
                      />
                    </label>
                  </div>
                )}

                <label className="block text-xs font-bold text-stone-700">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    className="mt-1.5 h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-sm font-semibold outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block text-xs font-bold text-stone-700">
                  Password
                  <span className="relative mt-1.5 block">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      className="h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 pr-14 text-sm font-semibold outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder={isSignup ? 'Create a strong password' : 'Your password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      className="absolute inset-y-0 right-2 my-auto min-h-10 rounded-xl px-3 text-[10px] font-black uppercase tracking-wide text-stone-500 hover:bg-stone-100/70"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>

                {isSignup ? (
                  <p className="rounded-2xl bg-emerald-50/70 px-3.5 py-3 text-[11px] font-semibold leading-relaxed text-emerald-900">
                    8+ characters · uppercase · lowercase · number · special character
                  </p>
                ) : (
                  <label className="flex min-h-10 items-center gap-2 text-xs font-semibold text-stone-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={event => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 accent-emerald-700"
                    />
                    Keep me signed in
                  </label>
                )}

                {error && <p role="alert" aria-live="polite" className="rounded-2xl bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
                {status && <p aria-live="polite" className="rounded-2xl bg-emerald-50/90 px-4 py-3 text-sm font-semibold text-emerald-800">{status}</p>}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white shadow-xl shadow-emerald-950/10 transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-65"
                >
                  {loading ? <i className="fas fa-spinner fa-spin text-xs" /> : <i className={`fas ${isSignup ? 'fa-seedling' : 'fa-arrow-right-to-bracket'} text-xs`} />}
                  {loading ? 'Connecting…' : isSignup ? 'Create my world' : 'Enter Narinyland'}
                </motion.button>
              </form>

              <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                <span className="h-px flex-1 bg-stone-200/80" />
                or
                <span className="h-px flex-1 bg-stone-200/80" />
              </div>

              <button
                type="button"
                onClick={() => void launchAppKitLogin()}
                className="min-h-11 w-full rounded-2xl bg-white/55 px-4 text-xs font-bold text-stone-650 shadow-sm transition hover:bg-white/85"
              >
                Other sign-in methods via AppKit
              </button>

              <p className="mt-6 text-center text-xs font-semibold text-stone-600">
                {isSignup ? 'Already have a world?' : 'New to Narinyland?'}{' '}
                <Link href={isSignup ? '/login' : '/signup'} className="font-black text-emerald-700 hover:text-emerald-800">
                  {isSignup ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
            </>
          )}

          {step === 'mfa' && (
            <form onSubmit={verifyMfa} className="space-y-5">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <i className="fas fa-shield-halved" />
                </span>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Security check</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">Verify it’s you.</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-stone-600">{status || 'Enter your verification code to continue to your world.'}</p>
              </div>

              {mfaChannels.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {mfaChannels.map(channel => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => void switchMfaChannel(channel)}
                      className={`min-h-10 rounded-full px-4 text-xs font-bold transition ${channel === mfaChannel ? 'bg-emerald-700 text-white' : 'bg-white/60 text-stone-600 hover:bg-white/90'}`}
                    >
                      {channel === 'totp' ? 'Authenticator' : channel === 'sms' ? 'SMS' : 'Email'}
                    </button>
                  ))}
                </div>
              )}

              <label className="block text-xs font-bold text-stone-700">
                Verification code
                <input
                  value={code}
                  onChange={event => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  className="mt-1.5 h-14 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-center text-xl font-black tracking-[0.3em] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="000000"
                />
              </label>

              {error && <p role="alert" aria-live="polite" className="rounded-2xl bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

              <button type="submit" disabled={loading} className="min-h-12 w-full rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-65">
                {loading ? 'Verifying…' : 'Continue to Narinyland'}
              </button>
              <button type="button" onClick={resetChallenge} className="min-h-10 w-full text-xs font-bold text-stone-500">Back to sign in</button>
            </form>
          )}

          {step === 'verify-email' && (
            <form onSubmit={verifyEmail} className="space-y-5">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                  <i className="fas fa-envelope-open-text" />
                </span>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-pink-600">Almost there</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">Verify your email.</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-stone-600">{status || `Enter the code sent to ${email}.`}</p>
              </div>

              <label className="block text-xs font-bold text-stone-700">
                Email code
                <input
                  value={code}
                  onChange={event => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  className="mt-1.5 h-14 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-center text-xl font-black tracking-[0.3em] outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-400/10"
                  placeholder="000000"
                />
              </label>

              {error && <p role="alert" aria-live="polite" className="rounded-2xl bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

              <button type="submit" disabled={loading} className="min-h-12 w-full rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-65">
                {loading ? 'Verifying…' : 'Verify and continue'}
              </button>
              <button type="button" onClick={() => void resendEmailCode()} className="min-h-10 w-full text-xs font-black text-emerald-700">Send a new code</button>
              <button type="button" onClick={resetChallenge} className="min-h-10 w-full text-xs font-bold text-stone-500">Start again</button>
            </form>
          )}
        </motion.section>
      </div>
    </main>
  );
}
