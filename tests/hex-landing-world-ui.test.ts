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

test('landing hero message card has no visible border', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');

  assert.match(source, /A little world that belongs to both of you\./);
  assert.doesNotMatch(source, /rounded-\[2rem\]\s+border\s+border-white\/70\s+bg-white\/72/);
});

test('premium landing composition keeps the world dominant and UI editorial', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');

  assert.match(source, /from 'framer-motion'/);
  assert.match(source, /Explore the world/);
  assert.match(source, /pointer-events-none/);
  assert.match(source, /initial=\{\{ opacity: 0, y: 16 \}\}/);
  assert.match(source, /whileHover=\{\{ scale: 1\.03 \}\}/);
  assert.doesNotMatch(source, /bg-gradient-to-r from-white\/35/);
  assert.doesNotMatch(source, /bg-white\/72/);
  assert.doesNotMatch(source, /Live world preview/);
});

test('landing scroll story is continuous with the HexWorld atmosphere', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');

  assert.match(source, /useScroll/);
  assert.match(source, /useTransform/);
  assert.match(source, /fixed inset-0/);
  assert.match(source, /overflow-x-hidden/);
  assert.match(source, /bg-transparent/);
  assert.match(source, /Your world grows with your story\./);
  assert.match(source, /Keep every little moment\./);
  assert.match(source, /Say the things worth keeping\./);
  assert.match(source, /Little promises, made together\./);
  assert.match(source, /Build a world that is only yours\./);
  assert.match(source, />Timeline</);
  assert.match(source, />Coupons</);
  assert.match(source, />Letters</);
  assert.doesNotMatch(source, /<main[^>]*overflow-hidden/);
  assert.doesNotMatch(source, /border-t/);
  assert.doesNotMatch(source, /divide-y/);
  assert.doesNotMatch(source, /fixed bottom-\[calc\(1\.15rem\+env\(safe-area-inset-bottom\)\)\]/);
});

test('HexWorld loading keeps the real world renderer visible behind product-aligned loading chrome', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorldLoading.tsx', import.meta.url), 'utf8');

  assert.match(source, /HexWorld3D/);
  assert.match(source, /createLandingHexWorldSnapshot/);
  assert.match(source, /Loading Land/);
  assert.doesNotMatch(source, /bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50/);
});
