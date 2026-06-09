/**
 * Narinyland API Client
 * Connects the frontend to the Express + Prisma backend
 */

import { getActiveCircleId } from '@/lib/circle-store';
import type {
  AppConfig,
  Interaction,
  Land,
  LoveLetterMessage,
  LoveStats,
  MemoryItem,
  PurchasedItem,
} from '@/types';

type ApiResult = Record<string, unknown>;
type ApiMutationResult = ApiResult & { success?: boolean };
type MemoryRecord = MemoryItem & {
  id: string;
  s3Key?: string | null;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};
type TimelineRecord = Omit<Interaction, 'timestamp'> & { timestamp: string };
type LetterRecord = Omit<LoveLetterMessage, 'timestamp' | 'unlockDate' | 'readAt'> & {
  timestamp: string;
  unlockDate: string;
  readAt?: string;
};
type CouponRecord = AppConfig['coupons'][number] & {
  forPartner?: string;
};
type UploadResult = {
  key: string;
  url: string;
  originalName: string;
  size: number;
  contentType: string;
};
type CircleRecord = {
  id: string;
  name: string;
  description?: string;
  role: string;
  memberCount?: number;
  createdAt?: string;
};
type CircleMember = {
  id?: string;
  userId?: string;
  name?: string;
  avatar?: string;
  role?: string;
};
type CircleCreateResult = ApiMutationResult & {
  circleId?: string;
  config?: AppConfig;
  defaultLand?: Land;
};
type ConfigUpdatePayload = Partial<AppConfig> & Record<string, unknown>;
type PartnerSyncResult = ApiMutationResult & {
  partnerId?: string;
  name?: string;
  avatar?: string;
};
type StatsResult = LoveStats & {
  leaves: number;
  points: number;
  xpForNextLevel?: number;
  totalXP?: number;
  success?: boolean;
  leveledUp?: boolean;
};
type PurchasedItemCreatePayload = {
  type: string;
  landId: string;
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
  modelUrl?: string | null;
};
type PurchasedItemUpdatePayload = {
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
};

// Use VITE_API_URL if defined, otherwise default to relative '/api' path
// This allows the Vite proxy (in dev) and Vercel rewrites (in prod) to handle routing
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ─── Helper ──────────────────────────────────────────────────────────

function getCircleHeader(): Record<string, string> {
  const circleId = getActiveCircleId();
  return circleId ? { 'X-Circle-Id': circleId } : {};
}

async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getCircleHeader(),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        document.cookie = 'narinyland_is_auth=; Max-Age=0; path=/;';
        window.location.href = '/';
      }
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getCircleHeader(),
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        document.cookie = 'narinyland_is_auth=; Max-Age=0; path=/;';
        window.location.href = '/';
      }
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

// ─── Config API ──────────────────────────────────────────────────────

