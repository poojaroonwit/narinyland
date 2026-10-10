import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile navigation has four visible destinations and secondary actions are accessible', async () => {
  const ui = await source('app/garden/_components/GardenAcceptedContent.tsx');
  assert.match(ui, /grid-cols-4/);
  assert.match(ui, /garden-more-destinations/);
  assert.match(ui, /aria-expanded=\{moreOpen\}/);
  assert.match(ui, /navigate\('shop'\)/);
  assert.match(ui, /navigate\('timeline'\)/);
  assert.match(ui, /navigate\('coupons'\)/);
  assert.match(ui, /navigate\('letters'\)/);
  assert.match(ui, /unreadLetters/);
  assert.match(ui, /event\.key === 'Escape'/);
  assert.match(ui, /href="\/world"/);
});

test('world and land selectors are viewport-bound mobile sheets and close by Escape', async () => {
  const ui = await source('app/garden/_components/GardenTopControls.tsx');
  assert.match(ui, /Close world selector/);
  assert.match(ui, /Close land selector/);
  assert.match(ui, /left-0 z-\[80\]/);
  assert.match(ui, /max-h-\[85dvh\]/);
  assert.match(ui, /event\.key === 'Escape'/);
  assert.match(ui, /aria-haspopup="dialog"/);
  assert.match(ui, /isMobile=\{isMobile\}/);
});

test('switching couples invalidates stale views and unmount restores body scroll', async () => {
  const page = await source('app/garden/page.tsx');
  assert.match(page, /let current = true/);
  assert.match(page, /if \(!current\) return/);
  assert.match(page, /setCircleMembers\(\[\]\)/);
  assert.match(page, /setLoveLetters\(\[\]\)/);
  assert.match(page, /proposal: \{ \.\.\.previous\.proposal, isAccepted: false/);
  assert.match(page, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(page, /removeEventListener\('appinstalled'/);
});

test('open-world menus pause touch input and game utilities meet minimum touch targets', async () => {
  const world = await source('components/open-world/OpenWorldExperience.tsx');
  assert.match(world, /enabled=\{!mapOpen\}/);
  assert.match(world, /event\.key === 'Escape'/);
  const toolbar = await source('components/hex-world/HexWorldToolbar.tsx');
  assert.match(toolbar, /min-h-11 min-w-11/);
  assert.match(toolbar, /aria-label="More world controls"/);
  assert.match(toolbar, /aria-label="Reset view"/);
  assert.doesNotMatch(toolbar, /h-\[23px\]/);
});
