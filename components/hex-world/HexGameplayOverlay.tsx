"use client";

import React from 'react';
import type { HomesteadLifeAction, HomesteadLifeState } from '@/lib/homestead-life-engine';
import {
  ZERO_HEX_EXPLORE_MOVEMENT,
  type HexExploreMovementInput,
} from '@/lib/hex-world/explore-movement-input';
import type { HexBuildingDTO, HexWorldSnapshot } from '@/lib/hex-world/types';
import type { HexViewMode } from '@/lib/hex-world/view-mode';
import { HexExploreHUD } from './HexExploreHUD';
import { HexInventorySheet } from './HexInventorySheet';
import { HexLivingActionPanel } from './HexLivingActionPanel';
import { HexLivingHUD, type HexHudPanel } from './HexLivingHUD';
import { HexQuickActionPanel } from './HexQuickActionPanel';
import { HexWorldToolbar, type HexGameplayAction } from './HexWorldToolbar';

export function HexGameplayOverlay({
  snapshot,
  livingState,
  livingLoading,
  livingError,
  livingBusy,
  musicMuted,
  onToggleMusic,
  onLivingAction,
  onLivingRetry,
  selectedBuilding,
  interactive,
  viewMode,
  movementInputRef,
  onViewModeChange,
  onFarm,
  onBuild,
  onExpand,
  onResetView,
  onClearSelection,
}: {
  snapshot: HexWorldSnapshot;
  livingState: HomesteadLifeState | null;
  livingLoading: boolean;
  livingError: string | null;
  livingBusy: boolean;
  musicMuted: boolean;
  onToggleMusic: () => void;
  onLivingAction: (action: HomesteadLifeAction) => Promise<boolean>;
  onLivingRetry: () => void;
  selectedBuilding: HexBuildingDTO | null;
  interactive: boolean;
  viewMode: HexViewMode;
  movementInputRef: React.MutableRefObject<HexExploreMovementInput>;
  onViewModeChange: (mode: HexViewMode) => void;
  onFarm: () => void;
  onBuild: () => void;
  onExpand: () => void;
  onResetView: () => void;
  onClearSelection: () => void;
}) {
  const [inventoryOpen, setInventoryOpen] = React.useState(false);
  const [hudPanel, setHudPanel] = React.useState<HexHudPanel>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  React.useEffect(() => {
    setDetailsOpen(false);
  }, [selectedBuilding?.id]);

  React.useEffect(() => {
    if (!interactive) {
      setInventoryOpen(false);
      setDetailsOpen(false);
      setHudPanel(null);
    }
  }, [interactive]);

  const touchControlsEnabled = viewMode === 'person'
    && interactive
    && !inventoryOpen
    && hudPanel === null
    && !detailsOpen;

  React.useEffect(() => {
    if (!touchControlsEnabled) {
      movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    }
  }, [movementInputRef, touchControlsEnabled]);

  const closePrimarySheets = () => {
    setInventoryOpen(false);
    setHudPanel(null);
    setDetailsOpen(false);
  };

  const handleViewModeChange = (next: HexViewMode) => {
    closePrimarySheets();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    onClearSelection();
    onViewModeChange(next);
  };

  const openBuild = () => {
    closePrimarySheets();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    onClearSelection();
    onBuild();
  };

  const handleFarm = () => {
    closePrimarySheets();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    onFarm();
  };

  const toggleBag = () => {
    const next = !inventoryOpen;
    if (next) movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setInventoryOpen(next);
    setHudPanel(null);
    setDetailsOpen(false);
    if (next) onClearSelection();
  };

  const toggleGoals = () => {
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setInventoryOpen(false);
    setDetailsOpen(false);
    setHudPanel((current) => current === 'goals' ? null : 'goals');
  };

  const changeHudPanel = (next: HexHudPanel) => {
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setInventoryOpen(false);
    setDetailsOpen(false);
    setHudPanel(next);
  };

  const activeAction: HexGameplayAction = inventoryOpen
    ? 'bag'
    : hudPanel === 'goals'
      ? 'goals'
      : selectedBuilding?.buildingKey === 'garden_patch' && !detailsOpen
        ? 'farm'
        : null;
  const overlayState = hudPanel
    ? 'hud'
    : inventoryOpen
      ? 'inventory'
      : detailsOpen
        ? 'details'
        : selectedBuilding
          ? 'quick'
          : viewMode === 'person'
            ? 'person'
            : 'base';

  return (
    <div className="contents" data-hex-overlay-state={overlayState}>
      {(viewMode === 'world' || hudPanel !== null) && (
        <HexLivingHUD
          state={livingState}
          points={snapshot.points}
          loading={livingLoading}
          error={livingError}
          busy={livingBusy}
          musicMuted={musicMuted}
          onToggleMusic={onToggleMusic}
          onAction={onLivingAction}
          onRetry={onLivingRetry}
          panel={hudPanel}
          onPanelChange={changeHudPanel}
        />
      )}

      {interactive && (
        <>
          {viewMode === 'world' && selectedBuilding && livingState && !inventoryOpen && hudPanel === null && (
            detailsOpen
              ? <HexLivingActionPanel building={selectedBuilding} state={livingState} busy={livingBusy} onAction={onLivingAction} />
              : <HexQuickActionPanel building={selectedBuilding} state={livingState} busy={livingBusy} onAction={onLivingAction} onMore={() => setDetailsOpen(true)} />
          )}

          <HexInventorySheet open={inventoryOpen} state={livingState} onClose={() => setInventoryOpen(false)} />

          {viewMode === 'person' ? (
            <HexExploreHUD
              state={livingState}
              points={snapshot.points}
              musicMuted={musicMuted}
              movementInputRef={movementInputRef}
              touchControlsEnabled={touchControlsEnabled}
              onToggleMusic={onToggleMusic}
              onBag={toggleBag}
              onGoals={toggleGoals}
              onWorld={() => handleViewModeChange('world')}
              onResetView={onResetView}
            />
          ) : (
            <HexWorldToolbar
              onFarm={handleFarm}
              onBuild={openBuild}
              onBag={toggleBag}
              onGoals={toggleGoals}
              onExpand={() => { closePrimarySheets(); movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT; onClearSelection(); onExpand(); }}
              onResetView={onResetView}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              activeAction={activeAction}
            />
          )}
        </>
      )}
    </div>
  );
}
