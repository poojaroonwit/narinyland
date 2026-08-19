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

test('proposal flow remains mounted above the new world', async () => {
  const source = await readFile(new URL('../app/garden/_components/GardenWorldStage.tsx', import.meta.url), 'utf8');
  assert.match(source, /ProposalScreen/);
  assert.match(source, /configLoaded && appConfig\.showProposal && !hasAcceptedProposal/);
});
