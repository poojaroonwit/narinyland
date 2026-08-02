import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getWorldStreamSnapshotInterval,
  isWorldStreamFresh,
  WORLD_STREAM_FALLBACK_SNAPSHOT_MS,
  WORLD_STREAM_KEEPALIVE_MS,
  WORLD_STREAM_RECONCILE_SNAPSHOT_MS,
  WORLD_STREAM_STALE_AFTER_MS,
} from '@/lib/world-stream-timing';

test('healthy pub/sub streams use sparse reconciliation snapshots', () => {
  assert.equal(getWorldStreamSnapshotInterval(true), WORLD_STREAM_RECONCILE_SNAPSHOT_MS);
  assert.equal(WORLD_STREAM_RECONCILE_SNAPSHOT_MS, 30000);
});

test('streams without Redis subscription retain a responsive snapshot fallback', () => {
  assert.equal(getWorldStreamSnapshotInterval(false), WORLD_STREAM_FALLBACK_SNAPSHOT_MS);
  assert.ok(WORLD_STREAM_FALLBACK_SNAPSHOT_MS < WORLD_STREAM_STALE_AFTER_MS);
});

test('keepalive arrives comfortably before the client stale boundary', () => {
  assert.ok(WORLD_STREAM_KEEPALIVE_MS * 2 < WORLD_STREAM_STALE_AFTER_MS);
  assert.equal(isWorldStreamFresh(1000, 1000 + WORLD_STREAM_STALE_AFTER_MS), true);
  assert.equal(isWorldStreamFresh(1000, 1001 + WORLD_STREAM_STALE_AFTER_MS), false);
  assert.equal(isWorldStreamFresh(0, 1000), false);
});
