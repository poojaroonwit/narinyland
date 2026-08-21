"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getBuildingDefinition, getBuildingFootprint, type HexBuildingKey } from '@/lib/hex-world/building-catalog';
import { createInitialHexBuildState, hexBuildReducer } from '@/lib/hex-world/build-state';
import { getUnlockedIslandBounds, shouldReframeForCoords, type HexCameraIntent } from '@/lib/hex-world/camera';
import { hexKey } from '@/lib/hex-world/hex-grid';
import { getPlacementMessage } from '@/lib/hex-world/placement-message';
import { validatePlacement } from '@/lib/hex-world/rules';
import type { HexBuildingDTO, HexCoord, HexWorldSnapshot } from '@/lib/hex-world/types';
import type { HexUndoMeta } from '@/lib/hex-world/undo-types';
import type { HexConfirmedVisualEvent } from '@/lib/hex-world/visual-events';
import { HexWorldApiError, hexWorldAPI } from '@/services/hex-world-api';
import { HexBuildCatalog } from './HexBuildCatalog';
import { HexBuildingContextToolbar } from './HexBuildingContextToolbar';
import { HexExpansionController } from './HexExpansionController';
import { HexLivingActionPanel } from './HexLivingActionPanel';
import { HexLivingHUD } from './HexLivingHUD';
import { HexPlacementBar } from './HexPlacementBar';
import { HexRemovalConfirm } from './HexRemovalConfirm';
import { HexUndoToast } from './HexUndoToast';
import { HexWorld3D } from './HexWorld3D';
import { HexWorldToolbar } from './HexWorldToolbar';
import { useHexKeyboardShortcuts } from './useHexKeyboardShortcuts';
import { useLivingHomestead } from './useLivingHomestead';

