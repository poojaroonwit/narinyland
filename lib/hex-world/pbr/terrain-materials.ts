import * as THREE from 'three';

export type HexPBRTextureBundle = {
  baseColor: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
};

export function configurePBRTextureBundle(
  bundle: HexPBRTextureBundle,
  repeat: readonly [number, number],
  anisotropy = 4,
): HexPBRTextureBundle {
  const [repeatX, repeatY] = repeat;
  bundle.baseColor.colorSpace = THREE.SRGBColorSpace;
  bundle.normal.colorSpace = THREE.NoColorSpace;
  bundle.roughness.colorSpace = THREE.NoColorSpace;

  for (const texture of [bundle.baseColor, bundle.normal, bundle.roughness]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.max(1, Math.min(8, anisotropy));
    texture.needsUpdate = true;
  }
  return bundle;
}

export function createOwnedPBRTextureBundle(
  source: HexPBRTextureBundle,
  repeat: readonly [number, number],
  anisotropy = 4,
): HexPBRTextureBundle {
  return configurePBRTextureBundle({
    baseColor: source.baseColor.clone(),
    normal: source.normal.clone(),
    roughness: source.roughness.clone(),
  }, repeat, anisotropy);
}

export function disposePBRTextureBundle(bundle: HexPBRTextureBundle): void {
  bundle.baseColor.dispose();
  bundle.normal.dispose();
  bundle.roughness.dispose();
}
