import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reconcilePresenceDelta, reconcilePresenceSnapshot } from '@/lib/world-presence-reconciliation';
import type { WorldPresence } from '@/types';

function presence(userId: string, lastSeen: string, x: number): WorldPresence {
  return {
    userId,
    name: userId,
    position: { x, y: 0, z: 0 },
    animation: 'idle',
    activity: 'Exploring',
    status: 'online',
    currentZone: 'Commons',
    lastSeen,
  };
}

test('a delayed snapshot cannot rewind a newer movement delta', () => {
  const current = [presence('nari', '2026-08-02T10:00:02.000Z', 8)];
  const delayedSnapshot = [presence('nari', '2026-08-02T10:00:01.000Z', 3)];

  const reconciled = reconcilePresenceSnapshot(
    current,
    delayedSnapshot,
    '2026-08-02T10:00:01.500Z',
  );

  assert.equal(reconciled[0].position.x, 8);
  assert.equal(reconciled[0].lastSeen, '2026-08-02T10:00:02.000Z');
});

test('a current snapshot removes users whose presence has expired', () => {
  const current = [presence('nari', '2026-08-02T10:00:01.000Z', 3)];

  assert.deepEqual(
    reconcilePresenceSnapshot(current, [], '2026-08-02T10:00:02.000Z'),
    [],
  );
});

test('a snapshot preserves a delta that arrived after snapshot generation', () => {
  const current = [presence('nari', '2026-08-02T10:00:03.000Z', 9)];

  const reconciled = reconcilePresenceSnapshot(
    current,
    [],
    '2026-08-02T10:00:02.000Z',
  );

  assert.equal(reconciled[0].position.x, 9);
});

test('a stale leave event cannot erase a user who already rejoined', () => {
  const current = [presence('nari', '2026-08-02T10:00:04.000Z', 4)];

  const reconciled = reconcilePresenceDelta(current, {
    removedUserId: 'nari',
    serverTime: '2026-08-02T10:00:03.000Z',
  });

  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0].position.x, 4);
});

test('newer deltas replace older positions and retain stable name ordering', () => {
  const current = [
    presence('zara', '2026-08-02T10:00:01.000Z', 1),
    presence('nari', '2026-08-02T10:00:01.000Z', 2),
  ];

  const reconciled = reconcilePresenceDelta(current, {
    presence: presence('nari', '2026-08-02T10:00:02.000Z', 7),
    serverTime: '2026-08-02T10:00:02.100Z',
  });

  assert.deepEqual(reconciled.map(item => item.name), ['nari', 'zara']);
  assert.equal(reconciled[0].position.x, 7);
});
