import {
  createHeadlessAppKit,
  type HeadlessAuthResult,
  type HeadlessMfaChannel,
  type HeadlessMfaEnrollmentMethod,
} from '@alphayard/appkit/headless-auth';
import { getAppKitApplicationId, getAppKitDomain, getServiceToken } from '@/lib/appkit-server';

type JsonMap = Record<string, unknown>;
type TokenSeed = { accessToken?: string; refreshToken?: string };

export type HeadlessAuthAction =
  | 'login'
  | 'register'
  | 'mfa-request'
  | 'mfa-verify'
  | 'mfa-enroll-start'
  | 'mfa-enroll-verify'
  | 'email-verify'
  | 'email-resend'
  | 'forgot-password'
  | 'reset-password'
  | 'social-continue';

export type HeadlessAuthActionResult =
  | HeadlessAuthResult
  | { success: boolean; message?: string; otpChallengeId?: string | null; passkeyChallengeToken?: string; publicKey?: JsonMap }
  | { success: boolean; verificationToken: string; message?: string }
  | { success: boolean; resetToken: string; message?: string }
  | { success: true; method: 'totp'; setupToken: string; secret: string; otpauthUri: string; message?: string }
  | { success: true; method: 'passkey'; challengeToken: string; publicKey: JsonMap; message?: string };

const APPKIT_AUTH_TIMEOUT_MS = 8_000;

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function mfaChannel(value: unknown): HeadlessMfaChannel {
  if (value === 'sms' || value === 'totp' || value === 'passkey') return value;
  return 'email';
}

function enrollmentMethod(value: unknown): HeadlessMfaEnrollmentMethod {
  return value === 'passkey' ? 'passkey' : 'totp';
}

function createTokenStorage(seed: TokenSeed) {
  const values = new Map<string, string>();
  if (seed.accessToken || seed.refreshToken) values.set('appkit_tokens', JSON.stringify(seed));
  return {
    get(key: string) { return values.get(key) ?? null; },
    set(key: string, value: string) { values.set(key, value); },
    remove(key: string) { values.delete(key); },
  };
}

async function resolveApplicationId(): Promise<string> {
  let applicationId = getAppKitApplicationId();
  if (!applicationId) {
    await getServiceToken();
    applicationId = getAppKitApplicationId();
  }
  if (!applicationId) throw new Error('AppKit application id is not configured');
  return applicationId;
}

function resolveClientId(): string {
  const clientId = stringValue(process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID) || stringValue(process.env.APPKIT_CLIENT_ID);
  if (!clientId) throw new Error('AppKit client id is not configured');
  return clientId;
}

async function createServerHeadlessAppKit(seed: TokenSeed = {}) {
  const applicationId = await resolveApplicationId();
  return createHeadlessAppKit({
    clientId: resolveClientId(),
    appId: applicationId,
    applicationId,
    domain: getAppKitDomain().replace(/\/+$/, ''),
    storage: seed.accessToken || seed.refreshToken ? createTokenStorage(seed) : 'memory',
  });
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('AppKit authentication request timed out')), APPKIT_AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getHeadlessAuthConfig(): Promise<JsonMap> {
  const appkit = await createServerHeadlessAppKit();
  return withTimeout(appkit.auth.getConfig()) as Promise<JsonMap>;
}

export async function getHeadlessSocialLoginUrl(provider: string, redirect: string): Promise<string> {
  const normalizedProvider = stringValue(provider);
  const normalizedRedirect = stringValue(redirect);
  if (!normalizedProvider) throw new Error('Social sign-in provider is required');
  if (!normalizedRedirect) throw new Error('Social sign-in redirect is required');
  const appkit = await createServerHeadlessAppKit();
  return appkit.auth.getSocialLoginUrl(normalizedProvider, { redirect: normalizedRedirect });
}

export async function refreshHeadlessSession(refreshToken: string): Promise<HeadlessAuthResult> {
  const appkit = await createServerHeadlessAppKit({ refreshToken });
  return withTimeout(appkit.auth.refreshToken());
}

export async function logoutHeadlessSession(tokens: TokenSeed): Promise<void> {
  const appkit = await createServerHeadlessAppKit(tokens);
  await withTimeout(appkit.auth.logout());
}

export async function runHeadlessAuthAction(
  action: HeadlessAuthAction,
  payload: JsonMap,
): Promise<HeadlessAuthActionResult> {
  const appkit = await createServerHeadlessAppKit();
  switch (action) {
    case 'login':
      return withTimeout(appkit.auth.loginWithCredentials({
        email: stringValue(payload.email),
        password: stringValue(payload.password),
        rememberMe: booleanValue(payload.rememberMe),
      }));
    case 'register':
      return withTimeout(appkit.auth.signup({
        email: stringValue(payload.email),
        password: stringValue(payload.password),
        firstName: stringValue(payload.firstName),
        lastName: stringValue(payload.lastName),
        phoneNumber: stringValue(payload.phoneNumber) || stringValue(payload.phone) || undefined,
        acceptTerms: payload.acceptTerms === true,
      }));
    case 'mfa-request':
      return withTimeout(appkit.auth.requestMfa({ challengeToken: stringValue(payload.challengeToken), channel: mfaChannel(payload.channel) }));
    case 'mfa-verify':
      return withTimeout(appkit.auth.verifyMfa({
        challengeToken: stringValue(payload.challengeToken),
        channel: mfaChannel(payload.channel),
        code: stringValue(payload.code) || undefined,
        otpChallengeId: stringValue(payload.otpChallengeId) || undefined,
        trustDevice: payload.trustDevice === true,
      }));
    case 'mfa-enroll-start':
      return withTimeout(appkit.auth.startMfaEnrollment({ enrollmentToken: stringValue(payload.enrollmentToken), method: enrollmentMethod(payload.method) }));
    case 'mfa-enroll-verify':
      return withTimeout(appkit.auth.verifyTotpEnrollment({ setupToken: stringValue(payload.setupToken), code: stringValue(payload.code) }));
    case 'email-verify':
      return withTimeout(appkit.auth.verifyEmail({ verificationToken: stringValue(payload.verificationToken), code: stringValue(payload.code) }));
    case 'email-resend':
      return withTimeout(appkit.auth.resendEmailVerification({ verificationToken: stringValue(payload.verificationToken) }));
    case 'forgot-password':
      return withTimeout(appkit.auth.forgotPassword({ email: stringValue(payload.email) }));
    case 'reset-password':
      return withTimeout(appkit.auth.resetPassword({
        resetToken: stringValue(payload.resetToken),
        otp: stringValue(payload.otp) || stringValue(payload.code),
        password: stringValue(payload.password),
      }));
    case 'social-continue': {
      const resumeCode = stringValue(payload.resumeCode);
      if (!resumeCode) throw new Error('Missing social sign-in continuation');
      return withTimeout(appkit.auth.continueSocialLogin({ resumeCode }));
    }
    default: {
      const exhaustive: never = action;
      throw new Error(`Unsupported authentication action: ${exhaustive}`);
    }
  }
}
