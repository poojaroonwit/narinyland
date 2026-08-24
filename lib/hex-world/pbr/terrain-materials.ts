import * as THREE from 'three';

export type HexPBRTextureBundle = {
  baseColor: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
};

export function configurePBRTextureBundle(
  bundle: HexPBRTextureBundle,
  repeat: [number, number],
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
