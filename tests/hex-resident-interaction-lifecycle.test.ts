import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('build controller owns transient resident samples and open resident identity only', async () => {
  const source = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexResidentInteractionSample/);
  assert.match(source, /residentSamples/);
  assert.match(source, /openResidentId|residentConversation/);
  assert.doesNotMatch(source, /hexWorldAPI\.[A-Za-z]+\([^\n]*residentSamples/);
  assert.doesNotMatch(source, /metadata[^\n]*residentSamples/);
});

test('open resident stays bound by identity while proximity samples continue moving', async () => {
  const source = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(source, /setResidentSamples/);
  assert.match(source, /openResidentId/);
  assert.doesNotMatch(source, /setOpenResidentId\(null\)[^\n]*residentSamples/);
});

test('child and pet conversations validate authoritative living state and lifecycle transitions clear them', async () => {
  const source = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(source, /family\.stage\s*===\s*['"]child['"]/);
  assert.match(source, /animals\.pet\.kind/);
  assert.match(source, /clearExploreInteraction/);
  assert.match(source, /\[clearExploreInteraction, landId\]|\[landId, clearExploreInteraction\]/);
  assert.match(source, /handleResetView[\s\S]*clearExploreInteraction/);
  assert.match(source, /openBuild[\s\S]*clearExploreInteraction/);
  assert.match(source, /openExpand[\s\S]*clearExploreInteraction/);
  assert.match(source, /handleFarm[\s\S]*clearExploreInteraction/);
});
