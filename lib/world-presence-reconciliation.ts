import type { WorldPresence, WorldPresenceDelta } from '@/types';

function timestamp(value?: string) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortPresences(presences: WorldPresence[]) {
  return presences.sort((a, b) => a.name.localeCompare(b.name));
}

export function reconcilePresenceSnapshot(
  current: WorldPresence[],
  incoming: WorldPresence[],
  snapshotServerTime: string,
) {
  const currentByUserId = new Map(current.map(presence => [presence.userId, presence]));
  const nextByUserId = new Map<string, WorldPresence>();

  incoming.forEach((presence) => {
    const existing = currentByUserId.get(presence.userId);
    nextByUserId.set(
      presence.userId,
      existing && timestamp(existing.lastSeen) > timestamp(presence.lastSeen) ? existing : presence,
    );
  });

  const snapshotTime = timestamp(snapshotServerTime);
  current.forEach((presence) => {
    if (!nextByUserId.has(presence.userId) && timestamp(presence.lastSeen) > snapshotTime) {
      nextByUserId.set(presence.userId, presence);
    }
  });

  return sortPresences(Array.from(nextByUserId.values()));
}

export function reconcilePresenceDelta(current: WorldPresence[], delta: WorldPresenceDelta) {
  if (delta.removedUserId) {
    const existing = current.find(presence => presence.userId === delta.removedUserId);
    if (existing && timestamp(existing.lastSeen) > timestamp(delta.serverTime)) return current;
    return current.filter(presence => presence.userId !== delta.removedUserId);
  }

  if (!delta.presence) return current;
  const existing = current.find(presence => presence.userId === delta.presence?.userId);
  if (existing && timestamp(existing.lastSeen) > timestamp(delta.presence.lastSeen)) return current;

  return sortPresences([
    delta.presence,
    ...current.filter(presence => presence.userId !== delta.presence?.userId),
  ]);
}
