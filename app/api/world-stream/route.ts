import { NextRequest } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { getErrorMessage } from '@/lib/errors';
import { createRedisSubscriber, redis } from '@/lib/redis';
import { filterWorldPresencesByInterest, getActiveWorldEvent, getActiveWorldGuildForUser, getActiveWorldPartyForUser, getWorldActionById, getWorldChatMessageById, getWorldPlayerStateForUser, getWorldPresences, getWorldRelationshipsForUser, getWorldRequestsForUser, getWorldSnapshot, getWorldVoiceRoomsForUser, presenceUserKey, PRESENCE_ACTIVE_MS, worldUpdateChannelKey } from '@/lib/world-state';
import { getWorldVoiceSignalsForUser } from '@/lib/world-voice-signals';
import { cleanWorldMapKey } from '@/lib/world-location';
import type { WorldActionDelta, WorldChatDelta, WorldPresence, WorldPresenceDelta, WorldSocialStateDelta, WorldSocialStateDeltaKind, WorldVoiceDelta, WorldVoiceSignalDelta } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SNAPSHOT_INTERVAL_MS = 1500;
const KEEPALIVE_INTERVAL_MS = 15000;
const UPDATE_DEBOUNCE_MS = 120;
const SOCIAL_STATE_KINDS = new Set<WorldSocialStateDeltaKind>([
  'event',
  'party',
  'guild',
  'request',
  'relationship',
  'inventory',
  'achievement',
]);

function parseLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(1, parsed)) : fallback;
}

