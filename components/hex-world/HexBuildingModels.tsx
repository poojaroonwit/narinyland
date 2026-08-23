"use client";

import React from 'react';
import type { BuildingTier } from '@/lib/building-progression';
import { HexDecorModel } from './models/HexDecorModels';
import { HexNatureModel } from './models/HexNatureModels';
import { HexStructureModel } from './models/HexStructureModels';

export function HexBuildingModel({
  buildingKey,
  ghost = false,
  selected = false,
  tier = 1,
}: {
  buildingKey: string;
  ghost?: boolean;
  selected?: boolean;
  tier?: BuildingTier;
}) {
  if (buildingKey === 'home' || buildingKey === 'barn' || buildingKey === 'storage' || buildingKey === 'workshop') {
    return <HexStructureModel buildingKey={buildingKey} ghost={ghost} selected={selected} tier={tier} />;
  }
  if (buildingKey === 'tree' || buildingKey === 'flower_patch' || buildingKey === 'pond' || buildingKey === 'garden_patch') {
    return <HexNatureModel buildingKey={buildingKey} ghost={ghost} selected={selected} />;
  }
  if (buildingKey === 'bench' || buildingKey === 'lamp' || buildingKey === 'fence' || buildingKey === 'stone_path') {
    return <HexDecorModel buildingKey={buildingKey} ghost={ghost} selected={selected} />;
  }
  return null;
}
