import assert from 'node:assert/strict';
import test from 'node:test';

async function loadSmoothMotion() {
  try {
    return await import('@/lib/hex-world/smooth-motion');
  } catch {
    assert.fail('smooth-motion module must exist');
  }
}

test('scalar smoothing is stable across frame sizes', async () => {
  const { smoothScalar } = await loadSmoothMotion();
  let sixty = 0;
  for (let i = 0; i < 60; i += 1) sixty = smoothScalar(sixty, 1, 12, 1 / 60);
  let thirty = 0;
  for (let i = 0; i < 30; i += 1) thirty = smoothScalar(thirty, 1, 12, 1 / 30);
  assert.ok(Math.abs(sixty - thirty) < 1e-6);
});

test('vector smoothing converges without overshoot', async () => {
  const { smoothVector2 } = await loadSmoothMotion();
  const next = smoothVector2({ x: 0, z: 0 }, { x: 1, z: -1 }, 12, 1 / 60);
  assert.ok(next.x > 0 && next.x < 1);
  assert.ok(next.z < 0 && next.z > -1);
});

test('deceleration converges predictably toward zero', async () => {
  const { smoothVector2 } = await loadSmoothMotion();
  let value = { x: 1.7, z: 0 };
  for (let i = 0; i < 60; i += 1) value = smoothVector2(value, { x: 0, z: 0 }, 16, 1 / 60);
  assert.ok(Math.abs(value.x) < 0.000001);
  assert.equal(value.z, 0);
});

test('shortest-angle smoothing crosses the pi boundary', async () => {
  const { smoothAngle } = await loadSmoothMotion();
  const current = Math.PI - 0.1;
  const target = -Math.PI + 0.1;
  const next = smoothAngle(current, target, 12, 1 / 60);
  const travelled = Math.atan2(Math.sin(next - current), Math.cos(next - current));
  assert.ok(travelled > 0 && travelled < 0.2);
});

test('invalid smoothing inputs stay finite', async () => {
  const { smoothScalar, smoothVector2, smoothAngle } = await loadSmoothMotion();
  assert.ok(Number.isFinite(smoothScalar(Number.NaN, 1, 12, 1 / 60)));
  assert.ok(Number.isFinite(smoothScalar(0, Number.POSITIVE_INFINITY, 12, 1 / 60)));
  const vector = smoothVector2({ x: Number.NaN, z: 0 }, { x: 1, z: Number.NEGATIVE_INFINITY }, 12, 1 / 60);
  assert.ok(Number.isFinite(vector.x));
  assert.ok(Number.isFinite(vector.z));
  assert.ok(Number.isFinite(smoothAngle(Number.NaN, Number.POSITIVE_INFINITY, 12, 1 / 60)));
});

test('locked smoothness defaults remain exact', async () => {
  const { HEX_SMOOTHNESS_DEFAULTS } = await loadSmoothMotion();
  assert.deepEqual(HEX_SMOOTHNESS_DEFAULTS, {
    acceleration: 12,
    deceleration: 16,
    heading: 12,
    gait: 10,
    camera: 8.5,
    resident: 10,
  });
});
