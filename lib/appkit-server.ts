const APPKIT_DOMAIN = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || 'https://appkits.up.railway.app';
const APPKIT_CLIENT_ID = process.env.APPKIT_CLIENT_ID || process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || '';
const APPKIT_CLIENT_SECRET = process.env.APPKIT_CLIENT_SECRET || '';
const APPKIT_APPLICATION_ID =
  process.env.APPKIT_APPLICATION_ID ||
  process.env.NEXT_PUBLIC_APPKIT_APPLICATION_ID ||
  process.env.UNIBOX_APP_ID ||
  '';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let resolvedAppKitApplicationId = normalizeApplicationId(APPKIT_APPLICATION_ID);
let lastSsoLaunchUrlSync: { url: string; syncedAt: number } | null = null;

function getNormalizedAppKitDomain() {
  return APPKIT_DOMAIN.trim().replace(/\/+$/, '');
}

function normalizeApplicationId(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return UUID_REGEX.test(normalized) ? normalized : '';
}

function getAppKitErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['error_description', 'message', 'detail', 'error']) {
      if (typeof record[key] === 'string' && record[key].trim()) {
        return record[key].trim();
      }
    }
  }

  return fallback;
}

function isLocalLaunchUrl(ssoLaunchUrl: string) {
  try {
    const hostname = new URL(ssoLaunchUrl).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

type ServiceTokenResult = {
  token: string | null;
  applicationId?: string;
  error?: string;
};

async function requestServiceToken(): Promise<ServiceTokenResult> {
  if (!APPKIT_CLIENT_ID || !APPKIT_CLIENT_SECRET) {
    const error = 'AppKit service authentication is not configured: missing client ID or client secret';
    console.warn(error);
    return { token: null, error };
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: APPKIT_CLIENT_ID,
      client_secret: APPKIT_CLIENT_SECRET,
      // AppKit's application admin routes enforce these permission scopes.
      scope: 'applications:view applications:edit',
    });

    const res = await fetch(`${getNormalizedAppKitDomain()}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = getAppKitErrorMessage(data, `AppKit service token exchange failed with HTTP ${res.status}`);
      console.error('AppKit service token exchange failed:', {
        status: res.status,
        error,
      });
      return { token: null, error };
    }

    const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const token = typeof record.access_token === 'string' ? record.access_token.trim() : '';

    if (!token) {
      const error = 'AppKit service token response did not include an access token';
      console.error(error);
      return { token: null, error };
    }

    const tokenApplicationId = normalizeApplicationId(record.application_id || record.applicationId);
    if (tokenApplicationId) {
      resolvedAppKitApplicationId = tokenApplicationId;
    }

    return {
      token,
      applicationId: resolvedAppKitApplicationId || undefined,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unable to reach AppKit token endpoint';
    console.error('AppKit getServiceToken error:', error);
    return { token: null, error };
  }
}

/**
 * Get a service-level access token using the client_credentials grant.
 * Read-only callers may treat a missing token as an unavailable integration.
 */
export async function getServiceToken(): Promise<string | null> {
  return (await requestServiceToken()).token;
}

async function requireServiceToken(): Promise<string> {
  const result = await requestServiceToken();
  if (!result.token) {
    throw new Error(result.error || 'AppKit service authentication failed');
  }
  return result.token;
}

function requireApplicationId(): string {
  if (!resolvedAppKitApplicationId) {
    throw new Error(
      'AppKit service token is not bound to an application. Configure APPKIT_APPLICATION_ID or deploy an AppKit token endpoint that returns application_id.'
    );
  }
  return resolvedAppKitApplicationId;
}

/**
 * Get the AppKit Domain
 */
export function getAppKitDomain() {
  return APPKIT_DOMAIN;
}

/**
 * Get the AppKit Client ID.
 */
export function getAppKitClientId() {
  return APPKIT_CLIENT_ID;
}

/**
 * Get the AppKit Application ID resolved from configuration or the latest
 * application-bound client_credentials token exchange.
 */
export function getAppKitApplicationId() {
  return resolvedAppKitApplicationId;
}

/**
 * Best-effort sync for Boundary's SSO launch target in AppKit/CMS.
 * A sync failure should never prevent a valid launch code from logging in.
 */
export async function ensureSsoLaunchUrlConfigured(ssoLaunchUrl: string): Promise<boolean> {
  const normalizedUrl = ssoLaunchUrl.trim();
  if (!normalizedUrl) return false;

  if (isLocalLaunchUrl(normalizedUrl) && process.env.ALLOW_LOCAL_SSO_LAUNCH_URL_SYNC !== 'true') {
    return false;
  }

  const now = Date.now();
  if (
    lastSsoLaunchUrlSync?.url === normalizedUrl &&
    now - lastSsoLaunchUrlSync.syncedAt < 10 * 60 * 1000
  ) {
    return true;
  }

  const token = await getServiceToken();
  const applicationId = resolvedAppKitApplicationId;
  if (!token || !applicationId) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(
      `${getNormalizedAppKitDomain()}/api/v1/admin/applications/${applicationId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ssoLaunchUrl: normalizedUrl }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.warn('AppKit ssoLaunchUrl sync failed:', { status: res.status, details });
      return false;
    }

    lastSsoLaunchUrlSync = { url: normalizedUrl, syncedAt: now };
    return true;
  } catch (err) {
    console.warn('AppKit ssoLaunchUrl sync error:', err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
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

type AppKitCircleMember = {
  userId?: string;
  id?: string;
  name?: string;
  avatar?: string;
  role?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    avatar?: string;
    picture?: string;
  };
};

/**
 * Fetch the branding configuration from AppKit admin API.
 * Falls back to null when credentials are missing or the call fails.
 */
export async function getAppBranding(): Promise<AppBranding | null> {
  const token = await getServiceToken();
  const applicationId = resolvedAppKitApplicationId;
  if (!token || !applicationId) return null;

  try {
    const res = await fetch(
      `${getNormalizedAppKitDomain()}/api/v1/admin/applications/${applicationId}/branding`,
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
 * Circle writes use the application-bound service identity. AppKit's public
 * user-circle API is read-only; the application admin API is the supported
 * write surface and enforces applications:edit.
 */
export async function createCircleViaServer(name: string, description?: string, _userToken?: string) {
  const token = await requireServiceToken();
  const applicationId = requireApplicationId();
  const baseUrl = getNormalizedAppKitDomain();
  const circleUrl = `${baseUrl}/api/v1/admin/applications/${applicationId}/circles`;

  const res = await fetch(circleUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ name, circleType: 'team', description: description || name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getAppKitErrorMessage(err, `Failed to create circle: ${res.status}`));
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
  const applicationId = resolvedAppKitApplicationId;
  if (!token || !applicationId) return [];

  try {
    const baseUrl = getNormalizedAppKitDomain();
    const res = await fetch(
      `${baseUrl}/api/v1/admin/applications/${applicationId}/circles/${circleId}/members`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 30 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const members = Array.isArray(data) ? data : (data.members || data.data || []);
    return (members as AppKitCircleMember[]).map((m) => ({
      userId: m.userId || m.user?.id || m.id || '',
      name: m.user?.name || m.name || m.user?.email || 'Member',
      avatar: m.user?.avatar || m.user?.picture || m.avatar || '',
      role: m.role || 'member',
    }));
  } catch {
    return [];
  }
}

/**
 * Add a member to a circle via the AppKit application-admin API.
 */
export async function addCircleMemberViaServer(circleId: string, userId: string, role = 'member', _userToken?: string) {
  const token = await requireServiceToken();
  const applicationId = requireApplicationId();
  const baseUrl = getNormalizedAppKitDomain();
  const memberUrl = `${baseUrl}/api/v1/admin/applications/${applicationId}/circles/${circleId}/members`;

  const res = await fetch(memberUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ userId, role }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = getAppKitErrorMessage(err, `Failed to add member: ${res.status}`);
    if (/already|exists|member/i.test(message)) {
      return { success: true, alreadyMember: true };
    }
    throw new Error(message);
  }
  return res.json();
}

/**
 * Update a circle (world) via the AppKit application-admin API.
 */
export async function updateCircleViaServer(circleId: string, data: { name?: string; description?: string }, _userToken?: string) {
  const token = await requireServiceToken();
  const applicationId = requireApplicationId();
  const baseUrl = getNormalizedAppKitDomain();
  const circleUrl = `${baseUrl}/api/v1/admin/applications/${applicationId}/circles/${circleId}`;

  const res = await fetch(circleUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getAppKitErrorMessage(err, `Failed to update circle: ${res.status}`));
  }
  return res.json();
}

/**
 * Delete a circle (world) via the AppKit application-admin API.
 */
export async function deleteCircleViaServer(circleId: string, _userToken?: string) {
  const token = await requireServiceToken();
  const applicationId = requireApplicationId();
  const baseUrl = getNormalizedAppKitDomain();
  const circleUrl = `${baseUrl}/api/v1/admin/applications/${applicationId}/circles/${circleId}`;

  const res = await fetch(circleUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getAppKitErrorMessage(err, `Failed to delete circle: ${res.status}`));
  }
  return true;
}
