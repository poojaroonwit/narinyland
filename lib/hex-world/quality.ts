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
  vegetationMotion: 'full' | 'reduced' | 'minimal';
  placementParticleCount: 20 | 10 | 4;
  waterGlintCount: 3 | 1 | 0;
  cloudParallaxScale: 1 | 0.6 | 0.25;
  materialVariation: 'full' | 'reduced';
  exploreGroundPerTile: 4 | 3 | 1;
  exploreDecorPerTile: 3 | 2 | 1;
  exploreStructureDetail: 1 | 0.75 | 0.4;
  groundCoverPerTile: 5 | 3 | 1;
  treeLeafClusters: 7 | 5 | 3;
  cliffDetailScale: 1 | 0.7 | 0.4;
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
  vegetationMotion: 'full',
  placementParticleCount: 20,
  waterGlintCount: 3,
  cloudParallaxScale: 1,
  materialVariation: 'full',
  exploreGroundPerTile: 4,
  exploreDecorPerTile: 3,
  exploreStructureDetail: 1,
  groundCoverPerTile: 5,
  treeLeafClusters: 7,
  cliffDetailScale: 1,
};

const MEDIUM: HexQualityProfile = {
  name: 'medium',
  maxDpr: 1.5,
  shadowMapSize: 1024,
  contactShadowResolution: 256,
  cloudLayers: 2,
  ambientDensity: 0.75,
  particleCount: 90,
  windStrength: 0.55,
  waterDetail: 'reduced',
  vegetationMotion: 'reduced',
  placementParticleCount: 10,
  waterGlintCount: 1,
  cloudParallaxScale: 0.6,
  materialVariation: 'reduced',
  exploreGroundPerTile: 3,
  exploreDecorPerTile: 2,
  exploreStructureDetail: 0.75,
  groundCoverPerTile: 3,
  treeLeafClusters: 5,
  cliffDetailScale: 0.7,
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
  vegetationMotion: 'minimal',
  placementParticleCount: 4,
  waterGlintCount: 0,
  cloudParallaxScale: 0.25,
  materialVariation: 'reduced',
  exploreGroundPerTile: 1,
  exploreDecorPerTile: 1,
  exploreStructureDetail: 0.4,
  groundCoverPerTile: 1,
  treeLeafClusters: 3,
  cliffDetailScale: 0.4,
};

const QUALITY_RANK: Record<HexQualityName, number> = {
  mobile: 0,
  medium: 1,
  high: 2,
};

const QUALITY_PROFILE: Record<HexQualityName, HexQualityProfile> = {
  high: HIGH,
  medium: MEDIUM,
  mobile: MOBILE,
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

export function resolveAdaptiveHexQuality(
  staticProfile: HexQualityProfile,
  performanceFactor: number,
): HexQualityProfile {
  const factor = Number.isFinite(performanceFactor)
    ? Math.max(0, Math.min(1, performanceFactor))
    : 1;
  const requestedName: HexQualityName = factor < 0.4
    ? 'mobile'
    : factor < 0.7
      ? 'medium'
      : staticProfile.name;
  const effectiveName = QUALITY_RANK[requestedName] > QUALITY_RANK[staticProfile.name]
    ? staticProfile.name
    : requestedName;
  return QUALITY_PROFILE[effectiveName];
}
