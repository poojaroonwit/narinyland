"use client";

import { useEffect, useMemo } from 'react';
import { useEnvironment, useGLTF, useTexture } from '@react-three/drei';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import {
  getPBREnvironmentPathForQuality,
  getPBRModelPathForQuality,
  getPBRSharedEssentialPaths,
  type HexPBRModelName,
} from '@/lib/hex-world/pbr/quality-assets';

const PRELOAD_MODELS: readonly HexPBRModelName[] = ['tree', 'shrub', 'fern', 'grassTuft', 'rockSet', 'stump'];

export function HexPBRAssetPreloader({
  profile,
  modelNames = PRELOAD_MODELS,
}: {
  profile: HexQualityProfile;
  modelNames?: readonly HexPBRModelName[];
}) {
  const environmentPath = getPBREnvironmentPathForQuality(profile.name);
  const essentialPaths = useMemo(() => getPBRSharedEssentialPaths(profile), [profile]);
  const modelPaths = useMemo(
    () => modelNames.map((name) => getPBRModelPathForQuality(name, profile.name)),
    [modelNames, profile.name],
  );

  // Populate Drei's shared loader caches before the corresponding visual layers mount.
  useEffect(() => {
    for (const path of essentialPaths) {
      if (!path.endsWith('.hdr')) useTexture.preload(path);
    }
    for (const path of modelPaths) useGLTF.preload(path);
  }, [essentialPaths, modelPaths]);

  // The HDRI is loaded through RGBE-aware Drei environment loading rather than TextureLoader.
  useEnvironment({ files: environmentPath });

  return null;
}
