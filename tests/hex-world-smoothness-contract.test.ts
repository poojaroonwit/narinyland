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

test('default World camera uses a visibly cinematic response instead of the old fast settle', async () => {
  const source = await readFile(new URL('../lib/hex-world/motion.ts', import.meta.url), 'utf8');
  assert.match(source, /cameraResponse:\s*3\.6/);
});

test('World orbit controls keep a longer damped glide', async () => {
  const source = await readFile(new URL('../components/hex-world/HexDioramaCamera.tsx', import.meta.url), 'utf8');
  assert.match(source, /dampingFactor=\{0\.05\}/);
});

test('Hex canvas explicitly requests soft antialiased high-performance rendering', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(source, /shadows="soft"/);
  assert.match(source, /antialias:\s*true/);
  assert.match(source, /powerPreference:\s*'high-performance'/);
});

test('medium quality has enough DPR headroom to visibly smooth World edges', async () => {
  const source = await readFile(new URL('../lib/hex-world/quality.ts', import.meta.url), 'utf8');
  assert.match(source, /const MEDIUM:[\s\S]*?maxDpr:\s*1\.5/);
});
