import type { WorldPresence, WorldPresenceVector } from '@/types';

export const PRESENCE_MOVEMENT_TICK_MS = 200;
export const PRESENCE_FULL_HEARTBEAT_MS = 5000;
export const PRESENCE_MAX_HORIZONTAL_SPEED = 6.75;
export const PRESENCE_MOVEMENT_BURST_DISTANCE = 0.85;
export const PRESENCE_AUTHORITY_MAX_ELAPSED_MS = 2000;

export type PresenceMovementSample = {
  position: WorldPresenceVector;
  velocity: WorldPresenceVector;
  heading: number;
  moving: boolean;
};

export type PresenceMovementUpdate = Partial<Omit<PresenceMovementSample, 'position' | 'velocity'>> & {
  position?: Partial<WorldPresenceVector>;
  velocity?: Partial<WorldPresenceVector>;
};

export type PresenceMovementCorrection = {
  corrected: boolean;
  reason?: 'speed' | 'velocity' | 'vertical';
  requestedDistance: number;
  allowedDistance: number;
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function applyPresenceMovementUpdate(
  presence: WorldPresence,
  update: PresenceMovementUpdate,
  now: number,
): WorldPresence {
  const position: Partial<WorldPresenceVector> = update.position || {};
  const velocity: Partial<WorldPresenceVector> = update.velocity || {};
  const nextVelocity = {
    x: clampNumber(velocity.x, -8, 8, presence.velocity?.x || 0),
    y: clampNumber(velocity.y, -4, 4, presence.velocity?.y || 0),
    z: clampNumber(velocity.z, -8, 8, presence.velocity?.z || 0),
  };
  const moving = update.moving === undefined
    ? Math.hypot(nextVelocity.x, nextVelocity.z) > 0.08
    : Boolean(update.moving);

  return {
    ...presence,
    position: {
      x: clampNumber(position.x, -28, 28, presence.position.x),
      y: clampNumber(position.y, -3, 6, presence.position.y),
      z: clampNumber(position.z, -28, 28, presence.position.z),
    },
    velocity: nextVelocity,
    heading: clampNumber(update.heading, -Math.PI, Math.PI, presence.heading || 0),
    moving,
    animation: moving ? 'walk' : 'idle',
    lastSeen: new Date(now).toISOString(),
  };
}

export function applyAuthoritativePresenceMovementUpdate(
  presence: WorldPresence,
  update: PresenceMovementUpdate,
  now: number,
): { presence: WorldPresence; correction: PresenceMovementCorrection } {
  const candidate = applyPresenceMovementUpdate(presence, update, now);
  const previousAt = Date.parse(presence.lastSeen);
  if (!Number.isFinite(previousAt)) {
    return {
      presence: candidate,
      correction: { corrected: false, requestedDistance: 0, allowedDistance: 0 },
    };
  }

  const elapsedMs = Math.min(
    PRESENCE_AUTHORITY_MAX_ELAPSED_MS,
    Math.max(PRESENCE_MOVEMENT_TICK_MS, now - previousAt),
  );
  const allowedDistance = PRESENCE_MOVEMENT_BURST_DISTANCE +
    PRESENCE_MAX_HORIZONTAL_SPEED * (elapsedMs / 1000);
  const dx = candidate.position.x - presence.position.x;
  const dz = candidate.position.z - presence.position.z;
  const requestedDistance = Math.hypot(dx, dz);
  const requestedVelocity = candidate.velocity || { x: 0, y: 0, z: 0 };
  const horizontalVelocity = Math.hypot(requestedVelocity.x, requestedVelocity.z);
  const positionScale = requestedDistance > allowedDistance && requestedDistance > 0
    ? allowedDistance / requestedDistance
    : 1;
  const velocityScale = horizontalVelocity > PRESENCE_MAX_HORIZONTAL_SPEED && horizontalVelocity > 0
    ? PRESENCE_MAX_HORIZONTAL_SPEED / horizontalVelocity
    : 1;
  const verticalCorrected = Math.abs(candidate.position.y - presence.position.y) > 0.01;
  const speedCorrected = positionScale < 1;
  const velocityCorrected = velocityScale < 1;

  if (!speedCorrected && !velocityCorrected && !verticalCorrected) {
    return {
      presence: candidate,
      correction: { corrected: false, requestedDistance, allowedDistance },
    };
  }

  return {
    presence: {
      ...candidate,
      position: {
        x: presence.position.x + dx * positionScale,
        y: presence.position.y,
        z: presence.position.z + dz * positionScale,
      },
      velocity: {
        x: requestedVelocity.x * velocityScale,
        y: 0,
        z: requestedVelocity.z * velocityScale,
      },
    },
    correction: {
      corrected: true,
      reason: speedCorrected ? 'speed' : velocityCorrected ? 'velocity' : 'vertical',
      requestedDistance,
      allowedDistance,
    },
  };
}

export function shouldBroadcastPresenceMovement(
  previous: PresenceMovementSample | null,
  next: PresenceMovementSample,
  elapsedMs: number,
) {
  if (elapsedMs < PRESENCE_MOVEMENT_TICK_MS) return false;
  if (!previous) return true;
  if (next.moving || previous.moving !== next.moving) return true;

  const dx = next.position.x - previous.position.x;
  const dz = next.position.z - previous.position.z;
  return Math.hypot(dx, dz) >= 0.05;
}

export function preserveNewerPresenceMovement(
  presence: WorldPresence,
  current: WorldPresence | null,
  requestStartedAt: number,
) {
  if (!current || Date.parse(current.lastSeen) <= requestStartedAt) return presence;
  if ((current.currentLandId || '').toLowerCase() !== (presence.currentLandId || '').toLowerCase()) return presence;

  return {
    ...presence,
    position: current.position,
    velocity: current.velocity,
    heading: current.heading,
    moving: current.moving,
    animation: current.animation,
  };
}
