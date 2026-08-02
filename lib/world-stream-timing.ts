export const WORLD_STREAM_KEEPALIVE_MS = 5000;
export const WORLD_STREAM_STALE_AFTER_MS = 12000;
export const WORLD_STREAM_STATUS_TICK_MS = 2000;
export const WORLD_STREAM_RECONCILE_SNAPSHOT_MS = 30000;
export const WORLD_STREAM_FALLBACK_SNAPSHOT_MS = 4500;

export function getWorldStreamSnapshotInterval(hasSubscriber: boolean) {
  return hasSubscriber ? WORLD_STREAM_RECONCILE_SNAPSHOT_MS : WORLD_STREAM_FALLBACK_SNAPSHOT_MS;
}

export function isWorldStreamFresh(lastSeenAt: number, now: number) {
  return lastSeenAt > 0 && now - lastSeenAt <= WORLD_STREAM_STALE_AFTER_MS;
}
