import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import {
  createOwnedPBRTextureBundle,
  disposePBRTextureBundle,
} from '@/lib/hex-world/pbr/terrain-materials';

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function textureWithRepeat(x: number, y: number) {
  const texture = new THREE.Texture();
  texture.repeat.set(x, y);
  return texture;
}

test('owned PBR bundles clone loader-cache textures before configuring them', () => {
  const baseColor = textureWithRepeat(1, 1);
  const normal = textureWithRepeat(1, 1);
  const roughness = textureWithRepeat(1, 1);

  const owned = createOwnedPBRTextureBundle({ baseColor, normal, roughness }, [2.7, 2.45], 16);

  assert.notEqual(owned.baseColor, baseColor);
  assert.notEqual(owned.normal, normal);
  assert.notEqual(owned.roughness, roughness);
  assert.deepEqual(baseColor.repeat.toArray(), [1, 1]);
  assert.deepEqual(normal.repeat.toArray(), [1, 1]);
  assert.deepEqual(roughness.repeat.toArray(), [1, 1]);
  assert.deepEqual(owned.baseColor.repeat.toArray(), [2.7, 2.45]);
  assert.equal(owned.baseColor.colorSpace, THREE.SRGBColorSpace);
  assert.equal(owned.normal.colorSpace, THREE.NoColorSpace);
  assert.equal(owned.roughness.colorSpace, THREE.NoColorSpace);
  assert.equal(owned.baseColor.anisotropy, 8);
});

test('owned PBR bundles have one cleanup helper', () => {
  let disposed = 0;
  const bundle = {
    baseColor: new THREE.Texture(),
    normal: new THREE.Texture(),
    roughness: new THREE.Texture(),
  };
  for (const texture of Object.values(bundle)) texture.dispose = () => { disposed += 1; };

  disposePBRTextureBundle(bundle);
  assert.equal(disposed, 3);
});

test('terrain and cliff renderers configure owned textures rather than Drei cache objects', async () => {
  const [terrain, cliff] = await Promise.all([
    source('components/hex-world/pbr/HexPBRTerrain.tsx'),
    source('components/hex-world/pbr/HexPBRCliff.tsx'),
  ]);

  for (const renderer of [terrain, cliff]) {
    assert.match(renderer, /createOwnedPBRTextureBundle/);
    assert.match(renderer, /disposePBRTextureBundle/);
  }
});
