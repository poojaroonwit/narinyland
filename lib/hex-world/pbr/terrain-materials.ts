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
  const configured: HexPBRTextureBundle = {
    baseColor: bundle.baseColor.clone(),
    normal: bundle.normal.clone(),
    roughness: bundle.roughness.clone(),
  };
  const [repeatX, repeatY] = repeat;
  configured.baseColor.colorSpace = THREE.SRGBColorSpace;
  configured.normal.colorSpace = THREE.NoColorSpace;
  configured.roughness.colorSpace = THREE.NoColorSpace;

  for (const texture of [configured.baseColor, configured.normal, configured.roughness]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.max(1, Math.min(8, anisotropy));
    texture.needsUpdate = true;
  }
  return configured;
}
