import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import redis from '@/lib/redis';
import { getAppKitApplicationId, getAppKitDomain, getServiceToken } from '@/lib/appkit-server';
import { rejectCrossOrigin } from '@/lib/security';
import { debugWarn } from '@/lib/logger';

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

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function normalizeDomain(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
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

function userFromResponse(data: Record<string, unknown>, accessToken: string) {
  const rawUser = data.user && typeof data.user === 'object' && !Array.isArray(data.user)
    ? data.user as Record<string, unknown>
    : {};
  const claims = decodeJwtPayload(accessToken) || {};
  const sub = stringValue(rawUser.id) || stringValue(rawUser.sub) || stringValue(claims.sub);
  if (!sub) return null;

  const firstName = stringValue(rawUser.firstName) || stringValue(claims.given_name);
  const lastName = stringValue(rawUser.lastName) || stringValue(claims.family_name);
  const attributes = rawUser.attributes && typeof rawUser.attributes === 'object' && !Array.isArray(rawUser.attributes)
    ? rawUser.attributes as Record<string, unknown>
    : claims.attributes && typeof claims.attributes === 'object' && !Array.isArray(claims.attributes)
      ? claims.attributes as Record<string, unknown>
      : {};

  return {
    id: sub,
    sub,
    name: stringValue(rawUser.name) || stringValue(claims.name) || `${firstName} ${lastName}`.trim(),
    email: stringValue(rawUser.email) || stringValue(claims.email),
    avatar:
      stringValue(rawUser.avatar) ||
      stringValue(rawUser.avatarUrl) ||
      stringValue(rawUser.picture) ||
      stringValue(claims.picture) ||
      stringValue(claims.avatar),
    attributes,
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

async function persistSession(data: Record<string, unknown>) {
  const accessToken = stringValue(data.accessToken) || stringValue(data.access_token) || stringValue(data.token);
  const refreshToken = stringValue(data.refreshToken) || stringValue(data.refresh_token);
  if (!accessToken) return;

  const cookieStore = await cookies();
  const claims = decodeJwtPayload(accessToken);
  const expiresAt = claims && typeof claims.exp === 'number' ? claims.exp : 0;
  const accessMaxAge = expiresAt > 0
    ? Math.max(60, expiresAt - Math.floor(Date.now() / 1000))
    : 60 * 60;

  cookieStore.set('appkit_access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: accessMaxAge,
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

  cookieStore.set('narinyland_is_auth', 'true', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  const user = userFromResponse(data, accessToken);
  if (!user) return;

  cookieStore.set('narinyland_sub', user.sub, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });

  await redis.setex(`user_session:${user.sub}`, SESSION_TTL_SECONDS, JSON.stringify(user));
}

export async function POST(req: Request) {
  const csrfRejection = rejectCrossOrigin(req);
  if (csrfRejection) return csrfRejection;

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = stringValue(body.action) as AuthAction;
    const path = ACTION_PATHS[action];
    if (!path) {
      return NextResponse.json({ error: 'Unsupported authentication action' }, { status: 400 });
    }

    const applicationId = await resolveApplicationId();
    if (!applicationId) {
      return NextResponse.json({ error: 'Authentication is not configured for this application' }, { status: 500 });
    }

    const requestUpstream = () => fetch(`${normalizeDomain(getAppKitDomain())}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-app-id': applicationId,
      },
      body: JSON.stringify(selectPayload(action, body)),
      cache: 'no-store',
    });

    let response = await requestUpstream();
    if ([502, 503, 504].includes(response.status)) {
      debugWarn(`AppKit credential auth returned ${response.status}; retrying once.`);
      await new Promise(resolve => setTimeout(resolve, 500));
      response = await requestUpstream();
    }

    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (response.ok) {
      await persistSession(data);
    }

    const safeData = { ...data };
    delete safeData.accessToken;
    delete safeData.refreshToken;
    delete safeData.access_token;
    delete safeData.refresh_token;
    delete safeData.token;

    return NextResponse.json(safeData, { status: response.status });
  } catch (error) {
    console.error('Local AppKit credential proxy error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
  }
}
