"use client";

import React from 'react';
import { axialToWorld } from '@/lib/hex-world/hex-grid';
import { hexRotationToRadians } from '@/lib/hex-world/rendering';
import type { HexBuildingDTO, HexTileDTO } from '@/lib/hex-world/types';
import { HexBuildingModel } from './HexBuildingModels';

export function HexBuildings({
  buildings,
  tiles,
  selectedBuildingId,
  onSelect,
}: {
  buildings: HexBuildingDTO[];
  tiles: HexTileDTO[];
  selectedBuildingId?: string | null;
  onSelect?: (building: HexBuildingDTO) => void;
}) {
  const tileHeight = new Map(tiles.map((tile) => [`${tile.q}:${tile.r}`, tile.height]));
  return <>{buildings.map((building) => {
    const height = tileHeight.get(`${building.anchorQ}:${building.anchorR}`) ?? 0;
    const position = axialToWorld({ q: building.anchorQ, r: building.anchorR }, 1, height + 0.02);
    return (
      <group
        key={building.id}
        position={[position.x, position.y, position.z]}
        rotation={[0, hexRotationToRadians(building.rotation), 0]}
        scale={selectedBuildingId === building.id ? 1.06 : 1}
        onClick={(event) => { event.stopPropagation(); onSelect?.(building); }}
      >
        <HexBuildingModel buildingKey={building.buildingKey} />
      </group>
    );
  })}</>;
}
