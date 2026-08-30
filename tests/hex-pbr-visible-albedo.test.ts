import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getHexTerrainPBRStyle } from '@/lib/hex-world/pbr/terrain-surface-style';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '');

test('terrain styles carry explicit albedo readability above neutral sampling', () => {
  for (const surface of ['grass', 'soil', 'path', 'stone'] as const) {
    const style = getHexTerrainPBRStyle(surface) as ReturnType<typeof getHexTerrainPBRStyle> & {
      albedoContrast?: number;
      albedoSaturation?: number;
    };
    assert.ok((style.albedoContrast ?? 1) > 1, `${surface} needs visible albedo contrast`);
    assert.ok((style.albedoSaturation ?? 1) >= 1, `${surface} must not wash out source color`);
  }
  assert.ok(((getHexTerrainPBRStyle('soil') as { albedoContrast?: number }).albedoContrast ?? 1) >= 1.25);
  assert.ok(((getHexTerrainPBRStyle('path') as { albedoContrast?: number }).albedoContrast ?? 1) >= 1.2);
});

test('terrain material injects albedo readability after the PBR map sample', async () => {
  const [terrain, shader] = await Promise.all([
    source('components/hex-world/pbr/HexPBRTerrain.tsx'),
    source('lib/hex-world/pbr/terrain-albedo-shader.ts'),
  ]);

  assert.match(terrain, /onBeforeCompile|applyTerrainAlbedoReadability/);
  assert.match(shader, /map_fragment/);
  assert.match(shader, /uTerrainAlbedoContrast/);
  assert.match(shader, /uTerrainAlbedoSaturation/);
  assert.match(shader, /diffuseColor\.rgb/);
  assert.doesNotMatch(shader, /discard|opacity\s*=\s*0/);
});
