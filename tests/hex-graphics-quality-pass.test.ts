import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('premium graphics pass keeps bounded procedural architecture', async () => {
  const world = await source('components/hex-world/HexWorld3D.tsx');
  const quality = await source('lib/hex-world/quality.ts');

  assert.match(world, /HexTerrainDetails/);
  assert.match(world, /getHexVisualEnvironment/);
  assert.doesNotMatch(world, /EffectComposer|Bloom|DepthOfField|SSAO|SSR/);
  assert.match(quality, /maxDpr:\s*1\.75/);
  assert.match(quality, /maxDpr:\s*1\.35/);
  assert.match(quality, /maxDpr:\s*1,/);
});

test('visual theme centralizes terrain structure water and atmosphere palettes', async () => {
  const theme = await source('lib/hex-world/visual-theme.ts');

  for (const token of ['terrain', 'structures', 'vegetation', 'water', 'atmosphere']) {
    assert.match(theme, new RegExp(token));
  }
  assert.match(theme, /HexVisualEnvironment/);
  assert.match(theme, /getHexVisualEnvironment/);
});
