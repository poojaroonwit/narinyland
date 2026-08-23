import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-server';
import { getAppKitApplicationId, getAppKitDomain, getServiceToken } from '@/lib/appkit-server';
import { rejectCrossOrigin } from '@/lib/security';
import {
  createSession,
  deleteSession,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type NarinylandSessionUser,
} from '@/lib/session-store';

type JsonMap = Record<string, unknown>;

const PROFILE_TIMEOUT_MS = 8_000;

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function resolveApplicationId(): Promise<string> {
  let id = getAppKitApplicationId();
  if (!id) {
    await getServiceToken();
    id = getAppKitApplicationId();
  }
  return id || '';
}

async function patchAppKitProfile(accessToken: string, body: JsonMap) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);
  try {
    const applicationId = await resolveApplicationId();
    const response = await fetch(`${getAppKitDomain().replace(/\/+$/, '')}/api/v1/users/me`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(applicationId ? { 'X-App-ID': applicationId } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({})) as JsonMap;
    if (!response.ok) {
      throw Object.assign(new Error(stringValue(data.error_description) || stringValue(data.message) || 'Profile update failed'), {
        status: response.status,
      });
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function PATCH(request: Request) {
  const csrfRejection = rejectCrossOrigin(request);
  if (csrfRejection) return csrfRejection;

  try {
    const session = await getAuthSession(request);
    if (session.error || !session.userId || !session.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('appkit_access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null) as JsonMap | null;
    if (!body) return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 });

    const name = stringValue(body.name);
    const nameParts = name.split(/\s+/).filter(Boolean);
    const avatar = typeof body.avatar === 'string' ? body.avatar : undefined;
    const attributes = isRecord(body.attributes) ? body.attributes : {};
    const birthday = stringValue(attributes.birthday);

    const upstream = await patchAppKitProfile(accessToken, {
      ...(name ? { firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') } : {}),
      ...(avatar !== undefined ? { avatar } : {}),
      ...(birthday ? { dateOfBirth: birthday } : {}),
    });

    const firstName = stringValue(upstream.firstName);
    const lastName = stringValue(upstream.lastName);
    const upstreamAttributes = isRecord(upstream.attributes) ? upstream.attributes : {};
    const nextUser: NarinylandSessionUser = {
      ...session.user,
      id: session.userId,
      sub: session.userId,
      name: `${firstName} ${lastName}`.trim() || name || session.user.name || '',
      email: stringValue(upstream.email) || session.user.email || '',
      avatar: stringValue(upstream.avatar) || avatar || session.user.avatar || '',
      attributes: { ...(session.user.attributes || {}), ...attributes, ...upstreamAttributes },
      authSource: 'appkit',
    };

    const previousSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const nextSessionId = await createSession(nextUser);
    cookieStore.set(SESSION_COOKIE_NAME, nextSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    if (previousSessionId && previousSessionId !== nextSessionId) await deleteSession(previousSessionId);

    return NextResponse.json({ success: true, user: nextUser });
  } catch (error) {
    const status = isRecord(error) && typeof error.status === 'number' ? error.status : 503;
    console.error('Profile update error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Profile update failed' }, { status });
  }
}
