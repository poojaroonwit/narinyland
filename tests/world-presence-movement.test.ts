import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyAuthoritativePresenceMovementUpdate,
  applyPresenceMovementUpdate,
  PRESENCE_MOVEMENT_TICK_MS,
  preserveNewerPresenceMovement,
  shouldBroadcastPresenceMovement,
  type PresenceMovementSample,
} from '@/lib/world-presence-movement';
import type { WorldPresence } from '@/types';

function sample(x: number, moving: boolean): PresenceMovementSample {
  return {
    position: { x, y: 0, z: 0 },
    velocity: { x: moving ? 2 : 0, y: 0, z: 0 },
    heading: 0,
    moving,
  };
}

function presence(): WorldPresence {
  return {
    userId: 'nari',
    name: 'Nari',
    position: { x: 1, y: 0, z: 2 },
    animation: 'idle',
    activity: 'Chatting',
    status: 'online',
    currentLandId: 'circle:land',
    currentZone: 'Commons',
    lastSeen: '2026-08-02T10:00:00.000Z',
  };
}

test('movement packets preserve identity and social presence fields', () => {
  const updated = applyPresenceMovementUpdate(presence(), {
    position: { x: 4, z: 6 },
    velocity: { x: 2, z: 1 },
    heading: 0.8,
    moving: true,
  }, Date.parse('2026-08-02T10:00:01.000Z'));

  assert.equal(updated.userId, 'nari');
  assert.equal(updated.activity, 'Chatting');
  assert.equal(updated.currentLandId, 'circle:land');
  assert.deepEqual(updated.position, { x: 4, y: 0, z: 6 });
  assert.equal(updated.animation, 'walk');
});

test('movement packets clamp untrusted world coordinates and velocity', () => {
  const updated = applyPresenceMovementUpdate(presence(), {
    position: { x: 200, y: -20, z: -200 },
    velocity: { x: 40, y: -20, z: -40 },
  }, 0);

  assert.deepEqual(updated.position, { x: 28, y: -3, z: -28 });
  assert.deepEqual(updated.velocity, { x: 8, y: -4, z: -8 });
});

test('authoritative movement accepts normal avatar travel', () => {
  const now = Date.parse('2026-08-02T10:00:01.000Z');
  const result = applyAuthoritativePresenceMovementUpdate(presence(), {
    position: { x: 6, y: 0, z: 2 },
    velocity: { x: 5.2, y: 0, z: 0 },
    moving: true,
  }, now);

  assert.equal(result.correction.corrected, false);
  assert.deepEqual(result.presence.position, { x: 6, y: 0, z: 2 });
  assert.equal(result.presence.animation, 'walk');
});

test('authoritative movement clamps teleport distance and impossible velocity', () => {
  const now = Date.parse('2026-08-02T10:00:00.200Z');
  const result = applyAuthoritativePresenceMovementUpdate(presence(), {
    position: { x: 28, y: 6, z: -28 },
    velocity: { x: 40, y: 4, z: -40 },
    moving: true,
  }, now);

  const actualDistance = Math.hypot(
    result.presence.position.x - presence().position.x,
    result.presence.position.z - presence().position.z,
  );
  const actualSpeed = Math.hypot(result.presence.velocity?.x || 0, result.presence.velocity?.z || 0);

  assert.equal(result.correction.corrected, true);
  assert.equal(result.correction.reason, 'speed');
  assert.ok(Math.abs(actualDistance - result.correction.allowedDistance) < 0.000001);
  assert.ok(actualSpeed <= 6.75);
  assert.equal(result.presence.position.y, presence().position.y);
});

test('authoritative movement caps accumulated lag allowance', () => {
  const result = applyAuthoritativePresenceMovementUpdate(presence(), {
    position: { x: 28, y: 0, z: 2 },
    velocity: { x: 5.2, y: 0, z: 0 },
  }, Date.parse('2026-08-02T10:00:20.000Z'));

  assert.equal(result.correction.corrected, true);
  assert.equal(result.correction.allowedDistance, 14.35);
  assert.ok(result.presence.position.x < 28);
});

test('moving avatars broadcast at the real-time movement cadence', () => {
  assert.equal(shouldBroadcastPresenceMovement(sample(0, true), sample(0.2, true), PRESENCE_MOVEMENT_TICK_MS - 1), false);
  assert.equal(shouldBroadcastPresenceMovement(sample(0, true), sample(0.2, true), PRESENCE_MOVEMENT_TICK_MS), true);
});

test('stopping sends a final packet while unchanged idle avatars stay quiet', () => {
  assert.equal(shouldBroadcastPresenceMovement(sample(1, true), sample(1.1, false), PRESENCE_MOVEMENT_TICK_MS), true);
  assert.equal(shouldBroadcastPresenceMovement(sample(1, false), sample(1.01, false), 5000), false);
});

test('a slow full heartbeat preserves movement received after it started', () => {
  const fullPresence = presence();
  const currentMovement = {
    ...presence(),
    position: { x: 9, y: 0, z: 8 },
    velocity: { x: 2, y: 0, z: 1 },
    moving: true,
    animation: 'walk',
    lastSeen: '2026-08-02T10:00:02.000Z',
  };

  const merged = preserveNewerPresenceMovement(
    fullPresence,
    currentMovement,
    Date.parse('2026-08-02T10:00:01.000Z'),
  );

  assert.deepEqual(merged.position, currentMovement.position);
  assert.equal(merged.animation, 'walk');
  assert.equal(merged.activity, fullPresence.activity);
});

test('full heartbeats do not inherit movement from a different land', () => {
  const currentMovement = {
    ...presence(),
    currentLandId: 'circle:other-land',
    position: { x: 9, y: 0, z: 8 },
    lastSeen: '2026-08-02T10:00:02.000Z',
  };

  assert.deepEqual(
    preserveNewerPresenceMovement(presence(), currentMovement, Date.parse('2026-08-02T10:00:01.000Z')).position,
    presence().position,
  );
});
