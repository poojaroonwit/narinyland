export type HexQualityName = 'high' | 'medium' | 'mobile';

export type HexQualityProfile = {
  name: HexQualityName;
  maxDpr: number;
  shadowMapSize: 2048 | 1024 | 512;
  contactShadowResolution: 512 | 256 | 128;
  cloudLayers: 3 | 2 | 1;
  ambientDensity: 1 | 0.75 | 0.5;
  particleCount: 180 | 90 | 36;
  windStrength: 1 | 0.55 | 0.2;
  waterDetail: 'full' | 'reduced' | 'basic';
};

const HIGH: HexQualityProfile = {
  name: 'high',
  maxDpr: 1.75,
  shadowMapSize: 2048,
  contactShadowResolution: 512,
  cloudLayers: 3,
  ambientDensity: 1,
  particleCount: 180,
  windStrength: 1,
  waterDetail: 'full',
};

const MEDIUM: HexQualityProfile = {
  name: 'medium',
  maxDpr: 1.35,
  shadowMapSize: 1024,
  contactShadowResolution: 256,
  cloudLayers: 2,
  ambientDensity: 0.75,
  particleCount: 90,
  windStrength: 0.55,
  waterDetail: 'reduced',
};

const MOBILE: HexQualityProfile = {
  name: 'mobile',
  maxDpr: 1,
  shadowMapSize: 512,
  contactShadowResolution: 128,
  cloudLayers: 1,
  ambientDensity: 0.5,
  particleCount: 36,
  windStrength: 0.2,
  waterDetail: 'basic',
};

export function resolveHexQualityProfile(input: {
  graphicsQuality?: string | null;
  viewportWidth: number;
  devicePixelRatio?: number;
}): HexQualityProfile {
  if (input.viewportWidth < 640) return MOBILE;
  if (input.graphicsQuality === 'high') return HIGH;
  if (input.graphicsQuality === 'medium') return MEDIUM;
  return MOBILE;
}
