"use client";

import React from 'react';
import type { HomesteadLifeAction, HomesteadLifeState } from '@/lib/homestead-life-engine';
import type { HexExploreInteractionTarget } from '@/lib/hex-world/explore-interactions';
import {
  ZERO_HEX_EXPLORE_MOVEMENT,
  type HexExploreMovementInput,
} from '@/lib/hex-world/explore-movement-input';
import type { HexBuildingDTO, HexWorldSnapshot } from '@/lib/hex-world/types';
import type { HexViewMode } from '@/lib/hex-world/view-mode';
import { HexExploreHUD } from './HexExploreHUD';
import { HexExploreInteractionPrompt } from './HexExploreInteractionPrompt';
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
  exploreInteractionTarget,
  exploreInteractionBuildingId,
  onExploreInteract,
  onCloseExploreInteraction,
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
  exploreInteractionTarget: HexExploreInteractionTarget | null;
  exploreInteractionBuildingId: string | null;
  onExploreInteract: () => void;
  onCloseExploreInteraction: () => void;
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

  const interactionBuilding = exploreInteractionBuildingId
    ? snapshot.buildings.find((building) => building.id === exploreInteractionBuildingId) ?? null
    : null;
  const interactionOpen = viewMode === 'person' && interactionBuilding !== null;

  React.useEffect(() => {
    setDetailsOpen(false);
  }, [exploreInteractionBuildingId, selectedBuilding?.id]);

  React.useEffect(() => {
    if (!interactive) {
      setInventoryOpen(false);
      setDetailsOpen(false);
      setHudPanel(null);
      onCloseExploreInteraction();
    }
  }, [interactive, onCloseExploreInteraction]);

  React.useEffect(() => {
    if (exploreInteractionBuildingId && !interactionBuilding) onCloseExploreInteraction();
  }, [exploreInteractionBuildingId, interactionBuilding, onCloseExploreInteraction]);

  React.useEffect(() => {
    if (!interactionOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' || event.repeat) return;
      event.preventDefault();
      setDetailsOpen(false);
      movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
      onCloseExploreInteraction();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [interactionOpen, movementInputRef, onCloseExploreInteraction]);

  const touchControlsEnabled = viewMode === 'person'
    && interactive
    && !inventoryOpen
    && hudPanel === null
    && !detailsOpen
    && !interactionOpen;

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

  const closeInteraction = () => {
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setDetailsOpen(false);
    onCloseExploreInteraction();
  };

  const closeAllBlockingSurfaces = () => {
    closePrimarySheets();
    closeInteraction();
  };

  const handleExploreInteract = () => {
    if (!exploreInteractionTarget || !livingState) return;
    closePrimarySheets();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    onClearSelection();
    onExploreInteract();
  };

  const handleViewModeChange = (next: HexViewMode) => {
    closeAllBlockingSurfaces();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    onClearSelection();
    onViewModeChange(next);
  };

  const openBuild = () => {
    closeAllBlockingSurfaces();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    onClearSelection();
    onBuild();
  };

  const handleFarm = () => {
    closeAllBlockingSurfaces();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    onFarm();
  };

  const toggleBag = () => {
    const next = !inventoryOpen;
    onCloseExploreInteraction();
    if (next) movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setInventoryOpen(next);
    setHudPanel(null);
    setDetailsOpen(false);
    if (next) onClearSelection();
  };

  const toggleGoals = () => {
    onCloseExploreInteraction();
    movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setInventoryOpen(false);
    setDetailsOpen(false);
    setHudPanel((current) => current === 'goals' ? null : 'goals');
  };

  const changeHudPanel = (next: HexHudPanel) => {
    onCloseExploreInteraction();
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
      : interactionOpen
        ? detailsOpen ? 'interaction-details' : 'interaction'
        : detailsOpen
          ? 'details'
          : selectedBuilding
            ? 'quick'
            : viewMode === 'person'
              ? 'person'
              : 'base';
  const promptVisible = viewMode === 'person'
    && !!livingState
    && !!exploreInteractionTarget
    && !interactionOpen
    && !inventoryOpen
    && hudPanel === null
    && !detailsOpen;

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

          {viewMode === 'person' && interactionBuilding && livingState && !inventoryOpen && hudPanel === null && (
            <>
              {detailsOpen
                ? <HexLivingActionPanel building={interactionBuilding} state={livingState} busy={livingBusy} onAction={onLivingAction} />
                : <HexQuickActionPanel building={interactionBuilding} state={livingState} busy={livingBusy} onAction={onLivingAction} onMore={() => setDetailsOpen(true)} />}
              <button
                type="button"
                onClick={closeInteraction}
                className="pointer-events-auto fixed right-[calc(0.85rem+env(safe-area-inset-right))] top-[calc(4.75rem+env(safe-area-inset-top))] z-[95] min-h-[44px] rounded-xl border border-white/55 bg-stone-900/82 px-3 text-[10px] font-black text-white shadow-xl backdrop-blur-xl"
                aria-label="Close interaction"
              >
                Close
              </button>
            </>
          )}

          <HexInventorySheet open={inventoryOpen} state={livingState} onClose={() => setInventoryOpen(false)} />

          {viewMode === 'person' ? (
            <>
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
              {promptVisible && exploreInteractionTarget && (
                <HexExploreInteractionPrompt
                  target={exploreInteractionTarget}
                  onInteract={handleExploreInteract}
                />
              )}
            </>
          ) : (
            <HexWorldToolbar
              onFarm={handleFarm}
              onBuild={openBuild}
              onBag={toggleBag}
              onGoals={toggleGoals}
              onExpand={() => { closeAllBlockingSurfaces(); movementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT; onClearSelection(); onExpand(); }}
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
