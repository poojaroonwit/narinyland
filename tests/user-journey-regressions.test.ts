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


test('timeline failures never undo a delivered letter or a redeemed coupon', async () => {
  const actions = await read('app/garden/_components/useGardenActions.ts');
  assert.match(actions, /let redeemed = false/);
  assert.match(actions, /if \(redeemed\) await addXP\(\)/);
  assert.match(actions, /Coupon redeemed, but its timeline activity/);
  assert.match(actions, /let letterSaved = false/);
  assert.match(actions, /letterSaved = true/);
  assert.match(actions, /if \(letterSaved\)/);
  assert.match(actions, /Letter sent, but its timeline activity/);
  assert.match(actions, /else \{\s*notify\('Failed to save your letter/);
});


test('land changes are serialized and shown only after server confirmation', async () => {
  const [garden, controls] = await Promise.all([
    read('app/garden/page.tsx'),
    read('app/garden/_components/GardenTopControls.tsx'),
  ]);
  assert.match(garden, /landSwitchBusyRef\.current/);
  assert.match(garden, /if \(landSwitchBusyRef\.current/);
  assert.match(garden, /const activeLand = await landsAPI\.setActive\(landId\)/);
  assert.match(garden, /if \(activeCircleIdRef\.current !== requestedCircleId\) return/);
  assert.match(garden, /landSwitchBusyRef\.current = false/);
  assert.match(controls, /isSwitchingLand/);
  assert.match(controls, /disabled=\{isSwitchingLand \|\| isCreatingLand\}/);
});

test('world does not interpret failed personal and shared records as empty collections', async () => {
  const garden = await read('app/garden/page.tsx');
  for (const expression of [
    'lettersAPI.list(),',
    'timelineAPI.list(),',
    'memoriesAPI.list(),',
    'statsAPI.get(),',
  ]) assert.ok(garden.includes(expression), expression);
  assert.doesNotMatch(garden, /lettersAPI\.list\(\)\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(garden, /statsAPI\.get\(\)\.catch\(/);
});

test('coupon redemption waits for confirmed server response before moving to history', async () => {
  const [coupon, types, actions] = await Promise.all([
    read('components/LoveCoupons.tsx'),
    read('components/love-coupons/types.ts'),
    read('app/garden/_components/useGardenActions.ts'),
  ]);
  assert.match(types, /onRedeem\?: \(id: string\) => Promise<boolean>/);
  assert.match(coupon, /const confirmed = await onRedeem\(targetId\)/);
  assert.match(coupon, /if \(!confirmed\)/);
  assert.match(coupon, /redeemBusyRef\.current/);
  assert.match(coupon, /setRedeemError\('Could not redeem this coupon/);
  assert.match(coupon, /if \(!isRedeeming\) setSelectedCoupon\(null\)/);
  assert.match(actions, /return redeemed/);
});

test('letter composer holds a failed draft and blocks multiple in-flight sends', async () => {
  const [letter, actions] = await Promise.all([
    read('components/LoveLetter.tsx'),
    read('app/garden/_components/useGardenActions.ts'),
  ]);
  assert.match(letter, /onSendMessage: \(msg: LoveLetterMessage\) => Promise<boolean>/);
  assert.match(letter, /if \(sendingRef\.current/);
  assert.match(letter, /const saved = await onSendMessage\(newMessage\)/);
  assert.match(letter, /if \(!saved\)/);
  assert.match(letter, /Your draft is still here/);
  assert.match(letter, /disabled=\{isSending/);
  assert.match(actions, /return letterSaved/);
});


test('letter attachments must succeed before delivery is considered complete', async () => {
  const actions = await read('app/garden/_components/useGardenActions.ts');
  assert.match(actions, /Could not prepare the attached media/);
  assert.match(actions, /throw new Error\('Could not prepare the attached media\.'/);
  assert.match(actions, /setLoveLetters\(\(prev\) => prev\.filter\(\(letter\) => letter\.id !== msg\.id\)\)/);
});
