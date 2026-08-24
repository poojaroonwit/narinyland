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
  assert.equal(profile.worldWindScale, 0);
  assert.equal(profile.worldWindSecondaryScale, 0);
  assert.equal(profile.waterMotionScale, 0);
  assert.equal(profile.worldIdleCameraScale, 0);
  assert.equal(profile.lightingResponse, 18);
  assert.ok(profile.buildingFeedbackScale > 0);
  assert.ok(profile.hoverResponse > 0);
  assert.ok(profile.cameraResponse >= 20);
});

test('world motion profile is quality bounded and exposes locked lighting response', () => {
  const high = resolveHexMotionProfile({
    quality: resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440 }),
    reducedMotion: false,
  });
  const medium = resolveHexMotionProfile({
    quality: resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1440 }),
    reducedMotion: false,
  });
  const mobile = resolveHexMotionProfile({
    quality: resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 390 }),
    reducedMotion: false,
  });

  assert.equal(high.worldWindScale, 1);
  assert.equal(high.worldWindSecondaryScale, 1);
  assert.equal(medium.worldWindScale, 0.78);
  assert.equal(medium.worldWindSecondaryScale, 1);
  assert.equal(mobile.worldWindScale, 0.35);
  assert.equal(mobile.worldWindSecondaryScale, 0);
  assert.equal(high.lightingResponse, 2.8);
  assert.equal(medium.lightingResponse, 2.8);
  assert.equal(mobile.lightingResponse, 2.8);

  for (const profile of [high, medium, mobile]) {
    for (const value of [
      profile.worldWindScale,
      profile.worldWindSecondaryScale,
      profile.waterMotionScale,
      profile.buildingFeedbackScale,
      profile.worldIdleCameraScale,
      profile.lightingResponse,
    ]) {
      assert.ok(Number.isFinite(value));
      assert.ok(value >= 0);
    }
  }
});

test('exponential smoothing alpha is frame-rate safe', () => {
  const alpha = expSmoothingAlpha(1 / 60, 8);
  assert.ok(alpha > 0 && alpha < 1);
});
