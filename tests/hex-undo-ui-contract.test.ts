import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('browser client exposes authoritative undo endpoint and stable conflict errors', async () => {
  const client = await readFile(new URL('../services/hex-world-api.ts', import.meta.url), 'utf8');
  const types = await readFile(new URL('../lib/hex-world/types.ts', import.meta.url), 'utf8');
  assert.match(client, /undo:\s*\(landId:\s*string,\s*undoToken:\s*string\)/);
  assert.match(client, /\/hex-world\/undo/);
  assert.match(types, /'undo_unavailable'/);
  assert.match(types, /'undo_conflict'/);
});

test('builder surfaces short-lived undo and clears it for non-undoable expansion', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(controller, /HexUndoToast/);
  assert.match(controller, /setUndo\(confirmed\.undo\)/);
  assert.match(controller, /hexWorldAPI\.undo/);
  assert.match(controller, /undo_conflict/);
  assert.match(controller, /undo_unavailable/);
  assert.match(controller, /Land changed — undo unavailable/);
  assert.match(controller, /handleExpansionConfirmed[\s\S]*setUndo\(null\)/);
});

test('undo toast expires from server expiresAt and cannot fire while busy', async () => {
  const toast = await readFile(new URL('../components/hex-world/HexUndoToast.tsx', import.meta.url), 'utf8');
  assert.match(toast, /expiresAt/);
  assert.match(toast, /Date\.parse/);
  assert.match(toast, /setTimeout/);
  assert.match(toast, /disabled=\{busy\}/);
  assert.match(toast, />Undo</);
});

test('switching Land clears builder transient, Explore interaction, and undo state', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(controller, /\[clearExploreInteraction, landId\]/);
  assert.match(controller, /clearExploreInteraction\(\)/);
  assert.match(controller, /setUndo\(null\)/);
  assert.match(controller, /setCatalogOpen\(false\)/);
  assert.match(controller, /setRemoveOpen\(false\)/);
  assert.match(controller, /setNewlyAddedKeys\(new Set\(\)\)/);
});

test('stale mutation and undo responses cannot write a previous Land snapshot after a switch', async () => {
  const controller = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(controller, /activeLandRef/);
  assert.match(controller, /activeLandRef\.current\s*=\s*landId/);
  assert.match(controller, /activeLandRef\.current\s*!==\s*landId/);
  assert.match(controller, /return \(\) => \{[\s\S]*activeLandRef\.current\s*=\s*null/);
});
