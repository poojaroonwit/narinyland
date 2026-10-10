"use client";

import React from 'react';
import type { BuildingTier } from '@/lib/building-progression';
import { HexPBRStructureModel } from './pbr/HexPBRBuildings';
import { HexStorybookBuildingModel } from './storybook/HexStorybookBuildingModels';
import { HexDecorModel } from './models/HexDecorModels';
import { HexNatureModel } from './models/HexNatureModels';

export function HexBuildingModel({
  buildingKey,
  ghost = false,
  selected = false,
  tier = 1,
  visualStyle = 'storybook',
}: {
  buildingKey: string;
  ghost?: boolean;
  selected?: boolean;
  tier?: BuildingTier;
  visualStyle?: 'storybook' | 'natural';
}) {
  if (visualStyle === 'storybook') return <HexStorybookBuildingModel buildingKey={buildingKey} ghost={ghost} selected={selected} tier={tier} />;
  if (buildingKey === 'home' || buildingKey === 'barn' || buildingKey === 'storage' || buildingKey === 'workshop') {
    return <HexPBRStructureModel buildingKey={buildingKey} ghost={ghost} selected={selected} tier={tier} />;
  }
  if (buildingKey === 'tree' || buildingKey === 'flower_patch' || buildingKey === 'pond' || buildingKey === 'garden_patch') {
    return <HexNatureModel buildingKey={buildingKey} ghost={ghost} selected={selected} />;
  }
  if (buildingKey === 'bench' || buildingKey === 'lamp' || buildingKey === 'fence' || buildingKey === 'stone_path') {
    return <HexDecorModel buildingKey={buildingKey} ghost={ghost} selected={selected} />;
  }
  return null;
}
