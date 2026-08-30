"use client";

import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { buildNaturalTerrainMesh, type NaturalTerrainMaterial } from '@/lib/hex-world/natural-terrain';
import { createOwnedPBRTextureBundle, disposePBRTextureBundle } from '@/lib/hex-world/pbr/terrain-materials';
import { getPBRTextureSet, type HexPBRMaterialName } from '@/lib/hex-world/pbr/quality-assets';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

const MATERIAL_INDEX: Record<NaturalTerrainMaterial, number> = { grass: 0, soil: 1, path: 2, stone: 3, water: 4 };
const GRASS_REPEAT = [2.7, 2.7] as const;
const SOIL_REPEAT = [2.45, 2.45] as const;
const PATH_REPEAT = [2.15, 2.15] as const;
const STONE_REPEAT = [2.35, 2.35] as const;

function usePBRMaps(material: HexPBRMaterialName, profile: HexQualityProfile, repeat: readonly [number, number]) {
  const paths = getPBRTextureSet(material, profile.name);
  const [baseColor, normal, roughness] = useTexture([paths.baseColor, paths.normal, paths.roughness]);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const bundle = useMemo(
    () => createOwnedPBRTextureBundle({ baseColor, normal, roughness }, repeat, maxAnisotropy),
    [baseColor, maxAnisotropy, normal, repeat, roughness],
  );
  useEffect(() => () => disposePBRTextureBundle(bundle), [bundle]);
  return bundle;
}

export function HexPBRTerrain({ tiles, seed, profile }: { tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile }) {
  const grass = usePBRMaps('grass', profile, GRASS_REPEAT);
  const soil = usePBRMaps('soil', profile, SOIL_REPEAT);
  const path = usePBRMaps('path', profile, PATH_REPEAT);
  const stone = usePBRMaps('cliff', profile, STONE_REPEAT);
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
      <meshStandardMaterial attach="material-0" map={grass.baseColor} normalMap={grass.normal} roughnessMap={grass.roughness} normalScale={new THREE.Vector2(0.42, 0.42)} roughness={0.92} metalness={0} />
      <meshStandardMaterial attach="material-1" map={soil.baseColor} normalMap={soil.normal} roughnessMap={soil.roughness} normalScale={new THREE.Vector2(0.5, 0.5)} roughness={0.96} metalness={0} />
      <meshStandardMaterial attach="material-2" map={path.baseColor} normalMap={path.normal} roughnessMap={path.roughness} normalScale={new THREE.Vector2(0.45, 0.45)} roughness={0.97} metalness={0} />
      <meshStandardMaterial attach="material-3" map={stone.baseColor} normalMap={stone.normal} roughnessMap={stone.roughness} normalScale={new THREE.Vector2(0.55, 0.55)} roughness={0.95} metalness={0} />
      <meshStandardMaterial attach="material-4" map={soil.baseColor} normalMap={soil.normal} roughnessMap={soil.roughness} color="#75806c" normalScale={new THREE.Vector2(0.28, 0.28)} roughness={0.98} metalness={0} />
    </mesh>
  );
}
