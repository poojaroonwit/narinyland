import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('build controller owns world/person view state and passes it to world and overlay', async () => {
  const source = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(source, /useState<HexViewMode>\('world'\)/);
  assert.match(source, /viewMode=\{viewMode\}/);
  assert.match(source, /setViewMode\('world'\)/);
  assert.match(source, /setViewMode\('person'\)/);
});

test('person mode cannot select buildings and build or expansion entry returns to world mode', async () => {
  const source = await readFile(new URL('../components/hex-world/HexBuildController.tsx', import.meta.url), 'utf8');
  assert.match(source, /viewMode === 'world' && state\.mode === 'idle'/);
  assert.match(source, /const openBuild = \(\) => \{[^}]*setViewMode\('world'\)/s);
  assert.match(source, /const openExpand = \(\) => \{[^}]*setViewMode\('world'\)/s);
});

test('overlay closes primary sheets and clears selection before changing view', async () => {
  const source = await readFile(new URL('../components/hex-world/HexGameplayOverlay.tsx', import.meta.url), 'utf8');
  assert.match(source, /handleViewModeChange/);
  assert.match(source, /closePrimarySheets\(\)/);
  assert.match(source, /onClearSelection\(\)/);
  assert.match(source, /onViewModeChange\(next\)/);
});

test('toolbar exposes World and Explore and uses a compact person-mode action set', async () => {
  const source = await readFile(new URL('../components/hex-world/HexWorldToolbar.tsx', import.meta.url), 'utf8');
  assert.match(source, />World</);
  assert.match(source, />Explore</);
  assert.match(source, /viewMode === 'world'/);
  assert.match(source, /WASD \/ arrows/);
  assert.match(source, /movement requires a keyboard/);
});
