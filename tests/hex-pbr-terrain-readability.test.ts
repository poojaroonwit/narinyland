import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as surfaceStyle from '@/lib/hex-world/pbr/terrain-surface-style';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('terrain surface styles enlarge low-contrast soil and path detail without flattening PBR maps', () => {
  const getStyle = (surfaceStyle as typeof surfaceStyle & {
    getHexTerrainPBRStyle?: typeof surfaceStyle.getHexTerrainPBRStyle;
  }).getHexTerrainPBRStyle;
  assert.equal(typeof getStyle, 'function');
  if (!getStyle) return;

  const grass = getStyle('grass');
  const soil = getStyle('soil');
  const path = getStyle('path');
  const stone = getStyle('stone');

  for (const style of [grass, soil, path, stone]) {
    assert.ok(style.repeat[0] > 0 && style.repeat[0] <= 3);
    assert.ok(style.repeat[1] > 0 && style.repeat[1] <= 3);
    assert.ok(style.normalScale >= 0.4 && style.normalScale <= 0.8);
    assert.ok(style.roughness >= 0.85 && style.roughness <= 1);
  }

  assert.ok(soil.repeat[0] <= 1.6, 'soil macro detail should stay visible from the game camera');
  assert.ok(path.repeat[0] <= 1.4, 'path macro detail should stay visible from the game camera');
  assert.ok(soil.normalScale > grass.normalScale, 'muted soil needs stronger relief than grass');
  assert.ok(path.normalScale > grass.normalScale, 'muted path needs stronger relief than grass');
});

test('PBR terrain consumes centralized readability styles while retaining full texture maps', async () => {
  const terrain = await source('components/hex-world/pbr/HexPBRTerrain.tsx');
  assert.match(terrain, /getHexTerrainPBRStyle/);
  assert.match(terrain, /map=/);
  assert.match(terrain, /normalMap=/);
  assert.match(terrain, /roughnessMap=/);
  assert.doesNotMatch(terrain, /meshBasicMaterial/);
});