export const configAPI = {
  get: () => fetchAPI<AppConfig>('/config'),
  
  update: (data: ConfigUpdatePayload) =>
    fetchAPI<AppConfig>('/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ─── Memories API ────────────────────────────────────────────────────

export const memoriesAPI = {
  list: (privacy?: string) =>
    fetchAPI<MemoryRecord[]>(`/memories${privacy && privacy !== 'all' ? `?privacy=${privacy}` : ''}`),

  create: (data: { url?: string; privacy?: string; caption?: string; file?: File }) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('image', data.file);
      if (data.privacy) formData.append('privacy', data.privacy);
      if (data.caption) formData.append('caption', data.caption);
      return fetchFormData<MemoryRecord>('/memories', formData);
    }
    return fetchAPI<MemoryRecord>('/memories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { url?: string; privacy?: string; caption?: string; file?: File }) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('image', data.file);
      if (data.url) formData.append('url', data.url);
      if (data.privacy) formData.append('privacy', data.privacy);
      if (data.caption) formData.append('caption', data.caption);
      return fetchFormData<MemoryRecord>(`/memories/${id}`, formData);
    }
    return fetchAPI<MemoryRecord>(`/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) =>
    fetchAPI<ApiMutationResult>(`/memories/${id}`, { method: 'DELETE' }),

  reorder: (orderedIds: string[]) =>
    fetchAPI<ApiMutationResult>('/memories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }),
};

// ─── Timeline API ────────────────────────────────────────────────────

export const timelineAPI = {
  list: () => fetchAPI<TimelineRecord[]>('/timeline'),

  create: (data: { text: string; type?: string; location?: string; latitude?: number; longitude?: number; timestamp?: string; files?: File[] }) => {
    if (data.files && data.files.length > 0) {
      const formData = new FormData();
      data.files.forEach(file => {
        formData.append('media', file);
      });
      formData.append('text', data.text);
      if (data.type) formData.append('type', data.type);
      if (data.location) formData.append('location', data.location);
      if (data.latitude !== undefined) formData.append('latitude', data.latitude.toString());
      if (data.longitude !== undefined) formData.append('longitude', data.longitude.toString());
      if (data.timestamp) formData.append('timestamp', data.timestamp);
      return fetchFormData<TimelineRecord>('/timeline', formData);
    }
    return fetchAPI<TimelineRecord>('/timeline', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { text?: string; type?: string; location?: string; latitude?: number; longitude?: number; timestamp?: string; files?: File[] }) => {
    if (data.files && data.files.length > 0) {
      const formData = new FormData();
      data.files.forEach(file => {
        formData.append('media', file);
      });
      if (data.text !== undefined) formData.append('text', data.text);
      if (data.type !== undefined) formData.append('type', data.type);
      if (data.location !== undefined) formData.append('location', data.location);
      if (data.latitude !== undefined) formData.append('latitude', data.latitude.toString());
      if (data.longitude !== undefined) formData.append('longitude', data.longitude.toString());
      if (data.timestamp !== undefined) formData.append('timestamp', data.timestamp);
      return fetchFormData<TimelineRecord>(`/timeline/${id}`, formData);
    }
    return fetchAPI<TimelineRecord>(`/timeline/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) =>
    fetchAPI<ApiMutationResult>(`/timeline/${id}`, { method: 'DELETE' }),
};

// ─── Letters API ─────────────────────────────────────────────────────

export const lettersAPI = {
  list: () => fetchAPI<LetterRecord[]>('/letters'),

  create: (data: { fromId: string; content: string; unlockDate: string; file?: File }) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('media', data.file);
      formData.append('fromId', data.fromId);
      formData.append('content', data.content);
      formData.append('unlockDate', data.unlockDate);
      return fetchFormData<LetterRecord>('/letters', formData);
    }
    return fetchAPI<LetterRecord>('/letters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { folder?: string; isRead?: boolean; readAt?: Date; fromId?: string; content?: string; unlockDate?: string; file?: File }) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('media', data.file);
      if (data.fromId) formData.append('fromId', data.fromId);
      if (data.content) formData.append('content', data.content);
      if (data.unlockDate) formData.append('unlockDate', data.unlockDate);
      return fetchFormData<LetterRecord>(`/letters/${id}`, formData);
    }
    return fetchAPI<LetterRecord>(`/letters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  markAsRead: (id: string) =>
    fetchAPI<ApiMutationResult>(`/letters/${id}/read`, { method: 'PUT' }),

  delete: (id: string) =>
    fetchAPI<ApiMutationResult>(`/letters/${id}`, { method: 'DELETE' }),
};

// ─── Partners API ────────────────────────────────────────────────────

export const partnersAPI = {
  /**
   * Register the current logged-in user as a partner in their active circle.
   * The server reads the user's identity from the session cookie.
   */
  sync: (data?: { name?: string; avatar?: string }) =>
    fetchAPI<PartnerSyncResult>('/partners/sync', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
};

// ─── Coupons API ─────────────────────────────────────────────────────

export const couponsAPI = {
  list: () => fetchAPI<CouponRecord[]>('/coupons'),

  create: (data: { title: string; emoji: string; desc: string; color: string; forPartner: string; points: number }) => {
    return fetchAPI<CouponRecord>('/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  redeem: (id: string) => fetchAPI<CouponRecord>(`/coupons/${id}/redeem`, { method: 'PUT' }),

  delete: (id: string) => fetchAPI<ApiMutationResult>(`/coupons/${id}`, { method: 'DELETE' }),
};

// ─── Stats API ───────────────────────────────────────────────────────

export const statsAPI = {
  get: () => fetchAPI<StatsResult>('/stats'),

  addXP: (amount: number, partnerId?: string) =>
    fetchAPI<StatsResult>('/stats/add-xp', {
      method: 'PUT',
      body: JSON.stringify({ amount, partnerId }),
    }),

  addLeaf: () => fetchAPI<StatsResult>('/stats/add-leaf', { method: 'POST' }),

  addPoints: (amount: number) => 
    fetchAPI<StatsResult>('/stats/add-points', { 
        method: 'POST', 
        body: JSON.stringify({ amount }) 
    }),
};

// ─── Upload API ──────────────────────────────────────────────────────

export const uploadAPI = {
  upload: (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    return fetchFormData<UploadResult>('/upload', formData);
  },

  delete: (key: string) =>
    fetchAPI<ApiMutationResult>('/upload', {
      method: 'DELETE',
      body: JSON.stringify({ key }),
    }),

  getPresignedUrl: (key: string, expires?: number) =>
    fetchAPI<{ url: string }>(`/upload/presign?key=${encodeURIComponent(key)}${expires ? `&expires=${expires}` : ''}`),

  listFiles: (folder: string) =>
    fetchAPI<string[]>(`/upload/list?folder=${encodeURIComponent(folder)}`),
};

// ─── Lands API ───────────────────────────────────────────────────────

export const landsAPI = {
  list: () => fetchAPI<Land[]>('/lands'),

  create: (name: string) =>
    fetchAPI<Land>('/lands', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    fetchAPI<Land>(`/lands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<ApiMutationResult>(`/lands/${id}`, { method: 'DELETE' }),

  setActive: (id: string) =>
    fetchAPI<Land>(`/lands/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: true }),
    }),
};

// ─── Circles API ──────────────────────────────────────────────────────────

// â”€â”€â”€ Purchased Items API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const purchasedItemsAPI = {
  list: (landId: string) =>
    fetchAPI<PurchasedItem[]>(`/purchased-items?landId=${encodeURIComponent(landId)}`),

  create: (data: PurchasedItemCreatePayload) =>
    fetchAPI<PurchasedItem>('/purchased-items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: PurchasedItemUpdatePayload) =>
    fetchAPI<PurchasedItem>(`/purchased-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<ApiMutationResult>(`/purchased-items/${id}`, { method: 'DELETE' }),
};

export const circlesAPI = {
  list: () => fetchAPI<CircleRecord[]>('/circles'),

  create: (data: { name: string; description?: string }) =>
    fetchAPI<CircleCreateResult>('/circles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; description?: string }) => {
    if (!id || id === 'undefined') throw new Error('Invalid World ID');
    return fetchAPI<CircleCreateResult>(`/circles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    if (!id || id === 'undefined') throw new Error('Invalid World ID');
    return fetchAPI<ApiMutationResult>(`/circles/${id}`, { method: 'DELETE' });
  },

  listMembers: (id: string) => {
    if (!id || id === 'undefined') throw new Error('Invalid World ID');
    return fetchAPI<{ members: CircleMember[] }>(`/circles/${id}/members`);
  },
};


// ─── Health Check ────────────────────────────────────────────────────

export const healthAPI = {
  check: () => fetchAPI<{ status: string; database: string; timestamp: string }>('/health'),
};
