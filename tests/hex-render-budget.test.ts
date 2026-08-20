import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('world scene uses bounded premium atmosphere without heavy postprocessing', async () => {
  const scene = await readFile(new URL('../components/hex-world/HexWorld3D.tsx', import.meta.url), 'utf8');
  assert.match(scene, /HexIslandUnderside/);
  assert.match(scene, /HexWorldParticles/);
  assert.match(scene, /HexWaterSurface/);
  assert.doesNotMatch(scene, /EffectComposer|DepthOfField|Bloom/);
});

test('premium atmosphere components stay visual-only', async () => {
  const files = [
    '../components/hex-world/HexIslandUnderside.tsx',
    '../components/hex-world/HexWorldParticles.tsx',
    '../components/hex-world/HexWaterSurface.tsx',
  ];
  for (const path of files) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8').catch(() => '');
    assert.doesNotMatch(source, /fetch\(|hexWorldAPI|prisma|api\//);
  }
});
