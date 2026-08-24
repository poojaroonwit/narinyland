import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

test('explore structure details and atmosphere stay visual-only', async () => {
  const [details, atmosphere] = await Promise.all([
    source('components/hex-world/HexExploreStructureDetails.tsx'),
    source('components/hex-world/HexExploreAtmosphere.tsx'),
  ]);
  assert.match(details, /HexExploreStructureDetails/);
  assert.match(atmosphere, /fog|Fog/i);
  assert.match(details, /home|barn|storage|workshop/);
  assert.doesNotMatch(`${details}\n${atmosphere}`, /fetch\(|hexWorldAPI|prisma|api\//);
});

test('person mode mounts detail atmosphere and keeps one primary shadow light without postprocessing', async () => {
  const [world, lighting] = await Promise.all([
    source('components/hex-world/HexWorld3D.tsx'),
    source('components/hex-world/HexWorldLighting.tsx'),
  ]);
  assert.match(world, /HexExploreStructureDetails/);
  assert.match(world, /HexExploreAtmosphere/);
  assert.match(world, /viewMode\s*===\s*['"]person['"]/);
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
  assert.doesNotMatch(`${world}\n${lighting}`, /EffectComposer|Bloom|DepthOfField|volumetric/i);
});
