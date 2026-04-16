import { NextResponse } from 'next/server';

const APPKIT_DOMAIN = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app';
const APPKIT_CLIENT_ID = process.env.APPKIT_CLIENT_ID || process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';
const APPKIT_CLIENT_SECRET = process.env.APPKIT_CLIENT_SECRET || '';

/**
 * Get a service-level accessToken using client_credentials grant.
 */
export async function getServiceToken(): Promise<string | null> {
  if (!APPKIT_CLIENT_ID || !APPKIT_CLIENT_SECRET) {
    console.warn('AppKit Service Token requested but APPKIT_CLIENT_ID/SECRET missing');
    return null;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: APPKIT_CLIENT_ID,
      client_secret: APPKIT_CLIENT_SECRET,
      // Using broad scopes to ensure we have permission for groups/circles
      scope: 'manage:all manage:groups circles:manage',
    });

    const res = await fetch(`${APPKIT_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('AppKit service token exchange failed:', err);
      return null;
    }
    
    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.error('AppKit getServiceToken error:', err);
    return null;
  }
}

/**
 * Get the AppKit Domain
 */
export function getAppKitDomain() {
  return APPKIT_DOMAIN;
}

/**
 * Get the AppKit Client ID (Application ID)
 */
export function getAppKitClientId() {
  return APPKIT_CLIENT_ID;
}

// ─── Branding (used by PWA manifest) ────────────────────────────────

export interface AppBranding {
  appName?: string;
  logoUrl?: string;
  splash?: {
    backgroundColor?: string;
    spinnerColor?: string;
    spinnerType?: string;
  };
  social?: Record<string, string>;
}

/**
 * Fetch the branding configuration from AppKit admin API.
 * Falls back to null when credentials are missing or the call fails.
 */
export async function getAppBranding(): Promise<AppBranding | null> {
  const token = await getServiceToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${APPKIT_DOMAIN}/api/v1/admin/applications/${APPKIT_CLIENT_ID}/branding`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return (await res.json()) as AppBranding;
  } catch {
    return null;
  }
}

// ─── Circles (server-side management) ───────────────────────────────

/**
 * Create a circle (world) via the AppKit API.
 * If userToken is provided, it uses the user's context. Otherwise uses service-level admin token.
 */
export async function createCircleViaServer(name: string, description?: string, userToken?: string) {
  // If the token is one of our name-based pseudo-tokens, treat it as "no token" 
  // to force a fallback to the service-level admin token.
  const effectiveToken = (userToken?.startsWith('name_session_')) ? undefined : userToken;
  
  const token = effectiveToken || await getServiceToken();
  if (!token) throw new Error('Missing authentication token');

  const res = await fetch(
    `${APPKIT_DOMAIN}/api/v1/${effectiveToken ? '' : 'admin/applications/' + APPKIT_CLIENT_ID + '/'}circles`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, circleType: 'team', description: description || name }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create circle: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch all members of a circle via the AppKit Admin API.
 * Returns an array of member objects with at least { userId, name, avatar, role }.
 */
export async function getCircleMembersViaServer(circleId: string): Promise<Array<{
  userId: string;
  name: string;
  avatar?: string;
  role: string;
}>> {
  const token = await getServiceToken();
  if (!token) return [];

  try {
    const res = await fetch(
      `${APPKIT_DOMAIN}/api/v1/admin/applications/${APPKIT_CLIENT_ID}/circles/${circleId}/members`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 30 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const members = Array.isArray(data) ? data : (data.members || data.data || []);
    return members.map((m: any) => ({
      userId: m.userId || m.user?.id || m.id,
      name: m.user?.name || m.name || m.user?.email || 'Member',
      avatar: m.user?.avatar || m.user?.picture || m.avatar || '',
      role: m.role || 'member',
    }));
  } catch {
    return [];
  }
}

/**
 * Add a member to a circle via the AppKit API.
 */
export async function addCircleMemberViaServer(circleId: string, userId: string, role = 'member', userToken?: string) {
  // If the token is one of our name-based pseudo-tokens, treat it as "no token" 
  // to force a fallback to the service-level admin token.
  const effectiveToken = (userToken?.startsWith('name_session_')) ? undefined : userToken;
  
  const token = effectiveToken || await getServiceToken();
  if (!token) throw new Error('Missing authentication token');

  const res = await fetch(`${APPKIT_DOMAIN}/api/v1/circles/${circleId}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to add member: ${res.status}`);
  }
  return res.json();
}

/**
 * Update a circle (world) via the AppKit API.
 */
export async function updateCircleViaServer(circleId: string, data: { name?: string; description?: string }, userToken?: string) {
  const effectiveToken = (userToken?.startsWith('name_session_')) ? undefined : userToken;
  const token = effectiveToken || await getServiceToken();
  if (!token) throw new Error('Missing authentication token');

  const res = await fetch(
    `${APPKIT_DOMAIN}/api/v1/${effectiveToken ? '' : 'admin/'}applications/${APPKIT_CLIENT_ID}/circles/${circleId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update circle: ' + res.status);
  }
  return res.json();
}

/**
 * Delete a circle (world) via the AppKit API.
 */
export async function deleteCircleViaServer(circleId: string, userToken?: string) {
  const effectiveToken = (userToken?.startsWith('name_session_')) ? undefined : userToken;
  const token = effectiveToken || await getServiceToken();
  if (!token) throw new Error('Missing authentication token');

  const res = await fetch(
    `${APPKIT_DOMAIN}/api/v1/${effectiveToken ? '' : 'admin/'}applications/${APPKIT_CLIENT_ID}/circles/${circleId}`,
    {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete circle: ' + res.status);
  }
  return true;
}
