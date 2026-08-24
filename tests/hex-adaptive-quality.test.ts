import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHexQualityProfile } from '@/lib/hex-world/quality';

async function loadAdaptiveResolver() {
  const quality = await import('@/lib/hex-world/quality');
  assert.equal(typeof quality.resolveAdaptiveHexQuality, 'function');
  return quality.resolveAdaptiveHexQuality!;
}

test('adaptive quality never exceeds the static cap', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const medium = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(medium, 1).name, 'medium');
  assert.equal(resolveAdaptiveHexQuality(medium, 0.85).name, 'medium');
});

test('poor performance degrades high through existing buckets', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(high, 0.69).name, 'medium');
  assert.equal(resolveAdaptiveHexQuality(high, 0.39).name, 'mobile');
});

test('medium can degrade to mobile but never promote to high', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const medium = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(medium, 0.39).name, 'mobile');
  assert.equal(resolveAdaptiveHexQuality(medium, 0.99).name, 'medium');
});

test('mobile static cap never promotes', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const mobile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 500 });
  assert.equal(resolveAdaptiveHexQuality(mobile, 1).name, 'mobile');
});

test('invalid performance factors resolve safely inside the static cap', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(high, Number.NaN).name, 'high');
  assert.equal(resolveAdaptiveHexQuality(high, Number.NEGATIVE_INFINITY).name, 'high');
});
