type UnknownRecord = Record<string, unknown>;

export type BoundarySessionUser = {
  id: string;
  sub: string;
  name: string;
  email: string;
  avatar: string;
  picture: string;
  attributes: Record<string, unknown>;
};

export type BoundarySessionTokens = {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
};

const PUBLIC_ORIGIN_ENV_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'APP_URL',
  'PUBLIC_APP_URL',
  'NEXTAUTH_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
  'RAILWAY_PUBLIC_DOMAIN',
];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return undefined;
}

function firstNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
}

export function normalizeBaseUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1') ? 'http' : 'https'}://${trimmed}`;

  return withProtocol.replace(/\/+$/, '');
}

export function resolvePublicOrigin(req: Request): string {
  for (const key of PUBLIC_ORIGIN_ENV_KEYS) {
    const normalized = normalizeBaseUrl(process.env[key]);
    if (normalized) return normalized;
  }

  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.get('host')?.split(',')[0]?.trim();
  if (host) {
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const proto = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  return new URL(req.url).origin;
}

export function getBoundarySsoLaunchUrl(req: Request): string {
  return `${resolvePublicOrigin(req)}/auth/boundary/launch`;
}

export function getBoundaryBackendUrl(): string {
  return (
    normalizeBaseUrl(process.env.BOUNDARY_BACKEND_URL) ||
    normalizeBaseUrl(process.env.APPKIT_DOMAIN) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APPKIT_DOMAIN) ||
    'https://appkits.up.railway.app'
  );
}

export function extractBoundaryUser(payload: unknown): unknown {
  if (!isRecord(payload)) return null;

  for (const key of ['user', 'profile', 'account']) {
    if (isRecord(payload[key])) return payload[key];
  }

  if (isRecord(payload.data)) {
    const nested = extractBoundaryUser(payload.data);
    if (nested) return nested;
  }

  if (firstString(payload, ['id', 'sub', 'userId', 'user_id', 'email'])) return payload;

  return null;
}

export function normalizeBoundaryUser(rawUser: unknown): BoundarySessionUser | null {
  if (!isRecord(rawUser)) return null;

  const email = firstString(rawUser, ['email', 'mail']) || '';
  const id = firstString(rawUser, ['id', 'sub', 'userId', 'user_id', 'subject']) || email;
  if (!id) return null;

  const firstName = firstString(rawUser, ['firstName', 'first_name', 'given_name']) || '';
  const lastName = firstString(rawUser, ['lastName', 'last_name', 'family_name']) || '';
  const combinedName = `${firstName} ${lastName}`.trim();
  const name = firstString(rawUser, ['name', 'displayName', 'display_name', 'username']) || combinedName || email || 'Narinyland friend';
  const avatar = firstString(rawUser, ['avatar', 'picture', 'profile_image', 'image', 'photoUrl', 'photo_url']) || '';
  const attributes = isRecord(rawUser.attributes) ? rawUser.attributes : {};

  return {
    id,
    sub: id,
    name,
    email,
    avatar,
    picture: avatar,
    attributes,
  };
}

export function extractBoundaryTokens(payload: unknown): BoundarySessionTokens {
  const containers: UnknownRecord[] = [];

  const collect = (value: unknown) => {
    if (isRecord(value)) containers.push(value);
  };

  collect(payload);
  if (isRecord(payload)) {
    collect(payload.tokens);
    collect(payload.session);
    collect(payload.data);
    if (isRecord(payload.data)) {
      collect(payload.data.tokens);
      collect(payload.data.session);
    }
  }

  const tokens: BoundarySessionTokens = {};
  for (const container of containers) {
    if (!tokens.accessToken) {
      const accessToken = firstString(container, ['access_token', 'accessToken', 'token']);
      if (accessToken) tokens.accessToken = accessToken;
    }

    if (!tokens.refreshToken) {
      const refreshToken = firstString(container, ['refresh_token', 'refreshToken']);
      if (refreshToken) tokens.refreshToken = refreshToken;
    }

    if (!tokens.idToken) {
      const idToken = firstString(container, ['id_token', 'idToken']);
      if (idToken) tokens.idToken = idToken;
    }

    if (!tokens.expiresIn) {
      const expiresIn = firstNumber(container, ['expires_in', 'expiresIn']);
      if (expiresIn) tokens.expiresIn = expiresIn;
    }
  }

  return tokens;
}
