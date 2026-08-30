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

test('poor performance degrades high before the frame rate becomes visibly bad', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(high, 0.81).name, 'medium');
  assert.equal(resolveAdaptiveHexQuality(high, 0.54).name, 'mobile');
});

test('medium can degrade to mobile but never promote to high', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const medium = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(medium, 0.54).name, 'mobile');
  assert.equal(resolveAdaptiveHexQuality(medium, 0.99).name, 'medium');
});

test('mobile static cap never promotes', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const mobile = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 500 });
  assert.equal(resolveAdaptiveHexQuality(mobile, 1).name, 'mobile');
});

test('high density compact screens avoid the highest render budget', () => {
  const compactRetina = resolveHexQualityProfile({
    graphicsQuality: 'high',
    viewportWidth: 1366,
    devicePixelRatio: 2,
  });
  assert.equal(compactRetina.name, 'medium');
});

test('quality profiles cap expensive pixel and scene budgets', () => {
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1920, devicePixelRatio: 1 });
  const medium = resolveHexQualityProfile({ graphicsQuality: 'medium', viewportWidth: 1200, devicePixelRatio: 1 });

  assert.equal(high.maxDpr, 1.5);
  assert.equal(high.pbrGroundPropBudget, 144);
  assert.equal(medium.maxDpr, 1.25);
  assert.equal(medium.pbrGroundPropBudget, 64);
});

test('invalid performance factors resolve safely inside the static cap', async () => {
  const resolveAdaptiveHexQuality = await loadAdaptiveResolver();
  const high = resolveHexQualityProfile({ graphicsQuality: 'high', viewportWidth: 1200 });
  assert.equal(resolveAdaptiveHexQuality(high, Number.NaN).name, 'high');
  assert.equal(resolveAdaptiveHexQuality(high, Number.NEGATIVE_INFINITY).name, 'high');
});
