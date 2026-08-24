export type HexExploreMovementInput = {
  forward: number;
  right: number;
};

export const ZERO_HEX_EXPLORE_MOVEMENT: HexExploreMovementInput = Object.freeze({
  forward: 0,
  right: 0,
});

const DEFAULT_DEAD_ZONE = 0.18;

function safeAxis(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function cleanZero(value: number): number {
  return Object.is(value, -0) || Math.abs(value) < Number.EPSILON ? 0 : value;
}

export function getJoystickMovementInput({
  dx,
  dy,
  radius,
  deadZone = DEFAULT_DEAD_ZONE,
}: {
  dx: number;
  dy: number;
  radius: number;
  deadZone?: number;
}): HexExploreMovementInput {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(radius) || radius <= 0) {
    return ZERO_HEX_EXPLORE_MOVEMENT;
  }

  const safeDeadZone = Number.isFinite(deadZone)
    ? Math.min(0.95, Math.max(0, deadZone))
    : DEFAULT_DEAD_ZONE;
  const rawRight = dx / radius;
  const rawForward = -dy / radius;
  const rawMagnitude = Math.hypot(rawForward, rawRight);

  if (!Number.isFinite(rawMagnitude) || rawMagnitude <= safeDeadZone) {
    return ZERO_HEX_EXPLORE_MOVEMENT;
  }

  const clampedMagnitude = Math.min(1, rawMagnitude);
  const analogMagnitude = safeDeadZone >= 1
    ? 0
    : (clampedMagnitude - safeDeadZone) / (1 - safeDeadZone);
  if (analogMagnitude <= 0) return ZERO_HEX_EXPLORE_MOVEMENT;

  const directionScale = analogMagnitude / rawMagnitude;
  return {
    forward: cleanZero(rawForward * directionScale),
    right: cleanZero(rawRight * directionScale),
  };
}

export function combineExploreMovementInputs(
  ...inputs: HexExploreMovementInput[]
): HexExploreMovementInput {
  let forward = 0;
  let right = 0;

  for (const input of inputs) {
    forward += safeAxis(input.forward);
    right += safeAxis(input.right);
  }

  const magnitude = Math.hypot(forward, right);
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return ZERO_HEX_EXPLORE_MOVEMENT;
  }
  if (magnitude <= 1) return { forward: cleanZero(forward), right: cleanZero(right) };

  return {
    forward: cleanZero(forward / magnitude),
    right: cleanZero(right / magnitude),
  };
}
