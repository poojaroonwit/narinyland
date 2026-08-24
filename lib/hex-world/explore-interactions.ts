import { axialToWorld } from './hex-grid';
import { getLivingBuildingRole, type LivingBuildingRole } from './living-homestead';
import type { HexPlayerPosition } from './player-exploration';
import type { HexBuildingDTO } from './types';

export const HEX_EXPLORE_INTERACTION_RADIUS = 1.7;

export type SupportedLivingBuildingRole = Exclude<LivingBuildingRole, null>;
export type HexResidentId = 'partner-1' | 'partner-2' | 'child' | 'pet';
export type HexResidentRole = 'partner' | 'child' | 'pet';

export type HexResidentInteractionSample = {
  residentId: HexResidentId;
  role: HexResidentRole;
  petKind?: 'cat' | 'dog';
  x: number;
  z: number;
};

export type HexExploreBuildingInteractionTarget = {
  kind: 'building';
  id: string;
  buildingId: string;
  building: HexBuildingDTO;
  role: SupportedLivingBuildingRole;
  distance: number;
};

export type HexExploreResidentInteractionTarget = {
  kind: 'resident';
  id: string;
  residentId: HexResidentId;
  residentRole: HexResidentRole;
  petKind?: 'cat' | 'dog';
  x: number;
  z: number;
  distance: number;
};

export type HexExploreInteractionTarget =
  | HexExploreBuildingInteractionTarget
  | HexExploreResidentInteractionTarget;

function withinRadius(distance: number, radius: number): boolean {
  return Number.isFinite(distance) && distance <= radius;
}

export function getExploreInteractionTarget(
  player: Pick<HexPlayerPosition, 'x' | 'z'>,
  buildings: HexBuildingDTO[],
  residentsOrRadius: HexResidentInteractionSample[] | number = [],
  radius = HEX_EXPLORE_INTERACTION_RADIUS,
): HexExploreInteractionTarget | null {
  const residents = Array.isArray(residentsOrRadius) ? residentsOrRadius : [];
  const interactionRadius = typeof residentsOrRadius === 'number' ? residentsOrRadius : radius;
  const candidates: HexExploreInteractionTarget[] = [];

  for (const building of buildings) {
    const role = getLivingBuildingRole(building.buildingKey);
    if (!role) continue;

    const world = axialToWorld({ q: building.anchorQ, r: building.anchorR });
    const distance = Math.hypot(world.x - player.x, world.z - player.z);
    if (!withinRadius(distance, interactionRadius)) continue;

    candidates.push({
      kind: 'building',
      id: `building:${building.id}`,
      buildingId: building.id,
      building,
      role,
      distance,
    });
  }

  for (const resident of residents) {
    if (!Number.isFinite(resident.x) || !Number.isFinite(resident.z)) continue;
    const distance = Math.hypot(resident.x - player.x, resident.z - player.z);
    if (!withinRadius(distance, interactionRadius)) continue;

    candidates.push({
      kind: 'resident',
      id: `resident:${resident.residentId}`,
      residentId: resident.residentId,
      residentRole: resident.role,
      ...(resident.petKind ? { petKind: resident.petKind } : {}),
      x: resident.x,
      z: resident.z,
      distance,
    });
  }

  candidates.sort((left, right) => {
    const distanceDelta = left.distance - right.distance;
    if (Math.abs(distanceDelta) >= 1e-12) return distanceDelta;
    return left.id.localeCompare(right.id);
  });

  return candidates[0] ?? null;
}
