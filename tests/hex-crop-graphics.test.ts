import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getCropVisualStage } from '../lib/hex-world/crop-visuals';

test('crop visual stages are deterministic presentation ranges', () => {
  assert.equal(getCropVisualStage(0), 'sprout');
  assert.equal(getCropVisualStage(0.24), 'sprout');
  assert.equal(getCropVisualStage(0.25), 'young');
  assert.equal(getCropVisualStage(0.54), 'young');
  assert.equal(getCropVisualStage(0.55), 'mature');
  assert.equal(getCropVisualStage(0.84), 'mature');
  assert.equal(getCropVisualStage(0.85), 'ready');
  assert.equal(getCropVisualStage(1), 'ready');
});

test('crop graphics are a presentation-only layer driven by existing authoritative samples', async () => {
  const layer = await readFile(new URL('../components/hex-world/HexCropEnhancements.tsx', import.meta.url), 'utf8');
  const world = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');

  assert.match(layer, /getCropVisualSamples/);
  assert.match(layer, /getCropVisualStage/);
  assert.match(layer, /cropKey/);
  assert.match(layer, /watered/);
  assert.doesNotMatch(layer, /fetch\(|hexWorldAPI|familyFarmAPI|onAction|mutation/i);
  assert.match(world, /HexCropEnhancements/);
});
