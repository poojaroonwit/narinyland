"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HexWorld3D } from '@/components/hex-world/HexWorld3D';
import { createLandingHexWorldSnapshot } from '@/lib/hex-world/landing-world';

const CONTINUATION_STORAGE_KEY = 'narinyland_auth_continuation';
const OAUTH_PROVIDERS = new Set([
  'google', 'google-oauth', 'github', 'github-oauth', 'facebook', 'facebook-oauth',
  'x', 'x-oauth', 'twitter', 'twitter-oauth', 'microsoft', 'microsoft-oauth', 'line', 'line-oauth',
]);

type AuthMode = 'login' | 'signup';
type AuthStep =
  | 'credentials'
  | 'mfa'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'
  | 'mfa-enrollment'
  | 'recovery-codes';
type MfaChannel = 'email' | 'sms' | 'totp';

type AuthStatus =
  | 'authenticated'
  | 'mfa_required'
  | 'mfa_requested'
  | 'email_verification_required'
  | 'email_verification_resent'
  | 'mfa_enrollment_required'
  | 'mfa_enrollment_started'
  | 'password_reset_required'
  | 'password_reset_challenge'
  | 'recovery_codes'
  | 'complete'
  | 'failed';

type AuthResponse = {
  status?: AuthStatus;
  success?: boolean;
  error?: string;
  message?: string;
  availableChannels?: MfaChannel[];
  challengeToken?: string;
  otpChallengeId?: string | null;
  verificationToken?: string;
  enrollmentToken?: string;
  enrollmentMethods?: Array<'totp' | 'passkey'>;
  method?: 'totp' | 'passkey';
  setupToken?: string;
  secret?: string;
  otpauthUri?: string;
  resetToken?: string;
  backupCodes?: string[];
  next?: AuthResponse;
};

type AuthPolicy = {
  registration: { signupEnabled: boolean; inviteOnly: boolean; allowedEmailDomains: string[] };
  emailVerificationRequired: boolean;
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
  };
  mfa: { required: boolean; totp: boolean; email: boolean; sms: boolean; fido2: boolean; rememberDeviceDays: number };
  legal: { requireAcceptance: boolean; termsUrl: string; privacyUrl: string };
};

type SocialProvider = {
  providerName: string;
  displayName?: string;
  label?: string;
  buttonText?: string;
  isEnabled?: boolean;
  logoUrl?: string;
  iconUrl?: string | null;
};

type AuthConfig = {
  authPolicy?: Partial<AuthPolicy> & {
    registration?: Partial<AuthPolicy['registration']>;
    password?: Partial<AuthPolicy['password']>;
    mfa?: Partial<AuthPolicy['mfa']>;
    legal?: Partial<AuthPolicy['legal']>;
  };
  providers?: SocialProvider[];
};

const DEFAULT_POLICY: AuthPolicy = {
  registration: { signupEnabled: true, inviteOnly: false, allowedEmailDomains: [] },
  emailVerificationRequired: false,
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  },
  mfa: { required: false, totp: true, email: true, sms: false, fido2: false, rememberDeviceDays: 0 },
  legal: { requireAcceptance: false, termsUrl: '', privacyUrl: '' },
};

function mergePolicy(config: AuthConfig | null): AuthPolicy {
  const policy = config?.authPolicy;
  return {
    registration: { ...DEFAULT_POLICY.registration, ...(policy?.registration || {}) },
    emailVerificationRequired: policy?.emailVerificationRequired ?? DEFAULT_POLICY.emailVerificationRequired,
    password: { ...DEFAULT_POLICY.password, ...(policy?.password || {}) },
    mfa: { ...DEFAULT_POLICY.mfa, ...(policy?.mfa || {}) },
    legal: { ...DEFAULT_POLICY.legal, ...(policy?.legal || {}) },
  };
}