export function HexBuildController({ landId, snapshot, setSnapshot, showToast, graphicsQuality = 'medium' }: {
  landId: string;
  snapshot: HexWorldSnapshot;
  setSnapshot: (snapshot: HexWorldSnapshot) => void;
  showToast: (message: string) => void;
  graphicsQuality?: string;
}) {
  const [state, dispatch] = useReducer(hexBuildReducer, undefined, createInitialHexBuildState);
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
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLandRef = useRef<string | null>(landId);
  const placementLockRef = useRef(false);
  const visualEventNonceRef = useRef(0);
  const living = useLivingHomestead(landId, showToast);
  const nextVisualNonce = () => { visualEventNonceRef.current += 1; return visualEventNonceRef.current; };

  useEffect(() => () => {
    if (animationTimer.current) clearTimeout(animationTimer.current);
  }, []);

  useEffect(() => {
    activeLandRef.current = landId;
    placementLockRef.current = false;
    visualEventNonceRef.current = 0;
    dispatch({ type: 'cancel' });
    setCatalogOpen(false);
    setRemoveOpen(false);
    setNewlyAddedKeys(new Set());
    setReframeCoords([]);
    setUndo(null);
    setUndoLabel('');
    setVisualEvent(null);
    setInvalidPulseNonce(0);
    setBusy(false);
    if (animationTimer.current) {
      clearTimeout(animationTimer.current);
      animationTimer.current = null;
    }
    return () => {
      if (activeLandRef.current === landId) activeLandRef.current = null;
    };
  }, [landId]);

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
    const footprint = getBuildingFootprint(state.buildingKey, state.anchor, state.rotation);
    return { result, footprint };
  }, [snapshot, state]);

  const validKeys = preview?.result.ok ? new Set(preview.footprint.map(hexKey)) : undefined;
  const invalidKeys = preview && !preview.result.ok ? new Set(preview.footprint.map(hexKey)) : undefined;
  const placementReason = preview && !preview.result.ok ? getPlacementMessage(preview.result.code) : null;
  const setAnchor = (coord: HexCoord | null) => dispatch({ type: 'set_anchor', anchor: coord });
  const cameraIntent: HexCameraIntent = state.mode === 'placing' || state.mode === 'moving'
    ? { kind: 'build', anchor: state.anchor }
    : selectedBuilding
      ? { kind: 'focus', coord: { q: selectedBuilding.anchorQ, r: selectedBuilding.anchorR } }
      : { kind: 'overview' };

  const confirmPlacementAt = async (coord: HexCoord) => {
    if (state.mode !== 'placing' || !state.buildingKey || busy || placementLockRef.current) return;
    const placement = validatePlacement({ buildingKey: state.buildingKey, anchor: coord, rotation: state.rotation, tiles: snapshot.tiles, buildings: snapshot.buildings });
    if (!placement.ok) {
      setInvalidPulseNonce((value) => value + 1);
      return;
    }

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
    } finally {
      if (activeLandRef.current === landId) setBusy(false);
    }
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
    } finally {
      if (activeLandRef.current === landId) setBusy(false);
    }
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
    } finally {
      if (activeLandRef.current === landId) setBusy(false);
    }
  };

  const performUndo = async () => {
    if (!undo || busy || Date.parse(undo.expiresAt) <= Date.now()) { setUndo(null); return; }
    const token = undo.token;
    setBusy(true);
    try {
      const confirmed = await hexWorldAPI.undo(landId, token);
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
    } finally {
      if (activeLandRef.current === landId) setBusy(false);
    }
  };

  const confirmFromKeyboard = () => {
    if (!state.anchor) return;
    if (state.mode === 'placing') { void confirmPlacementAt(state.anchor); return; }
    if (state.mode === 'moving') void confirmMove();
  };

  useHexKeyboardShortcuts({ enabled: state.mode === 'placing' || state.mode === 'moving', canConfirm: !!preview?.result.ok, busy, onRotate: () => dispatch({ type: 'rotate_clockwise' }), onCancel: () => dispatch({ type: 'cancel' }), onConfirm: confirmFromKeyboard });

  const scenePreview = preview && state.anchor && state.buildingKey ? { buildingKey: state.buildingKey, anchorQ: state.anchor.q, anchorR: state.anchor.r, rotation: state.rotation, valid: preview.result.ok } : null;

  const handleExpansionConfirmed = (confirmed: HexWorldSnapshot, newTileKeys: Set<string>) => {
    if (activeLandRef.current !== landId) return;
    const newCoords = confirmed.tiles.filter((tile) => newTileKeys.has(hexKey(tile))).map(({ q, r }) => ({ q, r }));
    const bounds = getUnlockedIslandBounds(snapshot.tiles);
    setSnapshot(confirmed);
    setUndo(null);
    setUndoLabel('');
    setVisualEvent({ kind: 'expanded', coords: newCoords, nonce: nextVisualNonce() });
    setNewlyAddedKeys(newTileKeys);
    setReframeCoords(shouldReframeForCoords(bounds, newCoords) ? newCoords : []);
    dispatch({ type: 'cancel' });
    if (animationTimer.current) clearTimeout(animationTimer.current);
    animationTimer.current = setTimeout(() => {
      if (activeLandRef.current !== landId) return;
      setNewlyAddedKeys(new Set());
      setReframeCoords([]);
    }, 1100);
  };

  const openBuild = () => { dispatch({ type: 'cancel' }); setCatalogOpen(true); setRemoveOpen(false); };
  const openExpand = () => { setCatalogOpen(false); setRemoveOpen(false); dispatch({ type: 'start_expansion' }); };
  const selectedDefinition = selectedBuilding ? getBuildingDefinition(selectedBuilding.buildingKey) : null;
  const expireUndo = useCallback(() => { setUndo(null); setUndoLabel(''); }, []);

  return (
    <div className="absolute inset-0">
      <HexWorld3D
        snapshot={snapshot}
        cameraIntent={cameraIntent}
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
        expansionOptions={state.mode === 'expanding' ? snapshot.expansions : undefined}
        selectedExpansionKey={state.expansionKey}
        newlyAddedKeys={newlyAddedKeys}
        buildingPreview={scenePreview}
        onHoverTile={(coord) => { if (state.mode === 'placing' || state.mode === 'moving') setAnchor(coord); }}
        onSelectTile={handleTileSelect}
        onSelectExpansion={(expansionKey) => dispatch({ type: 'preview_expansion', expansionKey })}
        onSelectBuilding={(building: HexBuildingDTO | null) => { if (state.mode === 'idle') dispatch({ type: 'select_existing', buildingId: building?.id ?? null }); }}
      />

      <HexLivingHUD
        state={living.state}
        points={snapshot.points}
        loading={living.loading}
        error={living.error}
        busy={living.busy}
        onAction={living.act}
        onRetry={living.retry}
      />

      {state.mode === 'idle' && selectedBuilding && living.state && (
        <HexLivingActionPanel building={selectedBuilding} state={living.state} busy={living.busy} onAction={living.act} />
      )}
      {state.mode === 'idle' && !selectedBuilding && !catalogOpen && <HexWorldToolbar onBuild={openBuild} onExpand={openExpand} onResetView={() => setResetNonce((value) => value + 1)} />}
      <HexBuildCatalog open={catalogOpen} activeBuildingKey={state.buildingKey} onClose={() => setCatalogOpen(false)} onSelect={(buildingKey: HexBuildingKey) => { dispatch({ type: 'select_building', buildingKey }); setCatalogOpen(false); }} />
      {(state.mode === 'placing' || state.mode === 'moving') && <HexPlacementBar mode={state.mode} busy={busy} valid={!!preview?.result.ok} reason={placementReason} onRotateLeft={() => dispatch({ type: 'rotate_counterclockwise' })} onRotateRight={() => dispatch({ type: 'rotate_clockwise' })} onConfirm={confirmMove} onCancel={() => dispatch({ type: 'cancel' })} />}
      {state.mode === 'idle' && selectedBuilding && selectedDefinition && <HexBuildingContextToolbar removable={selectedDefinition.removable} busy={busy} onMove={() => dispatch({ type: 'start_move', buildingId: selectedBuilding.id, buildingKey: selectedBuilding.buildingKey as HexBuildingKey, rotation: selectedBuilding.rotation })} onRotate={rotateSelected} onRemove={() => setRemoveOpen(true)} onClose={() => dispatch({ type: 'select_existing', buildingId: null })} />}
      {state.mode === 'expanding' && <HexExpansionController landId={landId} snapshot={snapshot} activeExpansionKey={state.expansionKey} onCancelPreview={() => dispatch({ type: 'cancel' })} onConfirmed={handleExpansionConfirmed} showToast={showToast} />}
      {removeOpen && selectedBuilding && selectedDefinition?.removable && <HexRemovalConfirm name={selectedDefinition.name} important={selectedDefinition.category === 'main'} busy={busy} onConfirm={removeSelected} onCancel={() => setRemoveOpen(false)} />}
      {undo && <HexUndoToast undo={undo} label={undoLabel} busy={busy} onUndo={performUndo} onExpire={expireUndo} />}
    </div>
  );
}
