import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('player controller resolves buildings and moving residents through one target resolver', async () => {
  const source = await readFile(new URL('../components/hex-world/HexPlayerController.tsx', import.meta.url), 'utf8');
  assert.match(source, /HexResidentInteractionSample/);
  assert.match(source, /residentSamples\?/);
  assert.match(source, /getExploreInteractionTarget\([\s\S]*buildings[\s\S]*residentSamples/);
  assert.match(source, /lastInteractionTargetIdRef/);
  assert.match(source, /interactionTarget\?\.id|interactionTargetId/);
});

test('world forwards resident samples only to the person controller path', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(source, /viewMode\s*===\s*['"]person['"][\s\S]*HexPlayerController/);
  assert.match(source, /HexPlayerController[\s\S]*residentSamples=\{residentSamples\}/);
  assert.doesNotMatch(source, /HexDioramaCamera[^>]*residentSamples/);
});
