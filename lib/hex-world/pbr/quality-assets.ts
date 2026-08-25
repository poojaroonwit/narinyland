import type { HexQualityName, HexQualityProfile } from '../quality';
import { getPBREnvironmentPath, getPBRModelPath, getPBRTexturePath } from './asset-paths';

export type HexPBRMaterialName = 'grass' | 'soil' | 'path' | 'cliff' | 'wood' | 'plaster' | 'roof';
export type HexPBRModelName = 'tree' | 'shrub' | 'fern' | 'grassTuft' | 'rockSet' | 'stump';

const MATERIAL_ASSET = {
  grass: 'grass_surface', soil: 'soil_surface', path: 'path_surface', cliff: 'cliff_surface',
  wood: 'wood_surface', plaster: 'plaster_surface', roof: 'roof_surface',
} as const;

const MODEL_ASSET = {
  tree: 'tree', shrub: 'shrub', fern: 'fern', grassTuft: 'grass_tuft', rockSet: 'rock_set', stump: 'stump',
} as const;

function textureResolution(material: HexPBRMaterialName, quality: HexQualityName): '1k' | '2k' {
  return quality === 'high' && (material === 'grass' || material === 'cliff') ? '2k' : '1k';
}

export function getPBRTextureSet(material: HexPBRMaterialName, quality: HexQualityName) {
  const id = MATERIAL_ASSET[material];
  const resolution = textureResolution(material, quality);
  return {
    baseColor: getPBRTexturePath(id, 'baseColor', resolution),
    normal: getPBRTexturePath(id, 'normal', resolution),
    roughness: getPBRTexturePath(id, 'roughness', resolution),
    resolution,
  } as const;
}

export function getPBRModelPathForQuality(model: HexPBRModelName, _quality: HexQualityName): string {
  return getPBRModelPath(MODEL_ASSET[model]);
}

export function getPBREnvironmentPathForQuality(quality: HexQualityName): string {
  return getPBREnvironmentPath(quality === 'high' ? '2k' : '1k');
}

export function getPBRSharedEssentialPaths(profile: HexQualityProfile): string[] {
  const terrain = (['grass', 'soil', 'path', 'cliff'] as const).flatMap((material) => {
    const set = getPBRTextureSet(material, profile.name);
    return [set.baseColor, set.normal, set.roughness];
  });
  return [...terrain, getPBREnvironmentPathForQuality(profile.name)];
}
