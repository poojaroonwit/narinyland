import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('living world visually interpolates deterministic resident transforms', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingWorldLayer.tsx', import.meta.url), 'utf8');
  assert.match(source, /getHomesteadPresencePosition/);
  assert.match(source, /smoothScalar/);
  assert.match(source, /smoothAngle/);
  assert.match(source, /HEX_SMOOTHNESS_DEFAULTS\.resident/);
  assert.doesNotMatch(source, /ref\.current\.rotation\.y\s*=\s*next\.heading/);
});

test('resident smoothing remains presentation-only', async () => {
  const source = await readFile(new URL('../components/hex-world/HexLivingWorldLayer.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /hexWorldAPI|prisma|fetch\(|api\//);
  assert.doesNotMatch(source, /onResidentSamplesChange|getExploreInteractionTarget/);
});

test('resident reporter remains independent from delayed visual interpolation', async () => {
  const reporter = await readFile(new URL('../components/hex-world/HexResidentInteractionReporter.tsx', import.meta.url), 'utf8');
  assert.match(reporter, /getHomesteadPresencePosition/);
  assert.doesNotMatch(reporter, /smoothScalar|smoothAngle|HEX_SMOOTHNESS_DEFAULTS/);
});
