import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('living world reports only interactable residents through a bounded callback', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingWorldLayer.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexResidentInteractionSample/);
  assert.match(source, /onResidentSamplesChange/);
  assert.match(source, /partner-1/);
  assert.match(source, /partner-2/);
  assert.match(source, /family\.stage\s*===\s*['"]child['"]/);
  assert.match(source, /animals\.pet\.kind/);
  assert.match(source, /RESIDENT_REPORT_INTERVAL|100/);
  assert.match(source, /RESIDENT_REPORT_EPSILON|0\.0/);
  assert.doesNotMatch(source, /residentId:\s*['"]cow['"]/);
  assert.doesNotMatch(source, /residentId:\s*['"]sheep['"]/);
});

test('world only wires resident sample reporting into person mode presentation', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(source, /residentSamples/);
  assert.match(source, /onResidentSamplesChange/);
  assert.match(source, /viewMode\s*===\s*['"]person['"][\s\S]*HexLivingWorldLayer/);
  assert.match(source, /HexPlayerController[\s\S]*residentSamples=/);
});
