import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getVisualVariation } from '@/lib/hex-world/visual-variation';

test('visual variation is deterministic for a land coordinate', () => {
  const a = getVisualVariation('land-123', { q: -4, r: 2 });
  const b = getVisualVariation('land-123', { q: -4, r: 2 });
  assert.deepEqual(a, b);
  assert.ok(a.scale >= 0.85 && a.scale <= 1.15);
  assert.ok(a.tone >= -0.08 && a.tone <= 0.08);
});

test('different coordinates do not all collapse to one variation', () => {
  const values = [
    getVisualVariation('land-123', { q: 0, r: 0 }),
    getVisualVariation('land-123', { q: 1, r: 0 }),
    getVisualVariation('land-123', { q: 2, r: -1 }),
  ];
  assert.ok(new Set(values.map((value) => `${value.rotation}:${value.scale}:${value.tone}`)).size > 1);
});
