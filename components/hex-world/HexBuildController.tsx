"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getBuildingDefinition, getBuildingFootprint, type HexBuildingKey } from '@/lib/hex-world/building-catalog';
import { createInitialHexBuildState, hexBuildReducer } from '@/lib/hex-world/build-state';
import { getUnlockedIslandBounds, shouldReframeForCoords, type HexCameraIntent } from '@/lib/hex-world/camera';
import {
  ZERO_HEX_EXPLORE_MOVEMENT,
  type HexExploreMovementInput,
} from '@/lib/hex-world/explore-movement-input';
import { getExpansionPlacementTiles, validateExpansionPlacement } from '@/lib/hex-world/expansions';
import { hexKey } from '@/lib/hex-world/hex-grid';
import { getPlacementMessage } from '@/lib/hex-world/placement-message';
import { validatePlacement } from '@/lib/hex-world/rules';
import type { HexBuildingDTO, HexCoord, HexExpansionPlacementPreview, HexWorldSnapshot } from '@/lib/hex-world/types';
import type { HexUndoMeta } from '@/lib/hex-world/undo-types';
import type { HexViewMode } from '@/lib/hex-world/view-mode';
import type { HexConfirmedVisualEvent } from '@/lib/hex-world/visual-events';
import { HexWorldApiError, hexWorldAPI } from '@/services/hex-world-api';
import { HexBuildCatalog } from './HexBuildCatalog';
import { HexBuildingContextToolbar } from './HexBuildingContextToolbar';
import { HexExpansionController } from './HexExpansionController';
import { HexGameplayOverlay } from './HexGameplayOverlay';
import { HexPlacementBar } from './HexPlacementBar';
import { HexRemovalConfirm } from './HexRemovalConfirm';
import { HexUndoToast } from './HexUndoToast';
import { HexWorld3D } from './HexWorld3D';
import { useGardenMusic } from './useGardenMusic';
import { useHexKeyboardShortcuts } from './useHexKeyboardShortcuts';
import { useLivingHomestead } from './useLivingHomestead';

function centerOf(coords: HexCoord[]): HexCoord | null {
  if (!coords.length) return null;
  return {
    q: Math.round(coords.reduce((sum, coord) => sum + coord.q, 0) / coords.length),
    r: Math.round(coords.reduce((sum, coord) => sum + coord.r, 0) / coords.length),
  };
}

