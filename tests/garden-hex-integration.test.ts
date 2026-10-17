import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('garden mounts floating HexWorld and no old world renderer', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenWorldStage.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexBuildController/);
  assert.match(source, /HexWorld3D/);
  assert.match(source, /HexWorldLoading/);
  assert.match(source, /AbortController/);
  assert.doesNotMatch(source, /LoveTree3D/);
  assert.doesNotMatch(source, /FamilyLife2D/);
  assert.doesNotMatch(source, /WorldMMO3D/);
});

test('garden main navigation remains independent of the renderer', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenAcceptedContent.tsx', import.meta.url), 'utf8');
  for (const label of ['Home', 'Timeline', 'Coupons', 'Letters']) assert.match(source, new RegExp(`>${label}<`));
  assert.doesNotMatch(source, /worldMode\s*===/);
});

test('Home tab leaves the HexWorld pointer-interactive while other app panels can capture input', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenAcceptedContent.tsx', import.meta.url), 'utf8');
  assert.match(source, /pointer-events-none relative z-10/);
  assert.match(source, /activeTab === 'home' \? 'pointer-events-none' : 'pointer-events-auto'/);
  assert.match(source, /cozy-nav pointer-events-auto fixed bottom-\[calc\(0\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(source, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.doesNotMatch(source, /MemoryFrame/);
});

test('proposal flow remains mounted above the new world', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenWorldStage.tsx', import.meta.url), 'utf8');
  assert.match(source, /ProposalScreen/);
  assert.match(source, /configLoaded && appConfig\.showProposal && !hasAcceptedProposal/);
});

test('switching active Land aborts stale fetches and replaces the snapshot before rendering the new builder', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenWorldStage.tsx', import.meta.url), 'utf8');
  assert.match(source, /setSnapshot\(null\)/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /\[activeLandId, reloadKey, configLoaded\]/);
  assert.match(source, /if \(!configLoaded\) \{/);
  assert.match(source, /Retry loading/);
  assert.match(source, /landId=\{snapshot\.world\.landId\}/);
});


test('world and land menus use bounded sheets, semantic labels, and Escape dismissal', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenTopControls.tsx', import.meta.url), 'utf8');
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /id="garden-world-selector" role="dialog"/);
  assert.match(source, /id="garden-land-selector" role="dialog"/);
  assert.match(source, /max-h-\[85dvh\]/);
  assert.match(source, /aria-label="Close land selector"/);
  assert.match(source, /isMobile=\{isMobile\}/);
  assert.match(source, /isSwitchingLand/);
});

test('account menu uses responsive props and closes on Escape without render-time browser reads', async () => {
  const source = await readFile(new URL('../components/UserDropdown.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(event\.key === 'Escape'\) setDropdownOpen\(false\)/);
  assert.match(source, /initial=\{isMobile \?/);
  assert.doesNotMatch(source, /window\.innerWidth/);
});

test('short mobile landing pages can grow and show all actions', async () => {
  const source = await readFile(new URL('../components/landing/LandingWorldExperience.tsx', import.meta.url), 'utf8');
  assert.match(source, /min-h-\[100svh\] overflow-x-hidden/);
  assert.match(source, /pointer-events-none relative z-30/);
  assert.match(source, /sm:absolute sm:inset-x-0/);
});

test('Places panel suspends touch movement and closes on Escape', async () => {
  const source = await readFile(new URL('../components/open-world/OpenWorldExperience.tsx', import.meta.url), 'utf8');
  assert.match(source, /enabled=\{!mapOpen\}/);
  assert.match(source, /movementInputRef\.current = \{ \.\.\.ZERO_HEX_EXPLORE_MOVEMENT \}/);
  assert.match(source, /event\.key === 'Escape'/);
});

test('install suggestion is nonblocking and dismissible', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenStatusOverlays.tsx', import.meta.url), 'utf8');
  assert.match(source, /aria-label="Dismiss install suggestion"/);
  assert.match(source, /setShowInstallPrompt\(false\)/);
  assert.doesNotMatch(source, /top-1\/2/);
});
