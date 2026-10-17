import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { resolveActiveWorldId } from '../lib/circle-store';

const read = (path: string) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('verified memberships override a removed or invalid stored world', () => {
  assert.equal(resolveActiveWorldId(['world-a', 'world-b'], 'deleted-world', true), 'world-a');
  assert.equal(resolveActiveWorldId(['world-a', 'world-b'], 'world-b', true), 'world-b');
  assert.equal(resolveActiveWorldId([], 'deleted-world', true), null);
  assert.equal(resolveActiveWorldId([], null, true), null);
});

test('transient membership outages do not erase the previously active world', () => {
  assert.equal(resolveActiveWorldId([], 'world-a', false), 'world-a');
  assert.equal(resolveActiveWorldId([], null, false), null);
});

test('garden resets loading state, rejects outdated responses, and supports retry', async () => {
  const [garden, stage, content, controls] = await Promise.all([
    read('app/garden/page.tsx'),
    read('app/garden/_components/GardenWorldStage.tsx'),
    read('app/garden/_components/GardenAcceptedContent.tsx'),
    read('app/garden/_components/GardenTopControls.tsx'),
  ]);
  assert.match(garden, /let cancelled = false/);
  assert.match(garden, /if \(cancelled\) return/);
  assert.match(garden, /return \(\) => \{ cancelled = true; \}/);
  assert.match(garden, /loadedCircleId === activeCircleId/);
  assert.match(garden, /configRetryNonce/);
  assert.match(garden, /setConfigLoadError\(getErrorMessage\(err\)\)/);
  assert.match(garden, /gallery: memories\.map/);
  assert.match(garden, /coupons: serverConfig\.coupons \?\? \[\]/);
  assert.match(stage, /if \(!configLoaded\)/);
  assert.match(stage, /Retry loading/);
  assert.match(content, /if \(!configLoaded \|\| !hasAcceptedProposal\) return null/);
  assert.match(controls, /if \(!configLoaded\) return null/);
});

test('world creation uses the server-owned membership and invite-first joining', async () => {
  const onboarding = await read('app/onboarding/page.tsx');
  assert.match(onboarding, /credentials: 'include'/);
  assert.match(onboarding, /Creation already establishes AppKit ownership/);
  assert.match(onboarding, /Ask the world owner to invite you/);
  assert.doesNotMatch(onboarding, /getAccessToken/);
  assert.doesNotMatch(onboarding, /userId: user\?\.sub/);
});

test('shop serializes purchases across all items and restores action state', async () => {
  const shop = await read('components/Shop.tsx');
  assert.match(shop, /purchaseInFlightRef\.current/);
  assert.match(shop, /if \(purchaseInFlightRef\.current\) return/);
  assert.match(shop, /disabled=\{points < item\.price \|\| purchasingId !== null\}/);
  assert.match(shop, /purchaseInFlightRef\.current = false/);
});