export function HexBuildController({ landId, snapshot, setSnapshot, showToast, graphicsQuality = 'medium' }: {
  landId: string;
  snapshot: HexWorldSnapshot;
  setSnapshot: (snapshot: HexWorldSnapshot) => void;
  showToast: (message: string) => void;
  graphicsQuality?: string;
}) {
  const [state, dispatch] = useReducer(hexBuildReducer, undefined, createInitialHexBuildState);
  const [viewMode, setViewMode] = useState<HexViewMode>('world');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const [newlyAddedKeys, setNewlyAddedKeys] = useState<Set<string>>(new Set());
  const [reframeCoords, setReframeCoords] = useState<HexCoord[]>([]);
  const [undo, setUndo] = useState<HexUndoMeta | null>(null);
  const [undoLabel, setUndoLabel] = useState('');
  const [visualEvent, setVisualEvent] = useState<HexConfirmedVisualEvent>(null);
  const [invalidPulseNonce, setInvalidPulseNonce] = useState(0);
  const [expansionAnchor, setExpansionAnchor] = useState<HexCoord | null>(null);
  const [expansionPinned, setExpansionPinned] = useState(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLandRef = useRef<string | null>(landId);
  const placementLockRef = useRef(false);
  const visualEventNonceRef = useRef(0);
  const exploreMovementInputRef = useRef<HexExploreMovementInput>(ZERO_HEX_EXPLORE_MOVEMENT);
  const living = useLivingHomestead(landId, showToast);
  const { musicMuted, toggleMusic } = useGardenMusic();
  const nextVisualNonce = () => { visualEventNonceRef.current += 1; return visualEventNonceRef.current; };

  useEffect(() => () => { if (animationTimer.current) clearTimeout(animationTimer.current); }, []);

  useEffect(() => {
    activeLandRef.current = landId;
    placementLockRef.current = false;
    visualEventNonceRef.current = 0;
    exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    dispatch({ type: 'cancel' });
    setViewMode('world');
    setCatalogOpen(false);
    setRemoveOpen(false);
    setNewlyAddedKeys(new Set());
    setReframeCoords([]);
    setUndo(null);
    setUndoLabel('');
    setVisualEvent(null);
    setInvalidPulseNonce(0);
    setExpansionAnchor(null);
    setExpansionPinned(false);
    setBusy(false);
    if (animationTimer.current) { clearTimeout(animationTimer.current); animationTimer.current = null; }
    return () => { if (activeLandRef.current === landId) activeLandRef.current = null; };
  }, [landId]);

  useEffect(() => {
    if (state.mode !== 'idle') {
      exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
      setViewMode('world');
    }
  }, [state.mode]);

  const selectedBuilding = snapshot.buildings.find((item) => item.id === state.selectedBuildingId) ?? null;
  const preview = useMemo(() => {
    if ((state.mode !== 'placing' && state.mode !== 'moving') || !state.buildingKey || !state.anchor) return null;
    const result = validatePlacement({
      buildingKey: state.buildingKey,
      anchor: state.anchor,
      rotation: state.rotation,
      tiles: snapshot.tiles,
      buildings: snapshot.buildings,
      ...(state.mode === 'moving' && state.selectedBuildingId ? { ignoreBuildingId: state.selectedBuildingId } : {}),
    });
    return { result, footprint: getBuildingFootprint(state.buildingKey, state.anchor, state.rotation) };
  }, [snapshot, state]);

  const activeAvailableExpansion = state.expansionKey ? snapshot.expansions.find((item) => item.expansionKey === state.expansionKey) ?? null : null;
  const activePurchasedExpansion = state.expansionKey ? snapshot.purchasedExpansions?.find((item) => item.expansionKey === state.expansionKey) ?? null : null;
  const activeExpansion = activeAvailableExpansion ?? activePurchasedExpansion;
  const expansionPlacementPreview = useMemo<HexExpansionPlacementPreview | null>(() => {
    if (state.mode !== 'expanding' || !state.expansionKey || !expansionAnchor || !activeExpansion) return null;
    const tiles = getExpansionPlacementTiles(activeExpansion.tier, expansionAnchor);
    const result = validateExpansionPlacement(
      tiles,
      snapshot.tiles,
      activePurchasedExpansion ? { ignoreExpansionKey: state.expansionKey } : {},
    );
    return {
      expansionKey: state.expansionKey,
      tier: activeExpansion.tier,
      tiles,
      valid: result.ok,
      mode: activePurchasedExpansion ? 'move' : 'purchase',
    };
  }, [activeExpansion, activePurchasedExpansion, expansionAnchor, snapshot.tiles, state.expansionKey, state.mode]);

  const validKeys = preview?.result.ok ? new Set(preview.footprint.map(hexKey)) : undefined;
  const invalidKeys = preview && !preview.result.ok ? new Set(preview.footprint.map(hexKey)) : undefined;
  const placementReason = preview && !preview.result.ok ? getPlacementMessage(preview.result.code) : null;
  const setAnchor = (coord: HexCoord | null) => dispatch({ type: 'set_anchor', anchor: coord });
  const cameraIntent: HexCameraIntent = state.mode === 'placing' || state.mode === 'moving'
    ? { kind: 'build', anchor: state.anchor }
    : selectedBuilding ? { kind: 'focus', coord: { q: selectedBuilding.anchorQ, r: selectedBuilding.anchorR } } : { kind: 'overview' };

  const confirmPlacementAt = async (coord: HexCoord) => {
    if (state.mode !== 'placing' || !state.buildingKey || busy || placementLockRef.current) return;
    const placement = validatePlacement({ buildingKey: state.buildingKey, anchor: coord, rotation: state.rotation, tiles: snapshot.tiles, buildings: snapshot.buildings });
    if (!placement.ok) { setInvalidPulseNonce((value) => value + 1); return; }
    const previousIds = new Set(snapshot.buildings.map((building) => building.id));
    placementLockRef.current = true;
    setBusy(true);
    const definition = getBuildingDefinition(state.buildingKey);
    try {
      const confirmed = await hexWorldAPI.place(landId, { buildingKey: state.buildingKey, anchorQ: coord.q, anchorR: coord.r, rotation: state.rotation });
      if (activeLandRef.current !== landId) return;
      const placed = confirmed.snapshot.buildings.find((building) => !previousIds.has(building.id));
      setSnapshot(confirmed.snapshot);
      setUndo(confirmed.undo);
      setUndoLabel(confirmed.undo ? `${definition?.name ?? 'Building'} placed` : '');
      if (placed) setVisualEvent({ kind: 'placed', buildingId: placed.id, coord, nonce: nextVisualNonce() });
      showToast('Building placed ✨');
      dispatch({ type: 'cancel' });
    } catch (error) {
      if (activeLandRef.current !== landId) return;
      showToast(error instanceof Error ? error.message : 'Could not save this placement');
    } finally {
      placementLockRef.current = false;
      if (activeLandRef.current === landId) setBusy(false);
    }
  };

  const confirmMove = async () => {
    if (state.mode !== 'moving' || !state.anchor || !state.buildingKey || !state.selectedBuildingId || !preview?.result.ok || busy) return;
    const moveCoord = { ...state.anchor };
    const movingId = state.selectedBuildingId;
    setBusy(true);
    const definition = getBuildingDefinition(state.buildingKey);
    try {
      const confirmed = await hexWorldAPI.update(landId, movingId, { anchorQ: moveCoord.q, anchorR: moveCoord.r, rotation: state.rotation });
      if (activeLandRef.current !== landId) return;
      setSnapshot(confirmed.snapshot);
      setUndo(confirmed.undo);
      setUndoLabel(confirmed.undo ? `${definition?.name ?? 'Building'} moved` : '');
      setVisualEvent({ kind: 'moved', buildingId: movingId, coord: moveCoord, nonce: nextVisualNonce() });
      showToast('Building moved ✨');
      dispatch({ type: 'cancel' });
    } catch (error) {
      if (activeLandRef.current !== landId) return;
      showToast(error instanceof Error ? error.message : 'Could not save this placement');
    } finally { if (activeLandRef.current === landId) setBusy(false); }
  };

  const handleTileSelect = (coord: HexCoord) => {
    if (state.mode === 'placing') {
      if (busy || placementLockRef.current) return;
      setAnchor(coord);
      void confirmPlacementAt(coord);
      return;
    }
    if (state.mode === 'moving') setAnchor(coord);
  };

  const rotateSelected = async () => {
    if (!selectedBuilding || busy) return;
    setBusy(true);
    try {
      const nextRotation = ((selectedBuilding.rotation + 1) % 6) as 0 | 1 | 2 | 3 | 4 | 5;
      const confirmed = await hexWorldAPI.update(landId, selectedBuilding.id, { rotation: nextRotation });
      if (activeLandRef.current !== landId) return;
      setSnapshot(confirmed.snapshot);
      setUndo(confirmed.undo);
      setUndoLabel(confirmed.undo ? `${getBuildingDefinition(selectedBuilding.buildingKey)?.name ?? 'Building'} rotated` : '');
      setVisualEvent({ kind: 'rotated', buildingId: selectedBuilding.id, nonce: nextVisualNonce() });
      dispatch({ type: 'select_existing', buildingId: selectedBuilding.id });
    } catch (error) {
      if (activeLandRef.current !== landId) return;
      showToast(error instanceof Error ? error.message : 'Could not rotate this building');
    } finally { if (activeLandRef.current === landId) setBusy(false); }
  };

  const removeSelected = async () => {
    if (!selectedBuilding || busy) return;
    const definition = getBuildingDefinition(selectedBuilding.buildingKey);
    if (!definition?.removable) return;
    setBusy(true);
    try {
      const confirmed = await hexWorldAPI.remove(landId, selectedBuilding.id);
      if (activeLandRef.current !== landId) return;
      setSnapshot(confirmed.snapshot);
      setUndo(confirmed.undo);
      setUndoLabel(confirmed.undo ? `${definition.name} removed` : '');
      setVisualEvent(null);
      setRemoveOpen(false);
      dispatch({ type: 'select_existing', buildingId: null });
      showToast(`${definition.name} removed`);
    } catch (error) {
      if (activeLandRef.current !== landId) return;
      showToast(error instanceof Error ? error.message : 'Could not remove this building');
    } finally { if (activeLandRef.current === landId) setBusy(false); }
  };

  const performUndo = async () => {
    if (!undo || busy || Date.parse(undo.expiresAt) <= Date.now()) { setUndo(null); return; }
    setBusy(true);
    try {
      const confirmed = await hexWorldAPI.undo(landId, undo.token);
      if (activeLandRef.current !== landId) return;
      setSnapshot(confirmed);
      setUndo(null);
      setUndoLabel('');
      setVisualEvent(null);
      setCatalogOpen(false);
      setRemoveOpen(false);
      dispatch({ type: 'cancel' });
      showToast('Last change undone');
    } catch (error) {
      if (activeLandRef.current !== landId) return;
      setUndo(null);
      setUndoLabel('');
      setVisualEvent(null);
      dispatch({ type: 'cancel' });
      if (error instanceof HexWorldApiError && error.code === 'undo_conflict') showToast('Land changed — undo unavailable');
      else if (error instanceof HexWorldApiError && error.code === 'undo_unavailable') showToast('Undo is no longer available');
      else showToast(error instanceof Error ? error.message : 'Could not undo this change');
    } finally { if (activeLandRef.current === landId) setBusy(false); }
  };

  const confirmFromKeyboard = () => {
    if (!state.anchor) return;
    if (state.mode === 'placing') { void confirmPlacementAt(state.anchor); return; }
    if (state.mode === 'moving') void confirmMove();
  };
  useHexKeyboardShortcuts({ enabled: state.mode === 'placing' || state.mode === 'moving', canConfirm: !!preview?.result.ok, busy, onRotate: () => dispatch({ type: 'rotate_clockwise' }), onCancel: () => dispatch({ type: 'cancel' }), onConfirm: confirmFromKeyboard });
  const scenePreview = preview && state.anchor && state.buildingKey ? { buildingKey: state.buildingKey, anchorQ: state.anchor.q, anchorR: state.anchor.r, rotation: state.rotation, valid: preview.result.ok } : null;

  const cancelExpansion = () => {
    exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setExpansionAnchor(null);
    setExpansionPinned(false);
    dispatch({ type: 'cancel' });
  };
  const chooseExpansion = (expansionKey: string) => {
    const available = snapshot.expansions.find((item) => item.expansionKey === expansionKey);
    const purchased = snapshot.purchasedExpansions?.find((item) => item.expansionKey === expansionKey);
    dispatch({ type: 'preview_expansion', expansionKey });
    setExpansionAnchor(centerOf(purchased?.tiles ?? available?.tiles ?? []));
    setExpansionPinned(false);
  };
  const handleExpansionHover = (coord: HexCoord) => {
    if (state.mode !== 'expanding' || !state.expansionKey || expansionPinned) return;
    setExpansionAnchor(coord);
  };
  const handleExpansionSelect = (coord: HexCoord) => {
    if (state.mode !== 'expanding' || !state.expansionKey) return;
    setExpansionAnchor(coord);
    setExpansionPinned(true);
  };

  const handleExpansionConfirmed = (confirmed: HexWorldSnapshot, changedTileKeys: Set<string>) => {
    if (activeLandRef.current !== landId) return;
    const changedCoords = confirmed.tiles.filter((tile) => changedTileKeys.has(hexKey(tile))).map(({ q, r }) => ({ q, r }));
    const bounds = getUnlockedIslandBounds(snapshot.tiles);
    setSnapshot(confirmed);
    setUndo(null);
    setUndoLabel('');
    setVisualEvent({ kind: 'expanded', coords: changedCoords, nonce: nextVisualNonce() });
    setNewlyAddedKeys(changedTileKeys);
    setReframeCoords(shouldReframeForCoords(bounds, changedCoords) ? changedCoords : []);
    setExpansionAnchor(null);
    setExpansionPinned(false);
    dispatch({ type: 'cancel' });
    if (animationTimer.current) clearTimeout(animationTimer.current);
    animationTimer.current = setTimeout(() => {
      if (activeLandRef.current !== landId) return;
      setNewlyAddedKeys(new Set());
      setReframeCoords([]);
    }, 1100);
  };

  const changeViewMode = (next: HexViewMode) => {
    if (next === 'person') {
      if (state.mode !== 'idle' || busy || catalogOpen) return;
      setCatalogOpen(false);
      setRemoveOpen(false);
      setExpansionAnchor(null);
      setExpansionPinned(false);
      dispatch({ type: 'select_existing', buildingId: null });
      setViewMode('person');
      return;
    }
    exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setViewMode('world');
  };
  const openBuild = () => { exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT; setViewMode('world'); cancelExpansion(); setCatalogOpen(true); setRemoveOpen(false); };
  const openExpand = () => { exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT; setViewMode('world'); setCatalogOpen(false); setRemoveOpen(false); setExpansionAnchor(null); setExpansionPinned(false); dispatch({ type: 'start_expansion' }); };
  const handleFarm = () => {
    exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setViewMode('world');
    setCatalogOpen(false);
    setRemoveOpen(false);
    const garden = snapshot.buildings.find((building) => building.buildingKey === 'garden_patch');
    if (garden) {
      dispatch({ type: 'select_existing', buildingId: garden.id });
      return;
    }
    setCatalogOpen(true);
    showToast('Add a Garden Patch to start farming 🌱');
  };
  const startMoveSelected = () => {
    if (!selectedBuilding) return;
    exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT;
    setViewMode('world');
    dispatch({ type: 'start_move', buildingId: selectedBuilding.id, buildingKey: selectedBuilding.buildingKey as HexBuildingKey, rotation: selectedBuilding.rotation });
  };
  const selectedDefinition = selectedBuilding ? getBuildingDefinition(selectedBuilding.buildingKey) : null;
  const expireUndo = useCallback(() => { setUndo(null); setUndoLabel(''); }, []);

  return (
    <div className="absolute inset-0">
      <HexWorld3D
        snapshot={snapshot}
        cameraIntent={cameraIntent}
        viewMode={viewMode}
        movementInputRef={exploreMovementInputRef}
        resetNonce={resetNonce}
        reframeCoords={reframeCoords}
        graphicsQuality={graphicsQuality}
        livingState={living.state}
        selectedCoord={state.anchor}
        selectedBuildingId={state.selectedBuildingId}
        validKeys={validKeys}
        invalidKeys={invalidKeys}
        invalidPulseNonce={invalidPulseNonce}
        visualEvent={visualEvent}
        expansionOptions={state.mode === 'expanding' && !state.expansionKey ? snapshot.expansions : undefined}
        selectedExpansionKey={state.expansionKey}
        expansionPlacementPreview={expansionPlacementPreview}
        newlyAddedKeys={newlyAddedKeys}
        buildingPreview={scenePreview}
        onHoverTile={(coord) => { if (state.mode === 'placing' || state.mode === 'moving') setAnchor(coord); }}
        onSelectTile={handleTileSelect}
        onSelectExpansion={chooseExpansion}
        onHoverExpansionAnchor={handleExpansionHover}
        onSelectExpansionAnchor={handleExpansionSelect}
        onSelectBuilding={(building: HexBuildingDTO | null) => { if (viewMode === 'world' && state.mode === 'idle') dispatch({ type: 'select_existing', buildingId: building?.id ?? null }); }}
      />

      <HexGameplayOverlay
        snapshot={snapshot}
        livingState={living.state}
        livingLoading={living.loading}
        livingError={living.error}
        livingBusy={living.busy}
        musicMuted={musicMuted}
        onToggleMusic={toggleMusic}
        onLivingAction={living.act}
        onLivingRetry={living.retry}
        selectedBuilding={selectedBuilding}
        interactive={state.mode === 'idle' && !catalogOpen}
        viewMode={viewMode}
        movementInputRef={exploreMovementInputRef}
        onViewModeChange={changeViewMode}
        onFarm={handleFarm}
        onBuild={openBuild}
        onExpand={openExpand}
        onResetView={() => { exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT; setResetNonce((value) => value + 1); }}
        onClearSelection={() => dispatch({ type: 'select_existing', buildingId: null })}
      />

      <HexBuildCatalog open={catalogOpen} activeBuildingKey={state.buildingKey} onClose={() => setCatalogOpen(false)} onSelect={(buildingKey: HexBuildingKey) => { exploreMovementInputRef.current = ZERO_HEX_EXPLORE_MOVEMENT; setViewMode('world'); dispatch({ type: 'select_building', buildingKey }); setCatalogOpen(false); }} />
      {(state.mode === 'placing' || state.mode === 'moving') && <HexPlacementBar mode={state.mode} busy={busy} valid={!!preview?.result.ok} reason={placementReason} onRotateLeft={() => dispatch({ type: 'rotate_counterclockwise' })} onRotateRight={() => dispatch({ type: 'rotate_clockwise' })} onConfirm={confirmMove} onCancel={() => dispatch({ type: 'cancel' })} />}
      {state.mode === 'idle' && selectedBuilding && selectedDefinition && <HexBuildingContextToolbar removable={selectedDefinition.removable} busy={busy} onMove={startMoveSelected} onRotate={rotateSelected} onRemove={() => setRemoveOpen(true)} onClose={() => dispatch({ type: 'select_existing', buildingId: null })} />}
      {state.mode === 'expanding' && <HexExpansionController landId={landId} snapshot={snapshot} activeExpansionKey={state.expansionKey} placementPreview={expansionPlacementPreview} placementPinned={expansionPinned} onChooseExpansion={chooseExpansion} onReposition={() => setExpansionPinned(false)} onCancelPreview={cancelExpansion} onConfirmed={handleExpansionConfirmed} showToast={showToast} />}
      {removeOpen && selectedBuilding && selectedDefinition?.removable && <HexRemovalConfirm name={selectedDefinition.name} important={selectedDefinition.category === 'main'} busy={busy} onConfirm={removeSelected} onCancel={() => setRemoveOpen(false)} />}
      {undo && <HexUndoToast undo={undo} label={undoLabel} busy={busy} onUndo={performUndo} onExpire={expireUndo} />}
    </div>
  );
}
