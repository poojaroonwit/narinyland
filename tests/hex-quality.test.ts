import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';

test('small viewport chooses mobile-safe profile even from medium setting', () => {
  const profile = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 390, devicePixelRatio: 3 });
  assert.equal(profile.name, 'mobile');
  assert.equal(profile.maxDpr, 1);
  assert.ok(profile.cloudLayers <= 1);
  assert.ok(profile.particleCount <= 36);
});

test('desktop high keeps visual-wow budget bounded', () => {
  const profile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1440, devicePixelRatio: 2 });
  assert.equal(profile.name, 'high');
  assert.ok(profile.maxDpr <= 1.75);
  assert.equal(profile.shadowMapSize, 2048);
  assert.equal(profile.cloudLayers, 3);
});

test('desktop low resolves to the mobile cost envelope', () => {
  const profile = resolveHexQualityProfile({ graphicsQuality: 'low', viewportWidth: 1280, devicePixelRatio: 1 });
  assert.equal(profile.name, 'mobile');
  assert.equal(profile.ambientDensity, 0.5);
});
