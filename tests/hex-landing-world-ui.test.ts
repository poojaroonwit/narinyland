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

test('single hero landing autoplays a fast end-to-end gameplay loop', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');

  assert.match(source, /GAMEPLAY_LOOP_MS\s*=\s*11000/);
  assert.match(source, /GAMEPLAY_STAGES/);
  assert.match(source, /Arrive/);
  assert.match(source, /Build/);
  assert.match(source, /Grow/);
  assert.match(source, /Expand/);
  assert.match(source, /Together/);
  assert.match(source, /setInterval/);
  assert.match(source, /createLandingGameplaySnapshots/);
  assert.match(source, /prefersReducedMotion\s*\?\s*GAMEPLAY_STAGES\.length\s*-\s*1/);
  assert.match(source, /href="\/signup"/);
  assert.match(source, /Enter Narinyland/);
  assert.doesNotMatch(source, /id="story"/);
  assert.doesNotMatch(source, /Your world grows with your story\./);
  assert.doesNotMatch(source, /Keep every little moment\./);
  assert.doesNotMatch(source, /Say the things worth keeping\./);
  assert.doesNotMatch(source, /Little promises, made together\./);
});

test('single hero keeps the real world dominant and avoids scroll-story mechanics', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');

  assert.match(source, /HexWorld3D/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /CINEMATIC_MOTES/);
  assert.match(source, /pointer-events-none/);
  assert.match(source, /whileHover=\{\{ scale: 1\.03 \}\}/);
  assert.doesNotMatch(source, /useScroll/);
  assert.doesNotMatch(source, /useTransform/);
  assert.doesNotMatch(source, /Explore the world/);
  assert.doesNotMatch(source, /<section[^>]+min-h-\[8[2468]svh\]/);
});

test('HexWorld loading keeps the real world renderer visible behind product-aligned loading chrome', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorldLoading.tsx', import.meta.url), 'utf8');

  assert.match(source, /HexWorld3D/);
  assert.match(source, /createLandingHexWorldSnapshot/);
  assert.match(source, /Loading Land/);
  assert.doesNotMatch(source, /bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50/);
});
