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

test('single hero landing autoplays a detailed end-to-end gameplay loop', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');

  assert.match(source, /GAMEPLAY_LOOP_MS\s*=\s*12000/);
  assert.match(source, /GAMEPLAY_STAGES/);
  for (const stage of ['Arrive', 'Build', 'Grow', 'Edit', 'Expand', 'Together']) {
    assert.match(source, new RegExp(stage));
  }
  assert.match(source, /setInterval/);
  assert.match(source, /createLandingGameplaySnapshots/);
  assert.match(source, /prefersReducedMotion\s*\?\s*GAMEPLAY_STAGES\.length\s*-\s*1/);
  assert.match(source, /href="\/signup"/);
  assert.match(source, /Enter Narinyland/);
  assert.doesNotMatch(source, /id="story"/);
  assert.doesNotMatch(source, /Explore the world/);
});

test('gameplay hero shows authentic builder and expansion details without mutating real gameplay', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');

  assert.match(source, /Land ready/);
  assert.match(source, /Points/);
  assert.match(source, /Nature/);
  assert.match(source, /Utility/);
  assert.match(source, /Decor/);
  assert.match(source, /Workshop/);
  assert.match(source, /Bench/);
  assert.match(source, /Garden Patch/);
  assert.match(source, /Ghost preview/);
  assert.match(source, /Rotate 60°/);
  assert.match(source, />Place</);
  assert.match(source, /Bench placed · Undo/);
  assert.match(source, /Move/);
  assert.match(source, /Rotate/);
  assert.match(source, /Remove/);
  assert.match(source, /\+7 hexes/);
  assert.match(source, /100 Points/);
  assert.match(source, /Your world grew/);
  assert.match(source, /activeSnapshot\.points/);
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /placeBuilding\(/);
  assert.doesNotMatch(source, /expandWorld\(/);
});

test('single hero keeps the real world dominant and reduced motion static', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');

  assert.match(source, /HexWorld3D/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /CINEMATIC_MOTES/);
  assert.match(source, /pointer-events-none/);
  assert.match(source, /whileHover=\{\{ scale: 1\.03 \}\}/);
  assert.doesNotMatch(source, /useScroll/);
  assert.doesNotMatch(source, /useTransform/);
  assert.doesNotMatch(source, /<section[^>]+min-h-\[8[2468]svh\]/);
});

test('HexWorld loading keeps the real world renderer visible behind product-aligned loading chrome', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorldLoading.tsx', import.meta.url), 'utf8');

  assert.match(source, /HexWorld3D/);
  assert.match(source, /createLandingHexWorldSnapshot/);
  assert.match(source, /Loading Land/);
  assert.doesNotMatch(source, /bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50/);
});
