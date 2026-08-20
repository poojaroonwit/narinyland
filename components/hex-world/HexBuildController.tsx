"use client";

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getBuildingDefinition, getBuildingFootprint, type HexBuildingKey } from '@/lib/hex-world/building-catalog';
import { createInitialHexBuildState, hexBuildReducer } from '@/lib/hex-world/build-state';
import type { HexCameraIntent } from '@/lib/hex-world/camera';
import { hexKey } from '@/lib/hex-world/hex-grid';
import { validatePlacement } from '@/lib/hex-world/rules';
import type { HexBuildingDTO, HexCoord, HexExpansionDTO, HexWorldSnapshot } from '@/lib/hex-world/types';
import { hexWorldAPI } from '@/services/hex-world-api';
import { HexBuildCatalog } from './HexBuildCatalog';
import { HexExpansionController } from './HexExpansionController';
import { HexWorld3D } from './HexWorld3D';

export function HexBuildController({
  landId,
  snapshot,
  setSnapshot,
  showToast,
  graphicsQuality = 'medium',
}: {
  landId: string;
  snapshot: HexWorldSnapshot;
  setSnapshot: (snapshot: HexWorldSnapshot) => void;
  showToast: (message: string) => void;
  graphicsQuality?: string;
}) {
  const [state, dispatch] = useReducer(hexBuildReducer, undefined, createInitialHexBuildState);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newlyAddedKeys, setNewlyAddedKeys] = useState<Set<string>>(new Set());
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (animationTimer.current) clearTimeout(animationTimer.current);
  }, []);

  const selectedBuilding = snapshot.buildings.find((item) => item.id === state.selectedBuildingId) ?? null;
  const activeExpansion = snapshot.expansions.find((item) => item.expansionKey === state.expansionKey) ?? null;

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
  const setAnchor = (coord: HexCoord | null) => dispatch({ type: 'set_anchor', anchor: coord });
  const cameraIntent: HexCameraIntent = state.mode === 'placing' || state.mode === 'moving'
    ? { kind: 'build', anchor: state.anchor }
    : selectedBuilding
      ? { kind: 'focus', coord: { q: selectedBuilding.anchorQ, r: selectedBuilding.anchorR } }
      : { kind: 'overview' };

  const confirmPlacement = async () => {
    if (!state.anchor || !state.buildingKey || !preview?.result.ok || busy) return;
    setBusy(true);
    try {
      const confirmed = state.mode === 'moving' && state.selectedBuildingId
        ? await hexWorldAPI.update(landId, state.selectedBuildingId, { anchorQ: state.anchor.q, anchorR: state.anchor.r, rotation: state.rotation })
        : await hexWorldAPI.place(landId, { buildingKey: state.buildingKey, anchorQ: state.anchor.q, anchorR: state.anchor.r, rotation: state.rotation });
      setSnapshot(confirmed);
      showToast(state.mode === 'moving' ? 'Building moved ✨' : 'Building placed ✨');
      dispatch({ type: 'cancel' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save this placement');
    } finally {
      setBusy(false);
    }
  };

  const rotateSelected = async () => {
    if (!selectedBuilding || busy) return;
    setBusy(true);
    try {
      const nextRotation = ((selectedBuilding.rotation + 1) % 6) as 0 | 1 | 2 | 3 | 4 | 5;
      const confirmed = await hexWorldAPI.update(landId, selectedBuilding.id, { rotation: nextRotation });
      setSnapshot(confirmed);
      dispatch({ type: 'select_existing', buildingId: selectedBuilding.id });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not rotate this building');
    } finally {
      setBusy(false);
    }
  };

  const removeSelected = async () => {
    if (!selectedBuilding || busy) return;
    const definition = getBuildingDefinition(selectedBuilding.buildingKey);
    if (!definition?.removable) return;
    if (definition.category === 'main' && typeof window !== 'undefined' && !window.confirm(`Remove ${definition.name}?`)) return;
    setBusy(true);
    try {
      setSnapshot(await hexWorldAPI.remove(landId, selectedBuilding.id));
      dispatch({ type: 'select_existing', buildingId: null });
      showToast(`${definition.name} removed`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not remove this building');
    } finally {
      setBusy(false);
    }
  };

  const scenePreview = preview && state.anchor && state.buildingKey ? {
    buildingKey: state.buildingKey,
    anchorQ: state.anchor.q,
    anchorR: state.anchor.r,
    rotation: state.rotation,
    valid: preview.result.ok,
  } : null;

  const handleExpansionConfirmed = (confirmed: HexWorldSnapshot, newTileKeys: Set<string>) => {
    setSnapshot(confirmed);
    setNewlyAddedKeys(newTileKeys);
    dispatch({ type: 'cancel' });
    if (animationTimer.current) clearTimeout(animationTimer.current);
    animationTimer.current = setTimeout(() => setNewlyAddedKeys(new Set()), 1100);
  };

  return (
    <div className="absolute inset-0">
      <HexWorld3D
        snapshot={snapshot}
        cameraIntent={cameraIntent}
        resetNonce={0}
        graphicsQuality={graphicsQuality}
        selectedCoord={state.anchor}
        selectedBuildingId={state.selectedBuildingId}
        validKeys={validKeys}
        invalidKeys={invalidKeys}
        expansionPreviewTiles={activeExpansion?.tiles}
        newlyAddedKeys={newlyAddedKeys}
        buildingPreview={scenePreview}
        onHoverTile={(coord) => { if (state.mode === 'placing' || state.mode === 'moving') setAnchor(coord); }}
        onSelectTile={(coord) => { if (state.mode === 'placing' || state.mode === 'moving') setAnchor(coord); }}
        onSelectBuilding={(building: HexBuildingDTO | null) => {
          if (state.mode === 'idle') dispatch({ type: 'select_existing', buildingId: building?.id ?? null });
        }}
      />

      <HexBuildCatalog
        open={catalogOpen}
        activeBuildingKey={state.buildingKey}
        onToggle={() => setCatalogOpen((value) => !value)}
        onClose={() => setCatalogOpen(false)}
        onSelect={(buildingKey: HexBuildingKey) => { dispatch({ type: 'select_building', buildingKey }); setCatalogOpen(false); }}
      />

      <HexExpansionController
        landId={landId}
        snapshot={snapshot}
        activeExpansionKey={state.expansionKey}
        onPreview={(expansion: HexExpansionDTO) => dispatch({ type: 'preview_expansion', expansionKey: expansion.expansionKey })}
        onCancelPreview={() => dispatch({ type: 'cancel' })}
        onConfirmed={handleExpansionConfirmed}
        showToast={showToast}
      />

      {(state.mode === 'placing' || state.mode === 'moving') && (
        <div className="fixed bottom-24 left-1/2 z-[92] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/90 p-2 shadow-2xl backdrop-blur-xl">
          <button type="button" onClick={() => dispatch({ type: 'rotate_counterclockwise' })} className="h-10 w-10 rounded-full bg-stone-100 text-stone-600">↺</button>
          <button type="button" onClick={confirmPlacement} disabled={!preview?.result.ok || busy} className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-stone-300">{busy ? 'Saving…' : state.mode === 'moving' ? 'Move here' : 'Place'}</button>
          <button type="button" onClick={() => dispatch({ type: 'rotate_clockwise' })} className="h-10 w-10 rounded-full bg-stone-100 text-stone-600">↻</button>
          <button type="button" onClick={() => dispatch({ type: 'cancel' })} className="h-10 w-10 rounded-full bg-stone-100 text-stone-500">×</button>
        </div>
      )}

      {state.mode === 'idle' && selectedBuilding && (
        <div className="fixed bottom-24 right-6 z-[92] flex items-center gap-2 rounded-2xl border border-white/80 bg-white/92 p-2 shadow-2xl backdrop-blur-xl">
          <button type="button" onClick={() => dispatch({ type: 'start_move', buildingId: selectedBuilding.id, buildingKey: selectedBuilding.buildingKey as HexBuildingKey, rotation: selectedBuilding.rotation })} className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-black text-stone-700">Move</button>
          <button type="button" onClick={rotateSelected} disabled={busy} className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-black text-stone-700">Rotate</button>
          {getBuildingDefinition(selectedBuilding.buildingKey)?.removable && <button type="button" onClick={removeSelected} disabled={busy} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600">Remove</button>}
          <button type="button" onClick={() => dispatch({ type: 'select_existing', buildingId: null })} className="h-8 w-8 rounded-full text-stone-400">×</button>
        </div>
      )}
    </div>
  );
}
