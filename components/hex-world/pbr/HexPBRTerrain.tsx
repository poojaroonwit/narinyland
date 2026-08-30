"use client";

import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { buildNaturalTerrainMesh, type NaturalTerrainMaterial } from '@/lib/hex-world/natural-terrain';
import { createOwnedPBRTextureBundle, disposePBRTextureBundle } from '@/lib/hex-world/pbr/terrain-materials';
import { getPBRTextureSet, type HexPBRMaterialName } from '@/lib/hex-world/pbr/quality-assets';
import { getHexTerrainPBRStyle, type HexTerrainPBRSurface } from '@/lib/hex-world/pbr/terrain-surface-style';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

const MATERIAL_INDEX: Record<NaturalTerrainMaterial, number> = { grass: 0, soil: 1, path: 2, stone: 3, water: 4 };
const GRASS_STYLE = getHexTerrainPBRStyle('grass');
const SOIL_STYLE = getHexTerrainPBRStyle('soil');
const PATH_STYLE = getHexTerrainPBRStyle('path');
const STONE_STYLE = getHexTerrainPBRStyle('stone');

function usePBRMaps(material: HexPBRMaterialName, profile: HexQualityProfile, surface: HexTerrainPBRSurface) {
  const paths = getPBRTextureSet(material, profile.name);
  const [baseColor, normal, roughness] = useTexture([paths.baseColor, paths.normal, paths.roughness]);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const style = getHexTerrainPBRStyle(surface);
  const bundle = useMemo(
    () => createOwnedPBRTextureBundle({ baseColor, normal, roughness }, style.repeat, maxAnisotropy),
    [baseColor, maxAnisotropy, normal, roughness, style.repeat],
  );
  useEffect(() => () => disposePBRTextureBundle(bundle), [bundle]);
  return bundle;
}

function normalScale(value: number) {
  return new THREE.Vector2(value, value);
}

export function HexPBRTerrain({ tiles, seed, profile }: { tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile }) {
  const grass = usePBRMaps('grass', profile, 'grass');
  const soil = usePBRMaps('soil', profile, 'soil');
  const path = usePBRMaps('path', profile, 'path');
  const stone = usePBRMaps('cliff', profile, 'stone');
  const meshData = useMemo(() => buildNaturalTerrainMesh(tiles, seed), [seed, tiles]);
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(meshData.positions, 3));
    next.setAttribute('uv', new THREE.Float32BufferAttribute(meshData.uvs, 2));
    next.setIndex(meshData.indices);
    for (const group of meshData.groups) next.addGroup(group.start, group.count, MATERIAL_INDEX[group.material]);
    next.computeVertexNormals();
    next.computeBoundingBox();
    next.computeBoundingSphere();
    return next;
  }, [meshData]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  if (!meshData.indices.length) return null;

  return (
    <mesh geometry={geometry} castShadow={profile.name !== 'mobile'} receiveShadow raycast={() => {}}>
      <meshStandardMaterial attach="material-0" map={grass.baseColor} normalMap={grass.normal} roughnessMap={grass.roughness} normalScale={normalScale(GRASS_STYLE.normalScale)} roughness={GRASS_STYLE.roughness} metalness={0} />
      <meshStandardMaterial attach="material-1" map={soil.baseColor} normalMap={soil.normal} roughnessMap={soil.roughness} normalScale={normalScale(SOIL_STYLE.normalScale)} roughness={SOIL_STYLE.roughness} metalness={0} />
      <meshStandardMaterial attach="material-2" map={path.baseColor} normalMap={path.normal} roughnessMap={path.roughness} normalScale={normalScale(PATH_STYLE.normalScale)} roughness={PATH_STYLE.roughness} metalness={0} />
      <meshStandardMaterial attach="material-3" map={stone.baseColor} normalMap={stone.normal} roughnessMap={stone.roughness} normalScale={normalScale(STONE_STYLE.normalScale)} roughness={STONE_STYLE.roughness} metalness={0} />
      <meshStandardMaterial attach="material-4" map={soil.baseColor} normalMap={soil.normal} roughnessMap={soil.roughness} color="#75806c" normalScale={normalScale(0.32)} roughness={0.98} metalness={0} />
    </mesh>
  );
}
