"use client";

import React from 'react';
import type { HomesteadLifeAction, HomesteadLifeState } from '@/lib/homestead-life-engine';
import type { HexBuildingDTO, HexWorldSnapshot } from '@/lib/hex-world/types';
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

  const closePrimarySheets = () => {
    setInventoryOpen(false);
    setHudPanel(null);
    setDetailsOpen(false);
  };

  const openBuild = () => {
    closePrimarySheets();
    onClearSelection();
    onBuild();
  };

  const handleFarm = () => {
    closePrimarySheets();
    onFarm();
  };

  const toggleBag = () => {
    const next = !inventoryOpen;
    setInventoryOpen(next);
    setHudPanel(null);
    setDetailsOpen(false);
    if (next) onClearSelection();
  };

  const toggleGoals = () => {
    setInventoryOpen(false);
    setDetailsOpen(false);
    setHudPanel((current) => current === 'goals' ? null : 'goals');
  };

  const changeHudPanel = (next: HexHudPanel) => {
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
          : 'base';

  return (
    <div className="contents" data-hex-overlay-state={overlayState}>
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

      {interactive && (
        <>
          {selectedBuilding && livingState && !inventoryOpen && hudPanel === null && (
            detailsOpen
              ? <HexLivingActionPanel building={selectedBuilding} state={livingState} busy={livingBusy} onAction={onLivingAction} />
              : <HexQuickActionPanel building={selectedBuilding} state={livingState} busy={livingBusy} onAction={onLivingAction} onMore={() => setDetailsOpen(true)} />
          )}

          <HexInventorySheet open={inventoryOpen} state={livingState} onClose={() => setInventoryOpen(false)} />

          <HexWorldToolbar
            onFarm={handleFarm}
            onBuild={openBuild}
            onBag={toggleBag}
            onGoals={toggleGoals}
            onExpand={() => { closePrimarySheets(); onClearSelection(); onExpand(); }}
            onResetView={onResetView}
            activeAction={activeAction}
          />
        </>
      )}
    </div>
  );
}
