"use client";

import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { buildIslandCliffMesh } from '@/lib/hex-world/island-boundary';
import { buildNaturalTerrainMesh } from '@/lib/hex-world/natural-terrain';
import { createOwnedPBRTextureBundle, disposePBRTextureBundle } from '@/lib/hex-world/pbr/terrain-materials';
import { getPBRTextureSet } from '@/lib/hex-world/pbr/quality-assets';
import type { HexQualityProfile } from '@/lib/hex-world/quality';
import type { HexTileDTO } from '@/lib/hex-world/types';

const CLIFF_SOIL_REPEAT = [2.1, 3.0] as const;
const CLIFF_ROCK_REPEAT = [2.7, 4.2] as const;
const materialIndex = { soil: 0, upperRock: 1, lowerRock: 2 } as const;

export function HexPBRCliff({ tiles, seed, profile }: { tiles: HexTileDTO[]; seed: string; profile: HexQualityProfile }) {
  const soilPaths = getPBRTextureSet('soil', profile.name);
  const rockPaths = getPBRTextureSet('cliff', profile.name);
  const [soilBase, soilNormal, soilRoughness] = useTexture([soilPaths.baseColor, soilPaths.normal, soilPaths.roughness]);
  const [rockBase, rockNormal, rockRoughness] = useTexture([rockPaths.baseColor, rockPaths.normal, rockPaths.roughness]);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const soil = useMemo(
    () => createOwnedPBRTextureBundle({ baseColor: soilBase, normal: soilNormal, roughness: soilRoughness }, CLIFF_SOIL_REPEAT, maxAnisotropy),
    [maxAnisotropy, soilBase, soilNormal, soilRoughness],
  );
  const rock = useMemo(
    () => createOwnedPBRTextureBundle({ baseColor: rockBase, normal: rockNormal, roughness: rockRoughness }, CLIFF_ROCK_REPEAT, maxAnisotropy),
    [maxAnisotropy, rockBase, rockNormal, rockRoughness],
  );
  useEffect(() => () => disposePBRTextureBundle(soil), [soil]);
  useEffect(() => () => disposePBRTextureBundle(rock), [rock]);

  const terrain = useMemo(() => buildNaturalTerrainMesh(tiles, seed), [seed, tiles]);
  const shell = useMemo(() => buildIslandCliffMesh(terrain.boundaryEdges, seed), [seed, terrain.boundaryEdges]);
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(shell.positions, 3));
    next.setAttribute('uv', new THREE.Float32BufferAttribute(shell.uvs, 2));
    next.setIndex(shell.indices);
    for (const group of shell.groups) next.addGroup(group.start, group.count, materialIndex[group.material]);
    next.computeVertexNormals();
    next.computeBoundingBox();
    next.computeBoundingSphere();
    return next;
  }, [shell]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  if (!shell.indices.length) return null;

  return (
    <mesh geometry={geometry} castShadow={profile.name !== 'mobile'} receiveShadow raycast={() => {}}>
      <meshStandardMaterial
        attach="material-0"
        map={soil.baseColor}
        normalMap={soil.normal}
        roughnessMap={soil.roughness}
        color="#94745d"
        normalScale={new THREE.Vector2(0.52, 0.52)}
        roughness={0.98}
        metalness={0}
      />
      <meshStandardMaterial
        attach="material-1"
        map={rock.baseColor}
        normalMap={rock.normal}
        roughnessMap={rock.roughness}
        color="#8f918d"
        normalScale={new THREE.Vector2(0.74, 0.74)}
        roughness={0.96}
        metalness={0}
      />
      <meshStandardMaterial
        attach="material-2"
        map={rock.baseColor}
        normalMap={rock.normal}
        roughnessMap={rock.roughness}
        color="#727b80"
        normalScale={new THREE.Vector2(0.84, 0.84)}
        roughness={0.98}
        metalness={0}
      />
    </mesh>
  );
}
