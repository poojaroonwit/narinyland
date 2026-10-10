import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createOwnedPBRTextureBundle, disposePBRTextureBundle } from '@/lib/hex-world/pbr/terrain-materials';

test('owned PBR texture configuration isolates shared loader cache entries', () => {
  const baseColor = new THREE.Texture();
  const normal = new THREE.Texture();
  const roughness = new THREE.Texture();
  const cached = [baseColor, normal, roughness];

  const configured = createOwnedPBRTextureBundle({ baseColor, normal, roughness }, [3, 4], 16);

  assert.notEqual(configured.baseColor, baseColor, 'base color must not mutate the cached useTexture instance');
  assert.notEqual(configured.normal, normal, 'normal map must not mutate the cached useTexture instance');
  assert.notEqual(configured.roughness, roughness, 'roughness map must not mutate the cached useTexture instance');

  for (const texture of cached) {
    assert.equal(texture.wrapS, THREE.ClampToEdgeWrapping);
    assert.equal(texture.wrapT, THREE.ClampToEdgeWrapping);
    assert.equal(texture.repeat.x, 1);
    assert.equal(texture.repeat.y, 1);
    assert.equal(texture.anisotropy, 1);
    assert.equal(texture.colorSpace, THREE.NoColorSpace);
  }

  assert.equal(configured.baseColor.wrapS, THREE.RepeatWrapping);
  assert.equal(configured.baseColor.wrapT, THREE.RepeatWrapping);
  assert.equal(configured.baseColor.repeat.x, 3);
  assert.equal(configured.baseColor.repeat.y, 4);
  assert.equal(configured.baseColor.colorSpace, THREE.SRGBColorSpace);
  assert.equal(configured.normal.colorSpace, THREE.NoColorSpace);
  assert.equal(configured.roughness.colorSpace, THREE.NoColorSpace);
  assert.equal(configured.baseColor.anisotropy, 8);

  disposePBRTextureBundle(configured);
});
