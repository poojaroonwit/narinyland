import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('phase 2 keeps the approved smart diorama and world-first builder flow', async () => {
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  const controller = await source('../components/hex-world/HexBuildController.tsx');
  const toolbar = await source('../components/hex-world/HexWorldToolbar.tsx');
  const catalog = await source('../lib/hex-world/building-catalog.ts');

  assert.match(world, /HexDioramaCamera/);
  assert.match(world, /ExpansionPlacementGhost/);
  assert.match(world, /ExpansionPlacementPlane/);
  assert.match(world, /onSelectExpansionAnchor/);
  assert.doesNotMatch(world, /HexExpansionClusters/);
  assert.match(controller, /HexBuildCatalog/);
  assert.match(controller, /HexBuildingContextToolbar/);
  assert.match(controller, /HexRemovalConfirm/);
  assert.match(toolbar, /🔨/);
  assert.match(toolbar, />Build</);
  assert.match(toolbar, /aria-label="Grow land"/i);
  assert.match(toolbar, /aria-label="Reset view"/i);
  assert.match(catalog, /home:[\s\S]*?removable:\s*false/);
  assert.doesNotMatch(controller, /window\.confirm|window\.prompt/);
});

test('phase 2 keeps authoritative one-step undo and non-undoable expansion', async () => {
  const controller = await source('../components/hex-world/HexBuildController.tsx');
  const client = await source('../services/hex-world-api.ts');
  const undoRoute = await source('../app/api/hex-world/undo/route.ts');

  assert.match(controller, /HexUndoToast/);
  assert.match(controller, /setUndo\(confirmed\.undo\)/);
  assert.match(controller, /handleExpansionConfirmed[\s\S]*setUndo\(null\)/);
  assert.match(client, /undo:\s*\(landId:\s*string,\s*undoToken:\s*string\)/);
  assert.match(client, /\/hex-world\/undo/);
  assert.match(undoRoute, /requireConfigAccess/);
  assert.match(undoRoute, /access\.userId/);
});

test('phase 2 remains mobile-safe without exposing legacy game modes or character controls', async () => {
  const controller = await source('../components/hex-world/HexBuildController.tsx');
  const toolbar = await source('../components/hex-world/HexWorldToolbar.tsx');
  const placement = await source('../components/hex-world/HexPlacementBar.tsx');
  const undoToast = await source('../components/hex-world/HexUndoToast.tsx');
  const combined = `${controller}\n${toolbar}\n${placement}\n${undoToast}`;

  assert.match(toolbar, /min-h-\[(?:44|48)px\]/);
  assert.match(toolbar, /safe-area-inset-bottom/);
  assert.match(undoToast, /min-h-11/);
  assert.match(undoToast, /safe-area-inset-bottom/);
  assert.doesNotMatch(combined, /\bWASD\b|Explore\/Orbit|LAND\/WORLD|game mode|worldMode\s*===/i);
});

test('phase 2 keeps visual-wow rendering bounded and avoids mandatory heavy postprocessing', async () => {
  const world = await source('../components/hex-world/HexWorld3D.tsx');
  const quality = await source('../lib/hex-world/quality.ts');
  const particles = await source('../components/hex-world/HexWorldParticles.tsx');

  assert.match(world, /HexIslandUnderside/);
  assert.match(world, /HexWorldParticles/);
  assert.match(world, /HexWaterSurface/);
  assert.match(quality, /maxDpr:\s*1\.75/);
  assert.match(particles, /<points\s/);
  assert.doesNotMatch(`${world}\n${quality}`, /EffectComposer|MeshReflectorMaterial|DepthOfField|Bloom/);
});