function normalizeProviderName(value: string) {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

function providerLabel(provider: SocialProvider) {
  if (provider.buttonText?.trim()) return provider.buttonText.trim();
  if (provider.displayName?.trim()) return `Continue with ${provider.displayName.trim()}`;
  if (provider.label?.trim()) return `Continue with ${provider.label.trim()}`;
  const key = normalizeProviderName(provider.providerName).replace(/-oauth$/, '');
  return `Continue with ${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function providerIcon(providerName: string) {
  const key = normalizeProviderName(providerName);
  if (key.startsWith('google')) return 'G';
  if (key.startsWith('github')) return 'GH';
  if (key.startsWith('microsoft')) return '⊞';
  if (key.startsWith('facebook')) return 'f';
  if (key === 'twitter' || key.startsWith('x-')) return 'X';
  if (key.startsWith('line')) return 'L';
  return '↗';
}

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
  const snapshot = React.useMemo(() => createLandingHexWorldSnapshot(), []);
  const ssoResumeStarted = React.useRef(false);
  const [step, setStep] = React.useState<AuthStep>('credentials');
  const [config, setConfig] = React.useState<AuthConfig | null>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [challengeToken, setChallengeToken] = React.useState('');
  const [otpChallengeId, setOtpChallengeId] = React.useState('');
  const [verificationToken, setVerificationToken] = React.useState('');
  const [mfaChannels, setMfaChannels] = React.useState<MfaChannel[]>([]);
  const [mfaChannel, setMfaChannel] = React.useState<MfaChannel>('email');
  const [enrollmentToken, setEnrollmentToken] = React.useState('');
  const [setupToken, setSetupToken] = React.useState('');
  const [totpSecret, setTotpSecret] = React.useState('');
  const [otpauthUri, setOtpauthUri] = React.useState('');
  const [resetToken, setResetToken] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [code, setCode] = React.useState('');

  const isSignup = mode === 'signup';
  const policy = React.useMemo(() => mergePolicy(config), [config]);
  const socialProviders = React.useMemo(() => (
    (config?.providers || []).filter((provider) => {
      const name = normalizeProviderName(provider.providerName || '');
      return provider.isEnabled !== false && OAUTH_PROVIDERS.has(name);
    })
  ), [config]);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/config', { cache: 'no-store', credentials: 'include', signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        setConfig(await response.json() as AuthConfig);
      })
      .catch(errorValue => {
        if ((errorValue as Error)?.name !== 'AbortError') console.warn('Could not load AppKit auth policy.');
      });
    return () => controller.abort();
  }, []);

  const finishAuth = () => window.location.assign('/garden');

  const passwordHint = React.useMemo(() => {
    const requirements = [`${policy.password.minLength}+ characters`];
    if (policy.password.requireUppercase) requirements.push('uppercase');
    if (policy.password.requireLowercase) requirements.push('lowercase');
    if (policy.password.requireNumber) requirements.push('number');
    if (policy.password.requireSpecial) requirements.push('special character');
    return requirements.join(' · ');
  }, [policy.password]);

  const passwordMeetsPolicy = (value: string) => {
    if (value.length < policy.password.minLength) return false;
    if (policy.password.requireUppercase && !/[A-Z]/.test(value)) return false;
    if (policy.password.requireLowercase && !/[a-z]/.test(value)) return false;
    if (policy.password.requireNumber && !/\d/.test(value)) return false;
    if (policy.password.requireSpecial && !/[^A-Za-z0-9]/.test(value)) return false;
    return true;
  };

  const requestMfaCode = async (token: string, channel: MfaChannel) => {
    setStatus(channel === 'totp' ? 'Enter the code from your authenticator app.' : 'Sending a verification code…');
    const { response, data } = await authRequest('mfa-request', { challengeToken: token, channel });
    if (!response.ok || data.status !== 'mfa_requested') throw new Error(responseMessage(data, 'Could not start verification.'));
    setOtpChallengeId(data.otpChallengeId || '');
    setStatus(data.message || (channel === 'totp' ? 'Enter your authenticator code.' : 'A verification code was sent.'));
  };

  const startMfa = async (data: AuthResponse) => {
    const channels = Array.isArray(data.availableChannels)
      ? data.availableChannels.filter((channel): channel is MfaChannel => ['email', 'sms', 'totp'].includes(channel))
      : [];
    if (!data.challengeToken || channels.length === 0) throw new Error('Verification is required, but no supported method is available.');
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

  const startMfaEnrollment = async (data: AuthResponse) => {
    if (!data.enrollmentToken) throw new Error('Security setup could not be started.');
    const methods = data.enrollmentMethods || [];
    if (!methods.includes('totp')) throw new Error('This account requires passkey setup. Enable TOTP for this application or complete passkey setup in AppKit.');
    setEnrollmentToken(data.enrollmentToken);
    const { response, data: started } = await authRequest('mfa-enroll-start', {
      enrollmentToken: data.enrollmentToken,
      method: 'totp',
    });
    if (!response.ok || started.status !== 'mfa_enrollment_started' || started.method !== 'totp' || !started.setupToken) {
      throw new Error(responseMessage(started, 'Could not start authenticator setup.'));
    }
    setSetupToken(started.setupToken);
    setTotpSecret(started.secret || '');
    setOtpauthUri(started.otpauthUri || '');
    setCode('');
    setStep('mfa-enrollment');
    setStatus(started.message || 'Add this account to your authenticator, then enter a code.');
  };

  const handleContinuation = async (data: AuthResponse) => {
    switch (data.status) {
      case 'authenticated':
        finishAuth();
        return;
      case 'mfa_required':
        await startMfa(data);
        return;
      case 'email_verification_required':
        startEmailVerification(data);
        return;
      case 'mfa_enrollment_required':
        await startMfaEnrollment(data);
        return;
      case 'password_reset_required':
        setStep('forgot-password');
        setStatus(data.message || 'Your password must be reset before you can continue.');
        return;
      case 'recovery_codes':
        setBackupCodes(data.backupCodes || []);
        setStep('recovery-codes');
        setStatus('Save these recovery codes somewhere safe. They are shown once.');
        return;
      case 'complete':
        setStep('credentials');
        setStatus(data.message || 'Done. Sign in to continue.');
        return;
      default:
        throw new Error(responseMessage(data, 'Authentication could not continue.'));
    }
  };

  React.useEffect(() => {
    if (ssoResumeStarted.current || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('sso') !== 'continue') return;
    ssoResumeStarted.current = true;
    url.searchParams.delete('sso');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    const raw = window.sessionStorage.getItem(CONTINUATION_STORAGE_KEY);
    window.sessionStorage.removeItem(CONTINUATION_STORAGE_KEY);
    if (!raw) {
      setError('The social sign-in continuation expired. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const data = JSON.parse(raw) as AuthResponse;
      void handleContinuation(data).catch(resumeError => {
        setError(resumeError instanceof Error ? resumeError.message : 'Social sign-in could not continue.');
      }).finally(() => setLoading(false));
    } catch {
      setLoading(false);
      setError('The social sign-in continuation could not be read. Please try again.');
    }
    // This runs once for the callback handoff; continuation handlers intentionally use current state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('');
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) return setError('Enter your email and password.');
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return setError('Enter a valid email address.');
    if (isSignup && !policy.registration.signupEnabled) return setError('New account registration is disabled for this application.');
    if (isSignup && (!firstName.trim() || !lastName.trim())) return setError('Enter your first and last name.');
    if (isSignup && !passwordMeetsPolicy(password)) return setError(`Use ${passwordHint}.`);
    if (isSignup && policy.legal.requireAcceptance && !acceptTerms) return setError('Accept the terms and privacy policy to continue.');

    setLoading(true);
    try {
      const action = isSignup ? 'register' : 'login';
      const payload = isSignup
        ? {
            email: normalizedEmail,
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            acceptTerms: policy.legal.requireAcceptance ? acceptTerms : false,
          }
        : { email: normalizedEmail, password, rememberMe };
      const { response, data } = await authRequest(action, payload);
      if (!response.ok) throw new Error(responseMessage(data, isSignup ? 'Could not create your account.' : 'Could not sign you in.'));
      await handleContinuation(data);
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
        otpChallengeId: otpChallengeId || undefined,
        trustDevice: rememberMe,
      });
      if (!response.ok) throw new Error(responseMessage(data, 'Verification failed.'));
      await handleContinuation(data);
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
      await handleContinuation(data);
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
      const { response, data } = await authRequest('email-resend', { verificationToken });
      if (!response.ok || data.status !== 'email_verification_resent' || !data.verificationToken) {
        throw new Error(responseMessage(data, 'Could not resend the code.'));
      }
      setVerificationToken(data.verificationToken);
      setStatus(data.message || 'A new verification code was sent.');
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
      setOtpChallengeId('');
      await requestMfaCode(challengeToken, channel);
    } catch (channelError) {
      setError(channelError instanceof Error ? channelError.message : 'Could not switch verification method.');
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return setError('Enter a valid email address.');
    setLoading(true);
    setError('');
    try {
      const { response, data } = await authRequest('forgot-password', { email: normalizedEmail });
      if (!response.ok || data.status !== 'password_reset_challenge' || !data.resetToken) {
        throw new Error(responseMessage(data, 'Could not start password recovery.'));
      }
      setResetToken(data.resetToken);
      setCode('');
      setNewPassword('');
      setStep('reset-password');
      setStatus(data.message || 'Enter the reset code sent to your email and choose a new password.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not start password recovery.');
    } finally {
      setLoading(false);
    }
  };

  const submitPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setError('Enter the reset code.');
    if (!passwordMeetsPolicy(newPassword)) return setError(`Use ${passwordHint}.`);
    setLoading(true);
    setError('');
    try {
      const { response, data } = await authRequest('reset-password', {
        resetToken,
        otp: code.trim(),
        password: newPassword,
      });
      if (!response.ok) throw new Error(responseMessage(data, 'Could not reset your password.'));
      setPassword('');
      await handleContinuation(data);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not reset your password.');
    } finally {
      setLoading(false);
    }
  };

  const verifyTotpEnrollment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setError('Enter the authenticator code.');
    setLoading(true);
    setError('');
    try {
      const { response, data } = await authRequest('mfa-enroll-verify', { setupToken, code: code.trim() });
      if (!response.ok) throw new Error(responseMessage(data, 'Could not complete authenticator setup.'));
      await handleContinuation(data);
    } catch (enrollmentError) {
      setError(enrollmentError instanceof Error ? enrollmentError.message : 'Could not complete authenticator setup.');
    } finally {
      setLoading(false);
    }
  };

  const startSocialLogin = (provider: SocialProvider) => {
    setError('');
    setStatus('');
    window.location.assign(`/api/auth/sso/start?provider=${encodeURIComponent(provider.providerName)}`);
  };

  const resetChallenge = () => {
    setStep('credentials');
    setChallengeToken('');
    setOtpChallengeId('');
    setVerificationToken('');
    setEnrollmentToken('');
    setSetupToken('');
    setTotpSecret('');
    setOtpauthUri('');
    setResetToken('');
    setNewPassword('');
    setBackupCodes([]);
    setCode('');
    setStatus('');
    setError('');
  };

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#edf6e9] text-stone-900">
      <div className="fixed inset-0"><HexWorld3D snapshot={snapshot} graphicsQuality="low" /></div>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.18),transparent_38%),linear-gradient(90deg,rgba(237,246,233,0.18)_0%,rgba(237,246,233,0.08)_42%,rgba(237,246,233,0.64)_72%,rgba(237,246,233,0.92)_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#edf6e9]/75 to-transparent" />

      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between p-4 md:p-6">
        <Link href="/" className="flex h-10 items-center gap-2 rounded-full bg-white/45 px-3.5 shadow-md backdrop-blur-xl">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-[11px] text-white">♥</span>
          <span className="text-sm font-black tracking-tight">Narinyland</span>
        </Link>
        <Link href="/" className="rounded-full bg-white/38 px-4 py-2 text-xs font-bold text-stone-700 shadow-sm backdrop-blur-xl transition hover:bg-white/60">Back to world</Link>
      </header>

      <div className="relative z-20 mx-auto grid min-h-[100svh] w-full max-w-[90rem] items-center gap-10 px-4 pb-8 pt-24 md:px-8 lg:grid-cols-[1fr_minmax(25rem,30rem)] lg:px-12">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="hidden max-w-xl self-end pb-20 lg:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/38 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800 shadow-sm backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />Your shared world
          </div>
          <h1 className="mt-4 text-5xl font-black leading-[1.01] tracking-[-0.05em] text-stone-950 drop-shadow-[0_1px_18px_rgba(255,255,255,0.9)] xl:text-6xl">
            {isSignup ? 'Begin somewhere small. Grow it together.' : 'Your little world is right where you left it.'}
          </h1>
          <p className="mt-5 max-w-lg text-base font-semibold leading-relaxed text-stone-700 drop-shadow-[0_1px_10px_rgba(255,255,255,0.95)]">
            {isSignup ? 'Start with a home, then fill it with the dates, letters, promises, and memories that become yours.' : 'Come back to your homestead, your memories, and everything the two of you are growing.'}
          </p>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }} className="w-full self-center rounded-[2rem] bg-white/[0.72] p-5 shadow-2xl shadow-emerald-950/[0.08] backdrop-blur-2xl sm:p-7 md:p-8">
          {step === 'credentials' && (
            <>
              <div className="mb-7">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Narinyland</p>
                <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-stone-950">{isSignup ? 'Create your little world.' : 'Welcome back to your world.'}</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-stone-600">{isSignup ? 'Create your account, then invite the person you want to build it with.' : 'Sign in and keep growing what belongs to both of you.'}</p>
              </div>

              {socialProviders.length > 0 && (
                <div className="mb-5 grid gap-2">
                  {socialProviders.map(provider => (
                    <button
                      key={provider.providerName}
                      type="button"
                      onClick={() => startSocialLogin(provider)}
                      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 text-sm font-black text-stone-700 shadow-sm transition hover:bg-white"
                    >
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-stone-100 px-1.5 text-[10px] font-black text-stone-700">{providerIcon(provider.providerName)}</span>
                      {providerLabel(provider)}
                    </button>
                  ))}
                  <div className="my-1 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400"><span className="h-px flex-1 bg-stone-200/80" />or use email<span className="h-px flex-1 bg-stone-200/80" /></div>
                </div>
              )}

              <form onSubmit={submitCredentials} className="space-y-4">
                {isSignup && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-stone-700">First name<input value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" className="mt-1.5 h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" placeholder="Narin" /></label>
                    <label className="block text-xs font-bold text-stone-700">Last name<input value={lastName} onChange={event => setLastName(event.target.value)} autoComplete="family-name" className="mt-1.5 h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" placeholder="Together" /></label>
                  </div>
                )}

                <label className="block text-xs font-bold text-stone-700">Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" inputMode="email" className="mt-1.5 h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" placeholder="you@example.com" /></label>

                <label className="block text-xs font-bold text-stone-700">Password<span className="relative mt-1.5 block"><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} className="h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 pr-14 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" placeholder={isSignup ? 'Create a strong password' : 'Your password'} /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-2 my-auto min-h-10 rounded-xl px-3 text-[10px] font-black uppercase tracking-wide text-stone-500 hover:bg-stone-100/70" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span></label>

                {isSignup ? <p className="rounded-2xl bg-emerald-50/70 px-3.5 py-3 text-[11px] font-semibold leading-relaxed text-emerald-900">{passwordHint}</p> : (
                  <label className="flex min-h-10 items-center gap-2 text-xs font-semibold text-stone-600"><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-stone-300 accent-emerald-700" />Keep me signed in</label>
                )}

                {isSignup && policy.legal.requireAcceptance && (
                  <label className="flex items-start gap-2 rounded-2xl bg-white/55 p-3 text-xs font-semibold text-stone-600">
                    <input type="checkbox" checked={acceptTerms} onChange={event => setAcceptTerms(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
                    <span>I agree to the {policy.legal.termsUrl ? <a href={policy.legal.termsUrl} target="_blank" rel="noreferrer" className="font-black text-emerald-700">Terms</a> : 'Terms'} and {policy.legal.privacyUrl ? <a href={policy.legal.privacyUrl} target="_blank" rel="noreferrer" className="font-black text-emerald-700">Privacy Policy</a> : 'Privacy Policy'}.</span>
                  </label>
                )}

                {isSignup && policy.registration.inviteOnly && <p className="rounded-2xl bg-amber-50/90 px-4 py-3 text-xs font-semibold text-amber-800">This world currently requires an AppKit invitation.</p>}
                {error && <p role="alert" aria-live="polite" className="rounded-2xl bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
                {status && <p aria-live="polite" className="rounded-2xl bg-emerald-50/90 px-4 py-3 text-sm font-semibold text-emerald-800">{status}</p>}

                <motion.button type="submit" disabled={loading || (isSignup && !policy.registration.signupEnabled)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white shadow-xl shadow-emerald-950/10 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? <i className="fas fa-spinner fa-spin text-xs" /> : <i className={`fas ${isSignup ? 'fa-seedling' : 'fa-arrow-right-to-bracket'} text-xs`} />}{loading ? 'Connecting…' : isSignup ? 'Create my world' : 'Enter Narinyland'}
                </motion.button>
              </form>

              {!isSignup && <button type="button" onClick={() => { setStep('forgot-password'); setError(''); setStatus(''); }} className="mt-4 min-h-10 w-full text-xs font-black text-emerald-700">Forgot your password?</button>}

              <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400"><span className="h-px flex-1 bg-stone-200/80" />secured by AppKit SDK<span className="h-px flex-1 bg-stone-200/80" /></div>

              <p className="text-center text-xs font-semibold text-stone-600">{isSignup ? 'Already have a world?' : 'New to Narinyland?'}{' '}<Link href={isSignup ? '/login' : '/signup'} className="font-black text-emerald-700 hover:text-emerald-800">{isSignup ? 'Sign in' : 'Create an account'}</Link></p>
            </>
          )}

          {step === 'mfa' && (
            <form onSubmit={verifyMfa} className="space-y-5">
              <div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><i className="fas fa-shield-halved" /></span><p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Security check</p><h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">Verify it’s you.</h2><p className="mt-2 text-sm font-medium leading-relaxed text-stone-600">{status || 'Enter your verification code to continue to your world.'}</p></div>
              {mfaChannels.length > 1 && <div className="flex flex-wrap gap-2">{mfaChannels.map(channel => <button key={channel} type="button" onClick={() => void switchMfaChannel(channel)} className={`min-h-10 rounded-full px-4 text-xs font-bold transition ${channel === mfaChannel ? 'bg-emerald-700 text-white' : 'bg-white/60 text-stone-600 hover:bg-white/90'}`}>{channel === 'totp' ? 'Authenticator' : channel === 'sms' ? 'SMS' : 'Email'}</button>)}</div>}
              <CodeInput label="Verification code" value={code} onChange={setCode} />
              {error && <ErrorBox text={error} />}
              <PrimaryButton loading={loading} label="Continue to Narinyland" loadingLabel="Verifying…" />
              <BackButton onClick={resetChallenge} label="Back to sign in" />
            </form>
          )}

          {step === 'verify-email' && (
            <form onSubmit={verifyEmail} className="space-y-5">
              <StepHeading icon="fa-envelope-open-text" eyebrow="Almost there" title="Verify your email." text={status || `Enter the code sent to ${email}.`} tone="pink" />
              <CodeInput label="Email code" value={code} onChange={setCode} />
              {error && <ErrorBox text={error} />}
              <PrimaryButton loading={loading} label="Verify and continue" loadingLabel="Verifying…" />
              <button type="button" onClick={() => void resendEmailCode()} className="min-h-10 w-full text-xs font-black text-emerald-700">Send a new code</button>
              <BackButton onClick={resetChallenge} label="Start again" />
            </form>
          )}

          {step === 'forgot-password' && (
            <form onSubmit={requestPasswordReset} className="space-y-5">
              <StepHeading icon="fa-key" eyebrow="Account recovery" title="Reset your password." text={status || 'We’ll ask AppKit to send a one-time reset code.'} />
              <label className="block text-xs font-bold text-stone-700">Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="mt-1.5 h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" placeholder="you@example.com" /></label>
              {error && <ErrorBox text={error} />}
              <PrimaryButton loading={loading} label="Send reset code" loadingLabel="Sending…" />
              <BackButton onClick={resetChallenge} label="Back to sign in" />
            </form>
          )}

          {step === 'reset-password' && (
            <form onSubmit={submitPasswordReset} className="space-y-5">
              <StepHeading icon="fa-lock" eyebrow="Choose a new password" title="Make it yours again." text={status || 'Enter the code from your email and a new password.'} />
              <CodeInput label="Reset code" value={code} onChange={setCode} />
              <label className="block text-xs font-bold text-stone-700">New password<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" className="mt-1.5 h-12 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></label>
              <p className="rounded-2xl bg-emerald-50/70 px-3.5 py-3 text-[11px] font-semibold text-emerald-900">{passwordHint}</p>
              {error && <ErrorBox text={error} />}
              <PrimaryButton loading={loading} label="Reset password" loadingLabel="Resetting…" />
              <BackButton onClick={resetChallenge} label="Start again" />
            </form>
          )}

          {step === 'mfa-enrollment' && (
            <form onSubmit={verifyTotpEnrollment} className="space-y-5">
              <StepHeading icon="fa-shield-halved" eyebrow="Security setup" title="Add an authenticator." text={status || 'Add the account to your authenticator and enter a code.'} />
              {totpSecret && <div className="rounded-2xl bg-white/65 p-4"><p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Setup key</p><code className="mt-2 block break-all text-sm font-bold text-stone-800">{totpSecret}</code>{otpauthUri && <p className="mt-2 break-all text-[10px] text-stone-500">{otpauthUri}</p>}</div>}
              <CodeInput label="Authenticator code" value={code} onChange={setCode} />
              {error && <ErrorBox text={error} />}
              <PrimaryButton loading={loading} label="Finish security setup" loadingLabel="Checking…" />
            </form>
          )}

          {step === 'recovery-codes' && (
            <div className="space-y-5">
              <StepHeading icon="fa-shield-heart" eyebrow="Save once" title="Your recovery codes." text={status} />
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/65 p-4">{backupCodes.map(value => <code key={value} className="rounded-lg bg-stone-50 px-2 py-2 text-center text-xs font-bold text-stone-700">{value}</code>)}</div>
              <button type="button" onClick={finishAuth} className="min-h-12 w-full rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white">I saved them — continue</button>
            </div>
          )}
        </motion.section>
      </div>
    </main>
  );
}

function StepHeading({ icon, eyebrow, title, text, tone = 'emerald' }: { icon: string; eyebrow: string; title: string; text: string; tone?: 'emerald' | 'pink' }) {
  const color = tone === 'pink' ? 'bg-pink-100 text-pink-600' : 'bg-emerald-100 text-emerald-700';
  return <div><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}><i className={`fas ${icon}`} /></span><p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p><h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">{title}</h2><p className="mt-2 text-sm font-medium leading-relaxed text-stone-600">{text}</p></div>;
}

function CodeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-bold text-stone-700">{label}<input value={value} onChange={event => onChange(event.target.value)} autoComplete="one-time-code" inputMode="numeric" className="mt-1.5 h-14 w-full rounded-2xl border border-white/70 bg-white/72 px-4 text-center text-xl font-black tracking-[0.3em] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" placeholder="000000" /></label>;
}

function ErrorBox({ text }: { text: string }) {
  return <p role="alert" aria-live="polite" className="rounded-2xl bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700">{text}</p>;
}

function PrimaryButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return <button type="submit" disabled={loading} className="min-h-12 w-full rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-65">{loading ? loadingLabel : label}</button>;
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="min-h-10 w-full text-xs font-bold text-stone-500">{label}</button>;
}
