import assert from 'node:assert/strict';
import { test } from 'node:test';

async function loadMovementInput() {
  return import('@/lib/hex-world/explore-movement-input').catch(() => null);
}

test('joystick center and dead zone resolve to zero', async () => {
  const movement = await loadMovementInput();
  assert.ok(movement, 'Explore movement input module must exist');
  if (!movement) return;
  assert.deepEqual(movement.getJoystickMovementInput({ dx: 0, dy: 0, radius: 36 }), { forward: 0, right: 0 });
  assert.deepEqual(movement.getJoystickMovementInput({ dx: 2, dy: 2, radius: 36, deadZone: 0.18 }), { forward: 0, right: 0 });
});

test('joystick maps screen axes to forward and right', async () => {
  const movement = await loadMovementInput();
  assert.ok(movement, 'Explore movement input module must exist');
  if (!movement) return;
  const up = movement.getJoystickMovementInput({ dx: 0, dy: -36, radius: 36 });
  assert.equal(up.forward, 1);
  assert.equal(up.right, 0);
  const right = movement.getJoystickMovementInput({ dx: 36, dy: 0, radius: 36 });
  assert.equal(right.forward, 0);
  assert.equal(right.right, 1);
});

test('joystick diagonal and overtravel clamp to magnitude one', async () => {
  const movement = await loadMovementInput();
  assert.ok(movement, 'Explore movement input module must exist');
  if (!movement) return;
  const diagonal = movement.getJoystickMovementInput({ dx: 100, dy: -100, radius: 36 });
  assert.ok(Math.hypot(diagonal.forward, diagonal.right) <= 1 + 1e-9);
  assert.ok(diagonal.forward > 0);
  assert.ok(diagonal.right > 0);
});

test('invalid joystick geometry resolves safely to zero', async () => {
  const movement = await loadMovementInput();
  assert.ok(movement, 'Explore movement input module must exist');
  if (!movement) return;
  assert.deepEqual(movement.getJoystickMovementInput({ dx: Number.NaN, dy: 0, radius: 36 }), { forward: 0, right: 0 });
  assert.deepEqual(movement.getJoystickMovementInput({ dx: 1, dy: 1, radius: 0 }), { forward: 0, right: 0 });
  assert.deepEqual(movement.getJoystickMovementInput({ dx: 1, dy: 1, radius: Number.POSITIVE_INFINITY }), { forward: 0, right: 0 });
});

test('keyboard and touch combination never exceeds magnitude one', async () => {
  const movement = await loadMovementInput();
  assert.ok(movement, 'Explore movement input module must exist');
  if (!movement) return;
  const combined = movement.combineExploreMovementInputs(
    { forward: 1, right: 0 },
    { forward: 1, right: 1 },
  );
  assert.ok(Math.hypot(combined.forward, combined.right) <= 1 + 1e-9);
  assert.ok(combined.forward > 0);
  assert.ok(combined.right > 0);
});
