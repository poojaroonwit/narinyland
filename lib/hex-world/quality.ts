import type { HexViewMode } from './view-mode';

export type HexQualityName = 'high' | 'medium' | 'mobile';

export type HexQualityProfile = {
  name: HexQualityName;
  maxDpr: 1.5 | 1.25 | 1;
  shadowMapSize: 2048 | 1024 | 512;
  contactShadowResolution: 512 | 256 | 128;
  cloudLayers: 3 | 2 | 1;
  ambientDensity: 1 | 0.75 | 0.5;
  particleCount: 120 | 64 | 28;
  windStrength: 1 | 0.5 | 0.2;
  waterDetail: 'full' | 'reduced' | 'basic';
  vegetationMotion: 'full' | 'reduced' | 'minimal';
  placementParticleCount: 16 | 8 | 3;
  waterGlintCount: 2 | 1 | 0;
  cloudParallaxScale: 1 | 0.6 | 0.25;
  materialVariation: 'full' | 'reduced';
  exploreGroundPerTile: 3 | 2 | 1;
  exploreDecorPerTile: 2 | 1;
  exploreStructureDetail: 0.85 | 0.65 | 0.4;
  groundCoverPerTile: 4 | 2 | 1;
  treeLeafClusters: 6 | 4 | 3;
  cliffDetailScale: 0.85 | 0.6 | 0.4;
  pbrTextureTier: '2k' | '1k';
  pbrVegetationScale: 0.85 | 0.5 | 0.25;
  pbrCliffPropBudget: 32 | 18 | 8;
  pbrGroundPropBudget: 144 | 64 | 28;
  pbrEnvironmentResolution: '2k' | '1k';
};

const HIGH: HexQualityProfile = {
  name: 'high', maxDpr: 1.5, shadowMapSize: 2048, contactShadowResolution: 512,
  cloudLayers: 3, ambientDensity: 1, particleCount: 120, windStrength: 1,
  waterDetail: 'full', vegetationMotion: 'full', placementParticleCount: 16,
  waterGlintCount: 2, cloudParallaxScale: 1, materialVariation: 'full',
  exploreGroundPerTile: 3, exploreDecorPerTile: 2, exploreStructureDetail: 0.85,
  groundCoverPerTile: 4, treeLeafClusters: 6, cliffDetailScale: 0.85,
  pbrTextureTier: '2k', pbrVegetationScale: 0.85, pbrCliffPropBudget: 32,
  pbrGroundPropBudget: 144, pbrEnvironmentResolution: '2k',
};

const MEDIUM: HexQualityProfile = {
  name: 'medium', maxDpr: 1.25, shadowMapSize: 1024, contactShadowResolution: 256,
  cloudLayers: 2, ambientDensity: 0.75, particleCount: 64, windStrength: 0.5,
  waterDetail: 'reduced', vegetationMotion: 'reduced', placementParticleCount: 8,
  waterGlintCount: 1, cloudParallaxScale: 0.6, materialVariation: 'reduced',
  exploreGroundPerTile: 2, exploreDecorPerTile: 1, exploreStructureDetail: 0.65,
  groundCoverPerTile: 2, treeLeafClusters: 4, cliffDetailScale: 0.6,
  pbrTextureTier: '1k', pbrVegetationScale: 0.5, pbrCliffPropBudget: 18,
  pbrGroundPropBudget: 64, pbrEnvironmentResolution: '1k',
};

const MOBILE: HexQualityProfile = {
  name: 'mobile', maxDpr: 1, shadowMapSize: 512, contactShadowResolution: 128,
  cloudLayers: 1, ambientDensity: 0.5, particleCount: 28, windStrength: 0.2,
  waterDetail: 'basic', vegetationMotion: 'minimal', placementParticleCount: 3,
  waterGlintCount: 0, cloudParallaxScale: 0.25, materialVariation: 'reduced',
  exploreGroundPerTile: 1, exploreDecorPerTile: 1, exploreStructureDetail: 0.4,
  groundCoverPerTile: 1, treeLeafClusters: 3, cliffDetailScale: 0.4,
  pbrTextureTier: '1k', pbrVegetationScale: 0.25, pbrCliffPropBudget: 8,
  pbrGroundPropBudget: 28, pbrEnvironmentResolution: '1k',
};

const QUALITY_RANK: Record<HexQualityName, number> = { mobile: 0, medium: 1, high: 2 };
const QUALITY_PROFILE: Record<HexQualityName, HexQualityProfile> = { high: HIGH, medium: MEDIUM, mobile: MOBILE };

export function resolveHexQualityProfile(input: {
  graphicsQuality?: string | null;
  viewportWidth: number;
  devicePixelRatio?: number;
}): HexQualityProfile {
  if (input.viewportWidth < 640) return MOBILE;

  const devicePixelRatio = Number.isFinite(input.devicePixelRatio)
    ? Math.max(1, input.devicePixelRatio ?? 1)
    : 1;
  const compactHighDensityDisplay = devicePixelRatio >= 2 && input.viewportWidth <= 1440;

  if (input.graphicsQuality === 'high') return compactHighDensityDisplay ? MEDIUM : HIGH;
  if (input.graphicsQuality === 'medium') return MEDIUM;
  return MOBILE;
}

export function resolveAdaptiveHexQuality(
  staticProfile: HexQualityProfile,
  performanceFactor: number,
): HexQualityProfile {
  const factor = Number.isFinite(performanceFactor) ? Math.max(0, Math.min(1, performanceFactor)) : 1;
  const requestedName: HexQualityName = factor < 0.55 ? 'mobile' : factor < 0.82 ? 'medium' : staticProfile.name;
  const effectiveName = QUALITY_RANK[requestedName] > QUALITY_RANK[staticProfile.name] ? staticProfile.name : requestedName;
  return QUALITY_PROFILE[effectiveName];
}

export function shouldRenderHexDirectionalShadows(profile: HexQualityProfile): boolean {
  return profile.name !== 'mobile';
}

export function shouldRenderHexContactShadows(profile: HexQualityProfile, viewMode: HexViewMode): boolean {
  return profile.name === 'high' && viewMode === 'world';
}
