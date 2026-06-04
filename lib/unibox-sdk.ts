type JsonRecord = Record<string, unknown>;

export type UniboxApplication = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
};

export type UniboxAsset = {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  url: string;
  storagePath: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  applicationId: string;
  folderId: string | null;
  metadata?: JsonRecord;
  isFavorite?: boolean;
  trashedAt?: string | null;
};

export type UniboxUploadResult = {
  success: boolean;
  file: UniboxAsset;
};

export type UniboxClientOptions = {
  baseUrl?: string;
  sessionCookie?: string;
  sessionCookieName?: string;
  fetch?: typeof fetch;
};

export class UniboxError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'UniboxError';
    this.status = status;
    this.body = body;
  }
}

function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl || 'https://unibox.up.railway.app').replace(/\/+$/, '');
}

function buildCookieHeader(sessionCookie?: string, sessionCookieName = 'next-auth.session-token'): string | null {
  const trimmed = sessionCookie?.trim();
  if (!trimmed) return null;
  return trimmed.includes('=') ? trimmed : `${sessionCookieName}=${trimmed}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const message = record.message || record.error;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof body === 'string' && body.trim()) return body;
  return fallback;
}

export class UniboxClient {
  private readonly baseUrl: string;
  private readonly sessionCookie: string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(options: UniboxClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.sessionCookie = buildCookieHeader(options.sessionCookie, options.sessionCookieName);
    this.fetchImpl = options.fetch || fetch;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (this.sessionCookie && !headers.has('Cookie')) {
      headers.set('Cookie', this.sessionCookie);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    const body = await parseResponse(response);
    if (!response.ok) {
      throw new UniboxError(
        getErrorMessage(body, `UniBox request failed with status ${response.status}`),
        response.status,
        body
      );
    }

    return body as T;
  }

  async listApplications(): Promise<{ applications: UniboxApplication[] }> {
    return this.request('/api/user/applications');
  }

  async listAssets(applicationId: string): Promise<{ files: UniboxAsset[] }> {
    return this.request(`/api/apps/${encodeURIComponent(applicationId)}/assets`);
  }

  async uploadAsset(
    applicationId: string,
    input: {
      file: Blob;
      filename: string;
      folderId?: string | null;
    }
  ): Promise<UniboxUploadResult> {
    const formData = new FormData();
    formData.append('file', input.file, input.filename);
    if (input.folderId) formData.append('folderId', input.folderId);

    return this.request(`/api/apps/${encodeURIComponent(applicationId)}/upload`, {
      method: 'POST',
      body: formData,
    });
  }

  async updateAsset(
    applicationId: string,
    assetId: string,
    data: { filename?: string; folderId?: string | null; favorite?: boolean; trashed?: boolean }
  ): Promise<{ file: UniboxAsset }> {
    return this.request(
      `/api/apps/${encodeURIComponent(applicationId)}/assets/${encodeURIComponent(assetId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
  }

  async deleteAsset(applicationId: string, assetId: string): Promise<{ success: boolean }> {
    return this.request(
      `/api/apps/${encodeURIComponent(applicationId)}/assets/${encodeURIComponent(assetId)}`,
      { method: 'DELETE' }
    );
  }

  async findAsset(applicationId: string, assetId: string): Promise<UniboxAsset | null> {
    const { files } = await this.listAssets(applicationId);
    return files.find((file) => file.id === assetId) || null;
  }

  getCookieHeader(): string | null {
    return this.sessionCookie;
  }
}
