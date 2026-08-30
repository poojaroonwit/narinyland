import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('floating island cliff renders three PBR geological layers', async () => {
  const cliff = await source('components/hex-world/pbr/HexPBRCliff.tsx');
  assert.equal((cliff.match(/<meshStandardMaterial\b/g) ?? []).length, 3);
  assert.match(cliff, /upperRock/);
  assert.match(cliff, /lowerRock/);
  assert.match(cliff, /materialIndex/);
  assert.ok((cliff.match(/normalMap=/g) ?? []).length >= 3);
  assert.ok((cliff.match(/roughnessMap=/g) ?? []).length >= 3);
  assert.doesNotMatch(cliff, /meshBasicMaterial|https?:\/\/|Math\.random/);
});

test('World sells altitude with below-island cloud layers and no island-scale contact floor', async () => {
  const sky = await source('components/hex-world/HexSkyAtmosphere.tsx');
  const lighting = await source('components/hex-world/HexWorldLighting.tsx');
  assert.match(sky, /BELOW_ISLAND_CLOUDS/);
  assert.match(sky, /BelowIslandHaze/);
  assert.match(lighting, /explore\s*&&\s*\(/);
  assert.match(lighting, /position=\{\[0,\s*-0\.03,\s*0\]\}/);
  assert.equal((lighting.match(/<directionalLight\b/g) ?? []).length, 1);
});
