import {
  HEX_PBR_LOCAL_ASSETS,
  type HexPBRModelId,
  type HexPBRResolution,
  type HexPBRTextureId,
  type HexPBRTextureRole,
} from './asset-manifest';

const ROOT = '/assets/hex-world/';

function localAsset(relativePath: string): string {
  if (!relativePath || relativePath.startsWith('/') || relativePath.includes('..') || /^https?:/i.test(relativePath)) {
    throw new Error(`HEX_PBR_INVALID_LOCAL_PATH:${relativePath}`);
  }
  return `${ROOT}${relativePath}`;
}

export function getPBRAssetPath(relativePath: string): string {
  return localAsset(relativePath);
}

export function getPBRTexturePath(
  id: HexPBRTextureId,
  role: HexPBRTextureRole,
  resolution: HexPBRResolution,
): string {
  const entry = HEX_PBR_LOCAL_ASSETS.textures[id] as Partial<Record<HexPBRResolution, Record<HexPBRTextureRole, string>>>;
  const selected = entry[resolution] ?? entry['1k'];
  const path = selected?.[role];
  if (!path) throw new Error(`HEX_PBR_TEXTURE_MISSING:${id}:${role}:${resolution}`);
  return localAsset(path);
}

export function getPBRModelPath(id: HexPBRModelId): string {
  return localAsset(HEX_PBR_LOCAL_ASSETS.models[id]);
}

export function getPBREnvironmentPath(resolution: HexPBRResolution): string {
  return localAsset(HEX_PBR_LOCAL_ASSETS.environment[resolution]);
}
