export const HEX_SMOOTHNESS_DEFAULTS = {
  acceleration: 12,
  deceleration: 16,
  heading: 12,
  gait: 10,
  camera: 8.5,
  resident: 10,
} as const;

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function smoothingAlpha(response: number, deltaSeconds: number): number {
  const safeResponse = Math.max(0, finite(response));
  const safeDelta = Math.max(0, finite(deltaSeconds));
  return 1 - Math.exp(-safeResponse * safeDelta);
}

export function smoothScalar(
  current: number,
  target: number,
  response: number,
  deltaSeconds: number,
): number {
  const from = finite(current);
  const to = finite(target, from);
  return from + (to - from) * smoothingAlpha(response, deltaSeconds);
}

export function smoothVector2(
  current: { x: number; z: number },
  target: { x: number; z: number },
  response: number,
  deltaSeconds: number,
): { x: number; z: number } {
  return {
    x: smoothScalar(current.x, target.x, response, deltaSeconds),
    z: smoothScalar(current.z, target.z, response, deltaSeconds),
  };
}

export function smoothAngle(
  current: number,
  target: number,
  response: number,
  deltaSeconds: number,
): number {
  const from = finite(current);
  const to = finite(target, from);
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * smoothingAlpha(response, deltaSeconds);
}
