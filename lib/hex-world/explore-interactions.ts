import { axialToWorld } from './hex-grid';
import { getLivingBuildingRole, type LivingBuildingRole } from './living-homestead';
import type { HexPlayerPosition } from './player-exploration';
import type { HexBuildingDTO } from './types';

export const HEX_EXPLORE_INTERACTION_RADIUS = 1.7;

type SupportedLivingBuildingRole = Exclude<LivingBuildingRole, null>;

export type HexExploreInteractionTarget = {
  buildingId: string;
  building: HexBuildingDTO;
  role: SupportedLivingBuildingRole;
  distance: number;
};

export function getExploreInteractionTarget(
  player: Pick<HexPlayerPosition, 'x' | 'z'>,
  buildings: HexBuildingDTO[],
): HexExploreInteractionTarget | null {
  let best: HexExploreInteractionTarget | null = null;

  for (const building of buildings) {
    const role = getLivingBuildingRole(building.buildingKey);
    if (!role) continue;

    const world = axialToWorld({ q: building.anchorQ, r: building.anchorR });
    const distance = Math.hypot(world.x - player.x, world.z - player.z);
    if (!Number.isFinite(distance) || distance > HEX_EXPLORE_INTERACTION_RADIUS) continue;

    const candidate: HexExploreInteractionTarget = {
      buildingId: building.id,
      building,
      role,
      distance,
    };

    if (
      !best
      || distance < best.distance
      || (Math.abs(distance - best.distance) < 1e-12 && building.id.localeCompare(best.buildingId) < 0)
    ) {
      best = candidate;
    }
  }

  return best;
}
