import { NextResponse } from 'next/server';
import { getCircleMembersViaServer } from '@/lib/appkit-server';

const APPKIT_TIMEOUT_MS = 8_000;

type AppKitCircle = {
  id?: string;
  _id?: string;
  data?: AppKitCircle;
  circle?: AppKitCircle;
};

function extractCircleId(value: AppKitCircle): string {
  const nested = value.data || value.circle || value;
  return nested.id || nested._id || '';
}

function extractCircleList(payload: unknown): AppKitCircle[] {
  if (Array.isArray(payload)) return payload as AppKitCircle[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.circles)) return record.circles as AppKitCircle[];
  if (Array.isArray(record.data)) return record.data as AppKitCircle[];
  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if (Array.isArray(data.circles)) return data.circles as AppKitCircle[];
  }
  return [];
}

function appKitDomain(): string {
  return (process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app')
    .trim()
    .replace(/\/+$/, '');
}

export async function userCanSeeCircleWithToken(token: string, circleId: string): Promise<boolean> {
  if (!token || !circleId || token.startsWith('name_session_')) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPKIT_TIMEOUT_MS);
  try {
    const response = await fetch(`${appKitDomain()}/api/v1/circles`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const circles = extractCircleList(await response.json().catch(() => []));
    return circles.some((circle) => extractCircleId(circle) === circleId);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCircleRole(circleId: string, userId: string): Promise<string | null> {
  const members = await getCircleMembersViaServer(circleId);
  const member = members.find((candidate) => candidate.userId === userId);
  return member?.role?.toLowerCase() || null;
}

export async function requireCircleAdmin(circleId: string, userId: string): Promise<NextResponse | null> {
  const role = await getCircleRole(circleId, userId);
  if (role === 'owner' || role === 'admin') return null;
  return NextResponse.json({ error: 'forbidden', error_description: 'Circle administrator access required' }, { status: 403 });
}
