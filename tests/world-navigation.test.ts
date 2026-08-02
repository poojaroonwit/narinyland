import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCameraRelativeMovement } from '@/lib/world-navigation';

const NONE = { forward: false, back: false, left: false, right: false };

function closeTo(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} should be close to ${expected}`);
}

test('third-person forward follows the camera facing direction', () => {
  const forward = { ...NONE, forward: true };
  const defaultCamera = getCameraRelativeMovement(forward, 'third', 0);
  const quarterTurnCamera = getCameraRelativeMovement(forward, 'third', Math.PI / 2);

  closeTo(defaultCamera.x, 0);
  closeTo(defaultCamera.z, -1);
  closeTo(quarterTurnCamera.x, -1);
  closeTo(quarterTurnCamera.z, 0);
});

test('isometric movement follows the diagonal screen axes', () => {
  const forward = getCameraRelativeMovement({ ...NONE, forward: true }, 'isometric', 0);
  const right = getCameraRelativeMovement({ ...NONE, right: true }, 'isometric', 0);
  const diagonal = Math.SQRT1_2;

  closeTo(forward.x, -diagonal);
  closeTo(forward.z, -diagonal);
  closeTo(right.x, diagonal);
  closeTo(right.z, -diagonal);
});

test('diagonal input is normalized to the same speed as cardinal input', () => {
  const direction = getCameraRelativeMovement(
    { ...NONE, forward: true, right: true },
    'third',
    Math.PI / 3,
  );

  closeTo(Math.hypot(direction.x, direction.z), 1);
});

test('idle input produces no movement', () => {
  assert.deepEqual(getCameraRelativeMovement(NONE, 'isometric', 1.2), { x: 0, z: 0 });
});
