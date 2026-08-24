import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('world mounts bounded performance adaptation and scene preload', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(source, /PerformanceMonitor/);
  assert.match(source, /Preload/);
  assert.match(source, /resolveAdaptiveHexQuality/);
  assert.match(source, /onChange|onDecline|onIncline/);
  assert.match(source, /<Preload\s+all/);
});

test('adaptive rendering keeps existing named quality profiles as the only cost buckets', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(source, /staticProfile/);
  assert.match(source, /profile/);
  assert.doesNotMatch(source, /WebGPURenderer|EffectComposer|Bloom|DepthOfField/);
});
