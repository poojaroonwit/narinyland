import { FarmGameError } from './family-farm-game';
import {
  normalizeProgressionFarmState,
  performProgressionFarmAction,
  type ProgressionFamilyFarmState,
  type ProgressionFarmAction,
  type ProgressionFarmActionResult,
} from './family-farm-progression';
import {
  canUpgradeBuilding,
  getBuildingUpgradeCost,
  type BuildingTier,
  type ProgressionBuildingKey,
} from './building-progression';

export type HomesteadLifeAction =
  | ProgressionFarmAction
  | { type: 'upgrade_building'; buildingKey: ProgressionBuildingKey };

export function performHomesteadLifeAction(
  current: ProgressionFamilyFarmState,
  action: HomesteadLifeAction,
): ProgressionFarmActionResult {
  if (action.type !== 'upgrade_building') {
    return performProgressionFarmAction(current, action);
  }

  if (action.buildingKey === 'home') {
    return performProgressionFarmAction(current, { type: 'upgrade_home' });
  }

  const state = normalizeProgressionFarmState(current);
  const currentTier = state.buildingTiers[action.buildingKey] as BuildingTier;
  if (!canUpgradeBuilding(action.buildingKey, currentTier)) {
    throw new FarmGameError(`${action.buildingKey} is already at the maximum Tier 3.`);
  }

  const cost = getBuildingUpgradeCost(action.buildingKey, currentTier);
  if (state.coins < cost) {
    throw new FarmGameError(`Not enough coins to upgrade ${action.buildingKey}.`);
  }

  const nextTier = (currentTier + 1) as BuildingTier;
  state.coins -= cost;
  state.buildingTiers = {
    ...state.buildingTiers,
    [action.buildingKey]: nextTier,
  };
  const message = `Upgraded ${action.buildingKey} to Tier ${nextTier} for ${cost} coins.`;
  state.lastMessage = message;
  return { state, message };
}
