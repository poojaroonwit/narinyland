import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deterministicMotionBucket, deterministicMotionPhase, expSmoothingAlpha, resolveHexMotionProfile } from '@/lib/hex-world/motion';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';

test('motion phase is deterministic and normalized', () => {
  const a = deterministicMotionPhase('tree:4:-2');
  assert.equal(a, deterministicMotionPhase('tree:4:-2'));
  assert.ok(a >= 0 && a < Math.PI * 2);
});

test('motion buckets are deterministic and bounded', () => {
  const bucket = deterministicMotionBucket('water:3:7', 4);
  assert.equal(bucket, deterministicMotionBucket('water:3:7', 4));
  assert.ok(bucket >= 0 && bucket < 4);
});

test('motion bucket rejects an invalid bucket count', () => {
  assert.throws(() => deterministicMotionBucket('tree:0:0', 0), /bucketCount/);
});

test('reduced motion collapses decorative travel but keeps feedback response', () => {
  const quality = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440 });
  const profile = resolveHexMotionProfile({ quality, reducedMotion: true });
  assert.equal(profile.ambientScale, 0);
  assert.equal(profile.ghostBobScale, 0);
  assert.ok(profile.hoverResponse > 0);
  assert.ok(profile.cameraResponse >= 20);
});

test('exponential smoothing alpha is frame-rate safe', () => {
  const alpha = expSmoothingAlpha(1 / 60, 8);
  assert.ok(alpha > 0 && alpha < 1);
});
