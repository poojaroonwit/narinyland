import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { validateAppKitAccessToken } from '@/lib/auth-server';
import {
  runHeadlessAuthAction,
  type HeadlessAuthAction,
  type HeadlessAuthActionResult,
} from '@/lib/appkit-headless-server';
import { debugWarn } from '@/lib/logger';
import { rejectCrossOrigin } from '@/lib/security';
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/session-store';

type JsonMap = Record<string, unknown>;

const AUTH_ACTIONS = new Set<HeadlessAuthAction>([
  'login',
  'register',
  'mfa-request',
  'mfa-verify',
  'mfa-enroll-start',
  'mfa-enroll-verify',
  'email-verify',
  'email-resend',
  'forgot-password',
  'reset-password',
  'social-continue',
]);

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function authenticatedPayload(result: HeadlessAuthActionResult): JsonMap | null {
  const record = result as unknown as JsonMap;
  const resultStatus = stringValue(record.status);
  if (resultStatus === 'authenticated') return record;

  const next = isRecord(record.next) ? record.next : null;
  if (resultStatus === 'recovery_codes' && next && stringValue(next.status) === 'authenticated') return next;
  return null;
}

async function persistSession(result: HeadlessAuthActionResult) {
  const data = authenticatedPayload(result);
  if (!data) return;

  const accessToken = stringValue(data.accessToken);
  const refreshToken = stringValue(data.refreshToken);
  if (!accessToken) throw new Error('AppKit authenticated without an access token');

  const user = await validateAppKitAccessToken(accessToken);
  if (!user) throw new Error('AppKit access token could not be validated');

  const cookieStore = await cookies();
  cookieStore.set('appkit_access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  });
  if (refreshToken) {
    cookieStore.set('appkit_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
  }

  const sessionId = await createSession(user);
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
  cookieStore.set('narinyland_is_auth', 'true', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
  cookieStore.delete('narinyland_sub');
}

function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (!isRecord(value)) return value;

  const safeData: JsonMap = {};
  for (const [key, entry] of Object.entries(value)) safeData[key] = stripSecrets(entry);
  delete safeData.accessToken;
  delete safeData.refreshToken;
  delete safeData.access_token;
  delete safeData.refresh_token;
  delete safeData.token;
  delete safeData.id_token;
  return safeData;
}

function browserResult(action: HeadlessAuthAction, result: HeadlessAuthActionResult): JsonMap {
  const safe = stripSecrets(result) as JsonMap;
  if (typeof safe.status === 'string') return safe;
  if (action === 'mfa-request') return { status: 'mfa_requested', ...safe };
  if (action === 'mfa-enroll-start') return { status: 'mfa_enrollment_started', ...safe };
  if (action === 'email-resend') return { status: 'email_verification_resent', ...safe };
  if (action === 'forgot-password') return { status: 'password_reset_challenge', ...safe };
  return { status: safe.success === true ? 'complete' : 'failed', ...safe };
}

function errorStatus(error: unknown): number {
  if (isRecord(error) && typeof error.status === 'number') return error.status;
  return 503;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Authentication service unavailable';
}

export async function POST(req: Request) {
  const csrfRejection = rejectCrossOrigin(req);
  if (csrfRejection) return csrfRejection;

  try {
    const body = await req.json().catch(() => null) as JsonMap | null;
    const actionValue = stringValue(body?.action) as HeadlessAuthAction;
    if (!AUTH_ACTIONS.has(actionValue)) {
      return NextResponse.json({ error: 'Unsupported authentication action' }, { status: 400 });
    }

    const run = () => runHeadlessAuthAction(actionValue, body || {});
    let result: HeadlessAuthActionResult;
    try {
      result = await run();
    } catch (error) {
      if (![502, 503, 504].includes(errorStatus(error))) throw error;
      debugWarn(`AppKit headless auth returned ${errorStatus(error)}; retrying once.`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      result = await run();
    }

    await persistSession(result);
    return NextResponse.json(browserResult(actionValue, result));
  } catch (error) {
    const status = errorStatus(error);
    console.error('Local AppKit headless auth error:', errorMessage(error));
    return NextResponse.json({ error: errorMessage(error) }, { status });
  }
}
