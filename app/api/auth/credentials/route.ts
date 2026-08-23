import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAppKitApplicationId, getAppKitDomain, getServiceToken } from '@/lib/appkit-server';
import { rejectCrossOrigin } from '@/lib/security';
import { debugWarn } from '@/lib/logger';
import { validateAppKitAccessToken } from '@/lib/auth-server';
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, type NarinylandSessionUser } from '@/lib/session-store';

type AuthAction =
  | 'login'
  | 'register'
  | 'mfa-request'
  | 'mfa-verify'
  | 'email-verify'
  | 'otp-request';

type UpstreamPayload = Record<string, unknown>;

const ACTION_PATHS: Record<AuthAction, string> = {
  login: '/api/v1/auth/login',
  register: '/api/v1/auth/register',
  'mfa-request': '/api/v1/auth/mfa/request',
  'mfa-verify': '/api/v1/auth/mfa/verify',
  'email-verify': '/api/v1/auth/email-verification/verify',
  'otp-request': '/api/v1/auth/otp/request',
};

const ACTION_FIELDS: Record<AuthAction, readonly string[]> = {
  login: ['email', 'password', 'rememberMe'],
  register: ['email', 'password', 'firstName', 'lastName', 'phone'],
  'mfa-request': ['challengeToken', 'channel'],
  'mfa-verify': ['challengeToken', 'channel', 'code'],
  'email-verify': ['verificationToken', 'code'],
  'otp-request': ['email'],
};

const AUTH_TIMEOUT_MS = 8_000;

function normalizeDomain(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function selectPayload(action: AuthAction, body: Record<string, unknown>): UpstreamPayload {
  const selected: UpstreamPayload = {};
  for (const key of ACTION_FIELDS[action]) {
    if (body[key] !== undefined) selected[key] = body[key];
  }
  return selected;
}

function trustedUserFromResponse(data: Record<string, unknown>): NarinylandSessionUser | null {
  const raw = data.user && typeof data.user === 'object' && !Array.isArray(data.user)
    ? data.user as Record<string, unknown>
    : null;
  if (!raw) return null;
  const sub = stringValue(raw.id) || stringValue(raw.sub);
  if (!sub) return null;
  const firstName = stringValue(raw.firstName) || stringValue(raw.given_name);
  const lastName = stringValue(raw.lastName) || stringValue(raw.family_name);
  return {
    id: sub,
    sub,
    name: stringValue(raw.name) || `${firstName} ${lastName}`.trim(),
    email: stringValue(raw.email),
    avatar: stringValue(raw.avatar) || stringValue(raw.avatarUrl) || stringValue(raw.picture),
    attributes: raw.attributes && typeof raw.attributes === 'object' && !Array.isArray(raw.attributes)
      ? raw.attributes as Record<string, unknown>
      : {},
    authSource: 'appkit',
  };
}

async function resolveApplicationId() {
  let applicationId = getAppKitApplicationId();
  if (!applicationId) {
    await getServiceToken();
    applicationId = getAppKitApplicationId();
  }
  return applicationId;
}

async function fetchUpstream(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timeout);
  }
}

async function persistSession(data: Record<string, unknown>) {
  const accessToken = stringValue(data.accessToken) || stringValue(data.access_token) || stringValue(data.token);
  const refreshToken = stringValue(data.refreshToken) || stringValue(data.refresh_token);
  if (!accessToken) return;

  // Prefer remote validation. The response's user object is trusted only as a
  // fallback because it came directly from the configured AppKit endpoint.
  const user = await validateAppKitAccessToken(accessToken) || trustedUserFromResponse(data);
  if (!user) throw new Error('AppKit login response did not contain a validated identity');

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

export async function POST(req: Request) {
  const csrfRejection = rejectCrossOrigin(req);
  if (csrfRejection) return csrfRejection;

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = stringValue(body.action) as AuthAction;
    const path = ACTION_PATHS[action];
    if (!path) return NextResponse.json({ error: 'Unsupported authentication action' }, { status: 400 });

    const applicationId = await resolveApplicationId();
    if (!applicationId) {
      return NextResponse.json({ error: 'Authentication is not configured for this application' }, { status: 500 });
    }

    const requestUpstream = () => fetchUpstream(`${normalizeDomain(getAppKitDomain())}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-app-id': applicationId,
      },
      body: JSON.stringify(selectPayload(action, body)),
    });

    let response = await requestUpstream();
    if ([502, 503, 504].includes(response.status)) {
      debugWarn(`AppKit credential auth returned ${response.status}; retrying once.`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      response = await requestUpstream();
    }

    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (response.ok) await persistSession(data);

    const safeData = { ...data };
    delete safeData.accessToken;
    delete safeData.refreshToken;
    delete safeData.access_token;
    delete safeData.refresh_token;
    delete safeData.token;
    delete safeData.id_token;

    return NextResponse.json(safeData, { status: response.status });
  } catch (error) {
    console.error('Local AppKit credential proxy error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
  }
}
