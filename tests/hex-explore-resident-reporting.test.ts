import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('resident reporter emits only interactable residents through a bounded callback', async () => {
  const source = await readFile(new URL('../components/hex-world/HexResidentInteractionReporter.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexResidentInteractionSample/);
  assert.match(source, /onResidentSamplesChange/);
  assert.match(source, /partner-1/);
  assert.match(source, /partner-2/);
  assert.match(source, /family\.stage\s*===\s*['"]child['"]/);
  assert.match(source, /animals\.pet\.kind/);
  assert.match(source, /RESIDENT_REPORT_INTERVAL\s*=\s*0\.1/);
  assert.match(source, /RESIDENT_REPORT_EPSILON\s*=\s*0\.04/);
  assert.match(source, /samplesChanged/);
  assert.doesNotMatch(source, /residentId:\s*['"]cow['"]/);
  assert.doesNotMatch(source, /residentId:\s*['"]sheep['"]/);
});

test('world mounts resident reporting only in person mode and forwards samples to the player', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexResidentInteractionReporter/);
  assert.match(source, /residentSamples/);
  assert.match(source, /onResidentSamplesChange/);
  assert.match(source, /viewMode\s*===\s*['"]person['"][\s\S]*HexResidentInteractionReporter/);
  assert.match(source, /HexPlayerController[\s\S]*residentSamples=\{residentSamples\}/);
});
