/**
 * Narinyland API Client
 * Connects the frontend to the Express + Prisma backend
 */


// Use VITE_API_URL if defined, otherwise default to relative '/api' path
// This allows the Vite proxy (in dev) and Vercel rewrites (in prod) to handle routing
const API_BASE = (import.meta as any).env.VITE_API_URL || '/api';

// ─── Helper ──────────────────────────────────────────────────────────

async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

// ─── Config API ──────────────────────────────────────────────────────

export const configAPI = {
  get: () => fetchAPI<any>('/config'),
  
  update: (data: any) =>
    fetchAPI<any>('/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ─── Memories API ────────────────────────────────────────────────────

export const memoriesAPI = {
  list: (privacy?: string) =>
    fetchAPI<any[]>(`/memories${privacy && privacy !== 'all' ? `?privacy=${privacy}` : ''}`),

  create: (data: { url?: string; privacy?: string; caption?: string; file?: File }) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('image', data.file);
      if (data.privacy) formData.append('privacy', data.privacy);
      if (data.caption) formData.append('caption', data.caption);
      return fetchFormData<any>('/memories', formData);
    }
    return fetchAPI<any>('/memories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: any) =>
    fetchAPI<any>(`/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<any>(`/memories/${id}`, { method: 'DELETE' }),

  reorder: (orderedIds: string[]) =>
    fetchAPI<any>('/memories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }),
};

// ─── Timeline API ────────────────────────────────────────────────────

export const timelineAPI = {
  list: () => fetchAPI<any[]>('/timeline'),

  create: (data: { text: string; type?: string; location?: string; timestamp?: string; files?: File[] }) => {
    if (data.files && data.files.length > 0) {
      const formData = new FormData();
      data.files.forEach(file => {
        formData.append('media', file);
      });
      formData.append('text', data.text);
      if (data.type) formData.append('type', data.type);
      if (data.location) formData.append('location', data.location);
      if (data.timestamp) formData.append('timestamp', data.timestamp);
      return fetchFormData<any>('/timeline', formData);
    }
    return fetchAPI<any>('/timeline', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { text?: string; type?: string; location?: string; timestamp?: string; files?: File[] }) => {
    if (data.files && data.files.length > 0) {
      const formData = new FormData();
      data.files.forEach(file => {
        formData.append('media', file);
      });
      if (data.text !== undefined) formData.append('text', data.text);
      if (data.type !== undefined) formData.append('type', data.type);
      if (data.location !== undefined) formData.append('location', data.location);
      if (data.timestamp !== undefined) formData.append('timestamp', data.timestamp);
      return fetchFormData<any>(`/timeline/${id}`, formData);
    }
    return fetchAPI<any>(`/timeline/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) =>
    fetchAPI<any>(`/timeline/${id}`, { method: 'DELETE' }),
};

// ─── Letters API ─────────────────────────────────────────────────────

export const lettersAPI = {
  list: () => fetchAPI<any[]>('/letters'),

  create: (data: { fromId: string; content: string; unlockDate: string; file?: File }) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('media', data.file);
      formData.append('fromId', data.fromId);
      formData.append('content', data.content);
      formData.append('unlockDate', data.unlockDate);
      return fetchFormData<any>('/letters', formData);
    }
    return fetchAPI<any>('/letters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  markAsRead: (id: string) =>
    fetchAPI<any>(`/letters/${id}/read`, { method: 'PUT' }),

  delete: (id: string) =>
    fetchAPI<any>(`/letters/${id}`, { method: 'DELETE' }),
};

// ─── Coupons API ─────────────────────────────────────────────────────

export const couponsAPI = {
  list: () => fetchAPI<any[]>('/coupons'),

  create: (data: { title: string; emoji: string; desc: string; color: string; forPartner: string; points: number }) => {
    return fetchAPI<any>('/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  redeem: (id: string) => fetchAPI<any>(`/coupons/${id}/redeem`, { method: 'PUT' }),

  delete: (id: string) => fetchAPI<any>(`/coupons/${id}`, { method: 'DELETE' }),
};

// ─── Stats API ───────────────────────────────────────────────────────

export const statsAPI = {
  get: () => fetchAPI<any>('/stats'),

  addXP: (amount: number, partnerId?: string) =>
    fetchAPI<any>('/stats/add-xp', {
      method: 'PUT',
      body: JSON.stringify({ amount, partnerId }),
    }),

  completeQuest: (questText: string, completedBy?: string) =>
    fetchAPI<any>('/stats/quest-complete', {
      method: 'POST',
      body: JSON.stringify({ questText, completedBy }),
    }),

  getQuests: () => fetchAPI<any[]>('/stats/quests'),

  addLeaf: () => fetchAPI<any>('/stats/add-leaf', { method: 'POST' }),

  addPoints: (amount: number) => 
    fetchAPI<any>('/stats/add-points', { 
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
    return fetchFormData<any>('/upload', formData);
  },

  delete: (key: string) =>
    fetchAPI<any>('/upload', {
      method: 'DELETE',
      body: JSON.stringify({ key }),
    }),

  getPresignedUrl: (key: string, expires?: number) =>
    fetchAPI<{ url: string }>(`/upload/presign?key=${encodeURIComponent(key)}${expires ? `&expires=${expires}` : ''}`),

  listFiles: (folder: string) =>
    fetchAPI<string[]>(`/upload/list?folder=${encodeURIComponent(folder)}`),
};

// ─── Health Check ────────────────────────────────────────────────────

export const healthAPI = {
  check: () => fetchAPI<{ status: string; database: string; timestamp: string }>('/health'),
};
