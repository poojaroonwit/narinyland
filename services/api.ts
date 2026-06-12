/**
 * Narinyland API Client
 * Connects the frontend to the Express + Prisma backend
 */

import { getActiveCircleId } from '@/lib/circle-store';
import type {
  AppConfig,
  CharacterAppearance,
  CharacterEquipment,
  CharacterProfile,
  Interaction,
  Land,
  LoveLetterMessage,
  LoveStats,
  MemoryItem,
  PurchasedItem,
  WorldActivityFeed,
  WorldAchievement,
  WorldAchievementBadge,
  WorldActionType,
  WorldChatChannel,
  WorldChatMessage,
  WorldEvent,
  WorldGuild,
  WorldInventoryCatalogItem,
  WorldInventoryItem,
  WorldInventorySlot,
  WorldParty,
  WorldPresence,
  WorldPresenceIntent,
  WorldPresenceVector,
  WorldRelationship,
  WorldSnapshot,
  WorldSocialAction,
  WorldVoiceKind,
  WorldVoiceRoom,
  WorldVoiceSignalKind,
  WorldVoiceSignalMessage,
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
  id?: string;
  circleId?: string;
  name?: string;
  description?: string;
  role?: string;
  creatorLinked?: boolean;
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
type PresenceHeartbeatPayload = {
  name?: string;
  avatar?: string;
  position: WorldPresenceVector;
  velocity?: WorldPresenceVector;
  heading?: number;
  moving?: boolean;
  animation: string;
  activity: string;
  status: string;
  guild?: string;
  guildId?: string;
  party?: string;
  eventId?: string;
  eventName?: string;
  title?: string;
  emote?: string;
  modelUrl?: string | null;
  appearance?: CharacterAppearance;
  equipment?: CharacterEquipment;
  cosmetics?: Record<string, unknown>;
  achievements?: WorldAchievementBadge[];
  voiceRoomId?: string;
  voiceRoomName?: string;
  isVoiceMuted?: boolean;
  intent?: WorldPresenceIntent;
  currentLandId?: string | null;
  currentZone: string;
};
type CharacterProfileUpdatePayload = Partial<Pick<
  CharacterProfile,
  'displayName' | 'title' | 'status' | 'activity' | 'emote' | 'modelUrl' | 'appearance' | 'equipment' | 'cosmetics' | 'lastPosition' | 'lastZone' | 'lastMapPositions'
>>;
type WorldActionCreatePayload = {
  type: WorldActionType;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};
type WorldChatCreatePayload = {
  body: string;
  channel?: WorldChatChannel;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
  metadata?: Record<string, unknown>;
};
type WorldPartyMutationPayload = {
  action: 'ensure' | 'invite' | 'join' | 'leave';
  partyId?: string;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
};
type WorldGuildMutationPayload = {
  action: 'ensure' | 'invite' | 'join' | 'leave';
  guildId?: string;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
};
type WorldEventMutationPayload = {
  action: 'ensure' | 'join' | 'leave' | 'rally';
  eventId?: string;
  currentLandId?: string;
  currentZone?: string;
  district?: string;
};
type WorldRelationshipMutationPayload = {
  action: 'follow' | 'unfollow' | 'add_friend' | 'remove_friend';
  targetUserId: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
  metadata?: Record<string, unknown>;
};
type WorldRequestResponsePayload = {
  actionId: string;
  response: 'accept' | 'decline' | 'complete' | 'cancel' | 'ready' | 'unready';
  currentLandId?: string;
  currentZone?: string;
};
type WorldInventoryMutationPayload = {
  action: 'equip' | 'unequip';
  slot: WorldInventorySlot;
  itemKey?: string;
};
type WorldInventoryPurchasePayload = {
  action: 'purchase';
  itemKey: string;
};
type WorldInventoryResponse = {
  profile: CharacterProfile;
  equipment: CharacterEquipment;
  inventory: WorldInventoryItem[];
  catalog: WorldInventoryCatalogItem[];
  stats: LoveStats;
};
type WorldAchievementResponse = {
  title: string;
  achievements: WorldAchievement[];
};
type WorldAchievementMutationPayload = {
  action: 'equip_title';
  achievementKey: string;
};
type WorldVoiceMutationPayload = {
  action: 'join' | 'leave' | 'mute';
  kind?: WorldVoiceKind;
  roomId?: string;
  targetUserId?: string;
  targetName?: string;
  currentLandId?: string;
  currentZone?: string;
  x?: number;
  z?: number;
  isMuted?: boolean;
};
type WorldVoiceResponse = {
  rooms: WorldVoiceRoom[];
  myRooms: WorldVoiceRoom[];
  room?: WorldVoiceRoom | null;
};
type WorldVoiceSignalPayload = {
  roomId: string;
  toUserId?: string;
  kind: WorldVoiceSignalKind;
  payload?: Record<string, unknown>;
};
type WorldVoiceSignalResponse = {
  signals: WorldVoiceSignalMessage[];
  cursor: number;
};
type WorldInterestQuery = {
  currentLandId?: string;
  currentZone?: string;
  x?: number;
  z?: number;
  radius?: number;
};
type WorldLocationContext = {
  eventId?: string;
  currentLandId?: string;
  currentZone?: string;
  district?: string;
};
type PresenceLeaveOptions = {
  circleId?: string | null;
  keepalive?: boolean;
  currentLandId?: string;
  currentZone?: string;
};

function toWorldLocationContext(input?: string | WorldLocationContext) {
  return typeof input === 'string' ? { currentZone: input } : input || {};
}

function toWorldInterestQuery(options: WorldInterestQuery = {}) {
  const params = new URLSearchParams();
  if (options.currentLandId) params.set('currentLandId', options.currentLandId);
  if (options.currentZone) params.set('currentZone', options.currentZone);
  if (typeof options.x === 'number') params.set('x', String(options.x));
  if (typeof options.z === 'number') params.set('z', String(options.z));
  if (typeof options.radius === 'number') params.set('radius', String(options.radius));
  return params;
}

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

export const presenceAPI = {
  list: (options: WorldInterestQuery = {}) => {
    const params = toWorldInterestQuery(options);
    const query = params.toString();
    return fetchAPI<{ presences: WorldPresence[]; interest?: WorldSnapshot['interest'] }>(`/presence${query ? `?${query}` : ''}`);
  },

  heartbeat: (data: PresenceHeartbeatPayload) =>
    fetchAPI<{ presence: WorldPresence }>('/presence', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  leave: (options: PresenceLeaveOptions = {}) => {
    const circleId = options.circleId ?? getActiveCircleId();
    const params = toWorldInterestQuery({
      currentLandId: options.currentLandId,
      currentZone: options.currentZone,
    });
    const query = params.toString();
    return fetchAPI<ApiMutationResult>(`/presence${query ? `?${query}` : ''}`, {
      method: 'DELETE',
      keepalive: options.keepalive,
      headers: circleId ? { 'X-Circle-Id': circleId } : undefined,
    });
  },
};

export const characterAPI = {
  get: () => fetchAPI<{ profile: CharacterProfile }>('/character'),

  update: (data: CharacterProfileUpdatePayload) =>
    fetchAPI<{ profile: CharacterProfile }>('/character', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const worldAchievementsAPI = {
  get: () => fetchAPI<WorldAchievementResponse>('/world-achievements'),

  equipTitle: (achievementKey: string) =>
    fetchAPI<WorldAchievementResponse>('/world-achievements', {
      method: 'POST',
      body: JSON.stringify({ action: 'equip_title', achievementKey } satisfies WorldAchievementMutationPayload),
    }),
};

export const worldInventoryAPI = {
  get: () => fetchAPI<WorldInventoryResponse>('/world-inventory'),

  equip: (slot: WorldInventorySlot, itemKey: string) =>
    fetchAPI<WorldInventoryResponse>('/world-inventory', {
      method: 'POST',
      body: JSON.stringify({ action: 'equip', slot, itemKey } satisfies WorldInventoryMutationPayload),
    }),

  unequip: (slot: WorldInventorySlot) =>
    fetchAPI<WorldInventoryResponse>('/world-inventory', {
      method: 'POST',
      body: JSON.stringify({ action: 'unequip', slot } satisfies WorldInventoryMutationPayload),
    }),

  purchase: (itemKey: string) =>
    fetchAPI<WorldInventoryResponse>('/world-inventory', {
      method: 'POST',
      body: JSON.stringify({ action: 'purchase', itemKey } satisfies WorldInventoryPurchasePayload),
    }),
};

export const worldActionsAPI = {
  list: (limit = 12, options: WorldInterestQuery = {}) => {
    const params = toWorldInterestQuery(options);
    params.set('limit', String(limit));
    return fetchAPI<{ actions: WorldSocialAction[] }>(`/world-actions?${params.toString()}`);
  },

  create: (data: WorldActionCreatePayload) =>
    fetchAPI<{ action: WorldSocialAction }>('/world-actions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const worldActivityAPI = {
  get: (userId: string, limit = 12, options: WorldInterestQuery = {}) => {
    const params = toWorldInterestQuery(options);
    params.set('userId', userId);
    params.set('limit', String(limit));
    return fetchAPI<{ feed: WorldActivityFeed }>(`/world-activity?${params.toString()}`);
  },
};

export const worldRelationshipsAPI = {
  list: () => fetchAPI<{ relationships: WorldRelationship[] }>('/world-relationships'),

  follow: (data: Omit<WorldRelationshipMutationPayload, 'action'>) =>
    fetchAPI<{ relationship: WorldRelationship; relationships: WorldRelationship[] }>('/world-relationships', {
      method: 'POST',
      body: JSON.stringify({ action: 'follow', ...data } satisfies WorldRelationshipMutationPayload),
    }),

  unfollow: (data: Omit<WorldRelationshipMutationPayload, 'action'>) =>
    fetchAPI<{ relationships: WorldRelationship[] }>('/world-relationships', {
      method: 'POST',
      body: JSON.stringify({ action: 'unfollow', ...data } satisfies WorldRelationshipMutationPayload),
    }),

  addFriend: (data: Omit<WorldRelationshipMutationPayload, 'action'>) =>
    fetchAPI<{ relationship: WorldRelationship; relationships: WorldRelationship[] }>('/world-relationships', {
      method: 'POST',
      body: JSON.stringify({ action: 'add_friend', ...data } satisfies WorldRelationshipMutationPayload),
    }),

  removeFriend: (data: Omit<WorldRelationshipMutationPayload, 'action'>) =>
    fetchAPI<{ relationships: WorldRelationship[] }>('/world-relationships', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove_friend', ...data } satisfies WorldRelationshipMutationPayload),
    }),
};

export const worldRequestsAPI = {
  list: (limit = 24, options: Pick<WorldInterestQuery, 'currentLandId'> = {}) => {
    const params = toWorldInterestQuery(options);
    params.set('limit', String(limit));
    return fetchAPI<{ requests: WorldSocialAction[] }>(`/world-requests?${params.toString()}`);
  },

  respond: (data: WorldRequestResponsePayload) =>
    fetchAPI<{ request: WorldSocialAction; requests: WorldSocialAction[] }>('/world-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const worldVoiceAPI = {
  get: (options: { currentLandId?: string; currentZone?: string; x?: number; z?: number } = {}) => {
    const params = new URLSearchParams();
    if (options.currentLandId) params.set('currentLandId', options.currentLandId);
    if (options.currentZone) params.set('currentZone', options.currentZone);
    if (Number.isFinite(options.x)) params.set('x', String(options.x));
    if (Number.isFinite(options.z)) params.set('z', String(options.z));
    const query = params.toString();
    return fetchAPI<WorldVoiceResponse>(`/world-voice${query ? `?${query}` : ''}`);
  },

  join: (data: { kind: WorldVoiceKind; targetUserId?: string; targetName?: string; currentLandId?: string; currentZone?: string; x?: number; z?: number; isMuted?: boolean }) =>
    fetchAPI<WorldVoiceResponse>('/world-voice', {
      method: 'POST',
      body: JSON.stringify({ action: 'join', ...data } satisfies WorldVoiceMutationPayload),
    }),

  leave: (roomId?: string, options: { currentLandId?: string; currentZone?: string; x?: number; z?: number } = {}) =>
    fetchAPI<WorldVoiceResponse>('/world-voice', {
      method: 'POST',
      body: JSON.stringify({ action: 'leave', roomId, ...options } satisfies WorldVoiceMutationPayload),
    }),

  mute: (roomId: string, isMuted: boolean, options: { currentLandId?: string; currentZone?: string; x?: number; z?: number } = {}) =>
    fetchAPI<WorldVoiceResponse>('/world-voice', {
      method: 'POST',
      body: JSON.stringify({ action: 'mute', roomId, isMuted, ...options } satisfies WorldVoiceMutationPayload),
    }),

  signals: (roomId: string, since = 0, limit = 40) =>
    fetchAPI<WorldVoiceSignalResponse>(
      `/world-voice/signal?roomId=${encodeURIComponent(roomId)}&since=${encodeURIComponent(String(since))}&limit=${encodeURIComponent(String(limit))}`
    ),

  sendSignal: (data: WorldVoiceSignalPayload) =>
    fetchAPI<ApiMutationResult & { count: number; cursor: number }>('/world-voice/signal', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const worldChatAPI = {
  list: (limit = 18, options: WorldInterestQuery = {}) => {
    const params = toWorldInterestQuery(options);
    params.set('limit', String(limit));
    return fetchAPI<{ messages: WorldChatMessage[] }>(`/world-chat?${params.toString()}`);
  },

  create: (data: WorldChatCreatePayload) =>
    fetchAPI<{ message: WorldChatMessage }>('/world-chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const worldPartyAPI = {
  get: (options: Pick<WorldInterestQuery, 'currentLandId'> = {}) => {
    const params = toWorldInterestQuery(options);
    const query = params.toString();
    return fetchAPI<{ party: WorldParty | null }>(`/world-party${query ? `?${query}` : ''}`);
  },

  ensure: (context?: string | WorldLocationContext) =>
    fetchAPI<{ party: WorldParty }>('/world-party', {
      method: 'POST',
      body: JSON.stringify({ action: 'ensure', ...toWorldLocationContext(context) } satisfies WorldPartyMutationPayload),
    }),

  invite: (data: { targetUserId: string; targetName?: string; currentLandId?: string; currentZone?: string }) =>
    fetchAPI<{ party: WorldParty }>('/world-party', {
      method: 'POST',
      body: JSON.stringify({ action: 'invite', ...data } satisfies WorldPartyMutationPayload),
    }),

  join: (data: { partyId: string; currentLandId?: string; currentZone?: string }) =>
    fetchAPI<{ party: WorldParty }>('/world-party', {
      method: 'POST',
      body: JSON.stringify({ action: 'join', ...data } satisfies WorldPartyMutationPayload),
    }),

  leave: (context?: string | WorldLocationContext) =>
    fetchAPI<{ party: WorldParty | null }>('/world-party', {
      method: 'POST',
      body: JSON.stringify({ action: 'leave', ...toWorldLocationContext(context) } satisfies WorldPartyMutationPayload),
    }),
};

export const worldGuildAPI = {
  get: (options: Pick<WorldInterestQuery, 'currentLandId'> = {}) => {
    const params = toWorldInterestQuery(options);
    const query = params.toString();
    return fetchAPI<{ guild: WorldGuild | null }>(`/world-guild${query ? `?${query}` : ''}`);
  },

  ensure: (context?: string | WorldLocationContext) =>
    fetchAPI<{ guild: WorldGuild }>('/world-guild', {
      method: 'POST',
      body: JSON.stringify({ action: 'ensure', ...toWorldLocationContext(context) } satisfies WorldGuildMutationPayload),
    }),

  invite: (data: { targetUserId: string; targetName?: string; currentLandId?: string; currentZone?: string }) =>
    fetchAPI<{ guild: WorldGuild }>('/world-guild', {
      method: 'POST',
      body: JSON.stringify({ action: 'invite', ...data } satisfies WorldGuildMutationPayload),
    }),

  join: (data: { guildId: string; currentLandId?: string; currentZone?: string }) =>
    fetchAPI<{ guild: WorldGuild }>('/world-guild', {
      method: 'POST',
      body: JSON.stringify({ action: 'join', ...data } satisfies WorldGuildMutationPayload),
    }),

  leave: (context?: string | WorldLocationContext) =>
    fetchAPI<{ guild: WorldGuild | null }>('/world-guild', {
      method: 'POST',
      body: JSON.stringify({ action: 'leave', ...toWorldLocationContext(context) } satisfies WorldGuildMutationPayload),
    }),
};

export const worldEventsAPI = {
  get: (options: WorldInterestQuery = {}) => {
    const params = toWorldInterestQuery(options);
    const query = params.toString();
    return fetchAPI<{ event: WorldEvent | null }>(`/world-events${query ? `?${query}` : ''}`);
  },

  ensure: (context?: string | WorldLocationContext) =>
    fetchAPI<{ event: WorldEvent }>('/world-events', {
      method: 'POST',
      body: JSON.stringify({ action: 'ensure', ...toWorldLocationContext(context) } satisfies WorldEventMutationPayload),
    }),

  join: (context?: string | WorldLocationContext) =>
    fetchAPI<{ event: WorldEvent }>('/world-events', {
      method: 'POST',
      body: JSON.stringify({ action: 'join', ...toWorldLocationContext(context) } satisfies WorldEventMutationPayload),
    }),

  rally: (context?: string | WorldLocationContext) =>
    fetchAPI<{ event: WorldEvent }>('/world-events', {
      method: 'POST',
      body: JSON.stringify({ action: 'rally', ...toWorldLocationContext(context) } satisfies WorldEventMutationPayload),
    }),

  leave: (context?: string | WorldLocationContext) =>
    fetchAPI<{ event: WorldEvent | null }>('/world-events', {
      method: 'POST',
      body: JSON.stringify({ action: 'leave', ...toWorldLocationContext(context) } satisfies WorldEventMutationPayload),
    }),
};

export const worldStreamAPI = {
  url: (options: WorldInterestQuery & { presenceLimit?: number; actionLimit?: number; chatLimit?: number } = {}) => {
    const params = toWorldInterestQuery(options);
    const circleId = getActiveCircleId();
    params.set('presenceLimit', String(options.presenceLimit || 22));
    params.set('actionLimit', String(options.actionLimit || 12));
    params.set('chatLimit', String(options.chatLimit || 18));
    if (circleId) params.set('circleId', circleId);
    return `${API_BASE}/world-stream?${params.toString()}`;
  },
};

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