function parseOptionalNumber(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

function sseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function sseRetry(milliseconds: number) {
  return `retry: ${milliseconds}\n\n`;
}

function parseWorldUpdateMessage(message: string) {
  try {
    return JSON.parse(message) as {
      kind?: string;
      metadata?: Record<string, unknown>;
      serverTime?: string;
    };
  } catch {
    return null;
  }
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isSameWorldScope(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function getMetadataInterest(metadata: Record<string, unknown> | undefined): WorldPresenceDelta['interest'] | undefined {
  const metadataLandId = getMetadataString(metadata, 'currentLandId') || undefined;
  const metadataZone = getMetadataString(metadata, 'currentZone') || undefined;

  return metadataLandId || metadataZone
    ? {
      ...(metadataLandId ? { currentLandId: metadataLandId } : {}),
      ...(metadataZone ? { currentZone: metadataZone } : {}),
    }
    : undefined;
}

function isSocialStateKind(kind: string | undefined): kind is WorldSocialStateDeltaKind {
  return Boolean(kind && SOCIAL_STATE_KINDS.has(kind as WorldSocialStateDeltaKind));
}

export async function GET(request: NextRequest) {
  const access = await requireConfigAccess(request);
  if (isConfigAccessDenied(access)) return access.response;

  const { searchParams } = new URL(request.url);
  const presenceLimit = parseLimit(searchParams.get('presenceLimit'), 22, 48);
  const actionLimit = parseLimit(searchParams.get('actionLimit') || searchParams.get('limit'), 12, 40);
  const chatLimit = parseLimit(searchParams.get('chatLimit'), 18, 40);
  const currentLandId = cleanWorldMapKey(searchParams.get('currentLandId'));
  const currentZone = searchParams.get('currentZone')?.trim().slice(0, 64) || undefined;
  const x = parseOptionalNumber(searchParams.get('x'), -28, 28);
  const z = parseOptionalNumber(searchParams.get('z'), -28, 28);
  const radius = parseOptionalNumber(searchParams.get('radius'), 4, 64);
  const center = x !== undefined && z !== undefined ? { x, y: 0, z } : undefined;
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let isSending = false;
      let snapshotTimer: ReturnType<typeof setInterval> | null = null;
      let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
      let updateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
      const voiceSignalCursors = new Map<string, number>();
      const updateChannel = worldUpdateChannelKey(access.configId);
      const subscriber = createRedisSubscriber();

      const close = () => {
        if (closed) return;
        closed = true;
        if (snapshotTimer) clearInterval(snapshotTimer);
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        if (updateDebounceTimer) clearTimeout(updateDebounceTimer);
        subscriber?.disconnect();
        try {
          controller.close();
        } catch {
          // The client may already have closed the stream.
        }
      };

      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };

      const sendSnapshot = async () => {
        if (closed || isSending) return;
        isSending = true;
        try {
          const snapshot = await getWorldSnapshot(access.configId, {
            presenceLimit,
            actionLimit,
            chatLimit,
            viewerUserId: access.userId,
            currentLandId,
            currentZone,
            center,
            radius,
          });
          write(sseEvent('snapshot', snapshot));
        } catch (err) {
          write(sseEvent('stream-error', {
            message: getErrorMessage(err),
            serverTime: new Date().toISOString(),
          }));
        } finally {
          isSending = false;
        }
      };

      const requestSnapshot = () => {
        if (closed || updateDebounceTimer) return;
        updateDebounceTimer = setTimeout(() => {
          updateDebounceTimer = null;
          void sendSnapshot();
        }, UPDATE_DEBOUNCE_MS);
      };

      const sendPresenceDelta = async (userId: string, serverTime?: string, metadata?: Record<string, unknown>) => {
        if (closed) return;
        try {
          const record = await redis.get(presenceUserKey(access.configId, userId));
          const timestamp = serverTime || new Date().toISOString();
          const updateInterest = getMetadataInterest(metadata);
          if (!record) {
            write(sseEvent('presence', {
              removedUserId: userId,
              ...(updateInterest ? { interest: updateInterest } : {}),
              serverTime: timestamp,
            } satisfies WorldPresenceDelta));
            return;
          }

          const presence = JSON.parse(record) as WorldPresence;
          const lastSeen = new Date(presence.lastSeen).getTime();
          const isActive = Number.isFinite(lastSeen) && Date.now() - lastSeen <= PRESENCE_ACTIVE_MS;
          const isVisible = isActive && filterWorldPresencesByInterest([presence], {
            currentLandId,
            currentZone,
            center,
            radius,
            viewerUserId: access.userId,
          }).length > 0;

          write(sseEvent('presence', {
            ...(isVisible ? { presence } : { removedUserId: userId }),
            ...(!isVisible && updateInterest ? { interest: updateInterest } : {}),
            serverTime: timestamp,
          } satisfies WorldPresenceDelta));
        } catch (err) {
          write(sseEvent('stream-error', {
            message: `Presence delta unavailable: ${getErrorMessage(err)}`,
            serverTime: new Date().toISOString(),
          }));
          requestSnapshot();
        }
      };

      const getVisibleUserIds = async () => (
        filterWorldPresencesByInterest(await getWorldPresences(access.configId, 48), {
          currentLandId,
          currentZone,
          center,
          radius,
          viewerUserId: access.userId,
        }).map(presence => presence.userId)
      );

      const isUpdateInStreamInterest = (metadata: Record<string, unknown> | undefined) => {
        const metadataLandId = getMetadataString(metadata, 'currentLandId');
        if (currentLandId && metadataLandId && !isSameWorldScope(metadataLandId, currentLandId)) return false;

        const metadataZone = getMetadataString(metadata, 'currentZone');
        if (!currentLandId && currentZone && metadataZone && !isSameWorldScope(metadataZone, currentZone)) return false;

        return true;
      };

      const sendActionDelta = async (actionId: string, serverTime?: string) => {
        if (closed) return;
        try {
          const action = await getWorldActionById(access.configId, actionId, {
            currentLandId,
            currentZone,
            center,
            radius,
            viewerUserId: access.userId,
            visibleUserIds: await getVisibleUserIds(),
          });
          write(sseEvent('action', {
            ...(action ? { action } : { actionId }),
            serverTime: serverTime || new Date().toISOString(),
          } satisfies WorldActionDelta));
        } catch (err) {
          write(sseEvent('stream-error', {
            message: `Action delta unavailable: ${getErrorMessage(err)}`,
            serverTime: new Date().toISOString(),
          }));
          requestSnapshot();
        }
      };

      const sendChatDelta = async (messageId: string, serverTime?: string) => {
        if (closed) return;
        try {
          const message = await getWorldChatMessageById(access.configId, messageId, access.userId, {
            currentLandId,
            currentZone,
            center,
            radius,
            viewerUserId: access.userId,
            visibleUserIds: await getVisibleUserIds(),
          });
          write(sseEvent('chat', {
            ...(message ? { message } : { messageId }),
            serverTime: serverTime || new Date().toISOString(),
          } satisfies WorldChatDelta));
        } catch (err) {
          write(sseEvent('stream-error', {
            message: `Chat delta unavailable: ${getErrorMessage(err)}`,
            serverTime: new Date().toISOString(),
          }));
          requestSnapshot();
        }
      };

      const sendVoiceDelta = async (metadata: Record<string, unknown> | undefined, serverTime?: string) => {
        if (closed) return;
        try {
          const voice = await getWorldVoiceRoomsForUser(access.configId, access.userId, {
            currentLandId,
            currentZone,
            center,
            radius,
          });
          write(sseEvent('voice', {
            voiceRooms: voice.rooms,
            myVoiceRooms: voice.myRooms,
            roomId: getMetadataString(metadata, 'roomId'),
            userId: getMetadataString(metadata, 'userId'),
            action: getMetadataString(metadata, 'action'),
            serverTime: serverTime || new Date().toISOString(),
          } satisfies WorldVoiceDelta));
        } catch (err) {
          write(sseEvent('stream-error', {
            message: `Voice delta unavailable: ${getErrorMessage(err)}`,
            serverTime: new Date().toISOString(),
          }));
          requestSnapshot();
        }
      };

      const sendVoiceSignalDelta = async (roomId: string, serverTime?: string) => {
        if (closed) return;
        try {
          const response = await getWorldVoiceSignalsForUser(
            access.configId,
            roomId,
            access.userId,
            voiceSignalCursors.get(roomId) || 0,
            40
          );
          voiceSignalCursors.set(roomId, response.cursor);
          if (response.signals.length === 0) return;

          write(sseEvent('voice-signal', {
            roomId,
            signals: response.signals,
            cursor: response.cursor,
            serverTime: serverTime || new Date().toISOString(),
          } satisfies WorldVoiceSignalDelta));
        } catch (err) {
          write(sseEvent('stream-error', {
            message: `Voice signal delta unavailable: ${getErrorMessage(err)}`,
            serverTime: new Date().toISOString(),
          }));
        }
      };

      const sendSocialStateDelta = async (kind: WorldSocialStateDeltaKind, serverTime?: string) => {
        if (closed) return;
        try {
          const timestamp = serverTime || new Date().toISOString();
          const delta: WorldSocialStateDelta = { kind, serverTime: timestamp };

          if (kind === 'event') {
            delta.event = await getActiveWorldEvent(access.configId, { currentLandId });
          }

          if (kind === 'party') {
            delta.party = await getActiveWorldPartyForUser(access.configId, access.userId, { currentLandId });
          }

          if (kind === 'guild') {
            delta.guild = await getActiveWorldGuildForUser(access.configId, access.userId, { currentLandId });
          }

          if (kind === 'relationship') {
            delta.relationships = await getWorldRelationshipsForUser(access.configId, access.userId);
          }

          if (kind === 'request') {
            delta.requests = await getWorldRequestsForUser(access.configId, access.userId, 24, { currentLandId });
          }

          if (kind === 'inventory' || kind === 'achievement') {
            const playerState = await getWorldPlayerStateForUser(access.configId, access.userId);
            delta.inventory = playerState.inventory;
            delta.marketCatalog = playerState.marketCatalog;
            delta.marketStats = playerState.marketStats;
            delta.achievements = playerState.achievements;
            delta.characterEquipment = playerState.characterEquipment;
            delta.characterTitle = playerState.characterTitle;
          }

          write(sseEvent('social-state', delta));
        } catch (err) {
          write(sseEvent('stream-error', {
            message: `Social state delta unavailable: ${getErrorMessage(err)}`,
            serverTime: new Date().toISOString(),
          }));
          requestSnapshot();
        }
      };

      write(sseRetry(2000));
      write(sseEvent('ready', {
        configId: access.configId,
        interest: {
          ...(currentLandId ? { currentLandId } : {}),
          ...(currentZone ? { currentZone } : {}),
          ...(center ? { center } : {}),
          ...(radius ? { radius } : {}),
        },
        serverTime: new Date().toISOString(),
      }));
      void sendSnapshot();
      if (subscriber) {
        subscriber.on('message', (channel, message) => {
          if (channel !== updateChannel) return;
          const update = parseWorldUpdateMessage(message);
          const updatedUserId = getMetadataString(update?.metadata, 'userId');
          if (update?.kind === 'presence' && updatedUserId) {
            if (!isUpdateInStreamInterest(update.metadata)) return;
            void sendPresenceDelta(updatedUserId, update.serverTime, update.metadata);
            return;
          }
          const actionId = getMetadataString(update?.metadata, 'actionId');
          if (update?.kind === 'action' && actionId) {
            void sendActionDelta(actionId, update.serverTime);
            return;
          }
          const messageId = getMetadataString(update?.metadata, 'messageId');
          if (update?.kind === 'chat' && messageId) {
            void sendChatDelta(messageId, update.serverTime);
            return;
          }
          const voiceAction = getMetadataString(update?.metadata, 'action');
          const voiceRoomId = getMetadataString(update?.metadata, 'roomId');
          if (update?.kind === 'voice' && voiceAction === 'signal' && voiceRoomId) {
            void sendVoiceSignalDelta(voiceRoomId, update.serverTime);
            return;
          }
          if (update?.kind === 'voice') {
            void sendVoiceDelta(update.metadata, update.serverTime);
            return;
          }
          if (isSocialStateKind(update?.kind)) {
            void sendSocialStateDelta(update.kind, update.serverTime);
            return;
          }
          requestSnapshot();
        });
        subscriber.subscribe(updateChannel).catch((err) => {
          write(sseEvent('stream-error', {
            message: `World update subscription unavailable: ${getErrorMessage(err)}`,
            serverTime: new Date().toISOString(),
          }));
        });
      }
      snapshotTimer = setInterval(() => void sendSnapshot(), SNAPSHOT_INTERVAL_MS);
      keepaliveTimer = setInterval(() => write(sseEvent('ping', {
        serverTime: new Date().toISOString(),
      })), KEEPALIVE_INTERVAL_MS);
      request.signal.addEventListener('abort', close, { once: true });
      cleanup = close;
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
