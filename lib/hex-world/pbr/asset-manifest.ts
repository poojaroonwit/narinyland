export type HexPBRResolution = '1k' | '2k';
export type HexPBRTextureRole = 'baseColor' | 'normal' | 'roughness';
export type HexPBRTextureId = 'grass_surface' | 'soil_surface' | 'path_surface' | 'cliff_surface' | 'wood_surface' | 'plaster_surface' | 'roof_surface';
export type HexPBRModelId = 'tree' | 'shrub' | 'fern' | 'grass_tuft' | 'rock_set' | 'stump';

export const HEX_PBR_LOCAL_ASSETS = {
  textures: {
    grass_surface: {
      '1k': { baseColor: 'textures/grass_surface/baseColor_1k.jpg', normal: 'textures/grass_surface/normal_1k.jpg', roughness: 'textures/grass_surface/roughness_1k.jpg' },
      '2k': { baseColor: 'textures/grass_surface/baseColor_2k.jpg', normal: 'textures/grass_surface/normal_2k.jpg', roughness: 'textures/grass_surface/roughness_2k.jpg' },
    },
    soil_surface: {
      '1k': { baseColor: 'textures/soil_surface/baseColor_1k.jpg', normal: 'textures/soil_surface/normal_1k.jpg', roughness: 'textures/soil_surface/roughness_1k.jpg' },
    },
    path_surface: {
      '1k': { baseColor: 'textures/path_surface/baseColor_1k.jpg', normal: 'textures/path_surface/normal_1k.jpg', roughness: 'textures/path_surface/roughness_1k.jpg' },
    },
    cliff_surface: {
      '1k': { baseColor: 'textures/cliff_surface/baseColor_1k.jpg', normal: 'textures/cliff_surface/normal_1k.jpg', roughness: 'textures/cliff_surface/roughness_1k.jpg' },
      '2k': { baseColor: 'textures/cliff_surface/baseColor_2k.jpg', normal: 'textures/cliff_surface/normal_2k.jpg', roughness: 'textures/cliff_surface/roughness_2k.jpg' },
    },
    wood_surface: {
      '1k': { baseColor: 'textures/wood_surface/baseColor_1k.jpg', normal: 'textures/wood_surface/normal_1k.jpg', roughness: 'textures/wood_surface/roughness_1k.jpg' },
    },
    plaster_surface: {
      '1k': { baseColor: 'textures/plaster_surface/baseColor_1k.jpg', normal: 'textures/plaster_surface/normal_1k.jpg', roughness: 'textures/plaster_surface/roughness_1k.jpg' },
    },
    roof_surface: {
      '1k': { baseColor: 'textures/roof_surface/baseColor_1k.jpg', normal: 'textures/roof_surface/normal_1k.jpg', roughness: 'textures/roof_surface/roughness_1k.jpg' },
    },
  },
  models: {
    tree: 'models/tree/shrub_02_1k.gltf',
    shrub: 'models/shrub/shrub_03_1k.gltf',
    fern: 'models/fern/fern_02_1k.gltf',
    grass_tuft: 'models/grass_tuft/grass_medium_01_1k.gltf',
    rock_set: 'models/rock_set/rock_moss_set_01_1k.gltf',
    stump: 'models/stump/tree_stump_01_1k.gltf',
  },
  environment: {
    '1k': 'hdri/environment_1k.hdr',
    '2k': 'hdri/environment_2k.hdr',
  },
} as const;
