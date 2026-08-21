import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('landing page is a world-first experience instead of a separate marketing site', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(source, /LandingWorldExperience/);
  assert.doesNotMatch(source, /VIDEO_URL/);
  assert.doesNotMatch(source, /SHOWCASE_ITEMS/);
  assert.doesNotMatch(source, /FEATURES\s*=\s*\[/);
  assert.doesNotMatch(source, /<video/);
});

test('HexWorld loading keeps the real world renderer visible behind product-aligned loading chrome', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorldLoading.tsx', import.meta.url), 'utf8');

  assert.match(source, /HexWorld3D/);
  assert.match(source, /createLandingHexWorldSnapshot/);
  assert.match(source, /Loading Land/);
  assert.doesNotMatch(source, /bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50/);
});
